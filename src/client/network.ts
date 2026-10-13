import {
  BASE_PATH,
  PROTOCOL,
  RECONNECT_MS,
  SUBPROTOCOL,
} from "../shared/protocol";
import type { ClientMessage, ServerMessage } from "../shared/protocol";

export class Network {
  private socket?: WebSocket;
  private retry?: ReturnType<typeof setTimeout>;
  private ping?: ReturnType<typeof setInterval>;
  private reconnectStarted = 0;
  private stopped = false;
  private connecting = false;
  private incompatible = false;
  constructor(
    private readonly onMessage: (message: ServerMessage) => void,
    private readonly onStatus: (connected: boolean, text: string) => void,
    private readonly onRtt: (rtt: number) => void,
  ) {}
  get refreshRequired(): boolean {
    return this.incompatible;
  }
  get connected(): boolean {
    return !this.incompatible && this.socket?.readyState === WebSocket.OPEN;
  }
  send(message: ClientMessage): boolean {
    if (!this.connected || this.socket!.bufferedAmount > 64 * 1024)
      return false;
    this.socket!.send(JSON.stringify(message));
    return true;
  }
  private requireRefresh(): void {
    this.incompatible = true;
    this.stopped = true;
    clearTimeout(this.retry);
    clearInterval(this.ping);
    this.onStatus(false, "版本已更新，请刷新页面");
    this.socket?.close(1000, "protocol_mismatch");
  }
  async connect(manual = false): Promise<void> {
    if (this.incompatible || this.connecting) return;
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;
    if (manual) {
      this.reconnectStarted = 0;
      this.stopped = false;
      clearTimeout(this.retry);
    }
    if (this.stopped) return;
    this.connecting = true;
    try {
      const response = await fetch(`${BASE_PATH}api/session`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`session_${response.status}`);
      const session = (await response.json()) as {
        protocol: number;
        connected: boolean;
      };
      if (session.protocol !== PROTOCOL) {
        this.requireRefresh();
        return;
      }
      if (!this.reconnectStarted && session.connected) {
        this.stopped = true;
        this.onStatus(false, "此游客已在另一标签页连接，请先关闭该页面");
        return;
      }
      const url = new URL(`${BASE_PATH}ws`, location.href);
      url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(url, SUBPROTOCOL);
      this.socket = ws;
      ws.addEventListener("open", () => {
        this.reconnectStarted = 0;
        this.onStatus(true, "已连接");
        this.ping = setInterval(
          () => this.send({ type: "ping", time: performance.now() }),
          2000,
        );
      });
      ws.addEventListener("message", (event) => {
        const message = JSON.parse(event.data as string) as ServerMessage;
        if (
          (message.type === "hello" && message.protocol !== PROTOCOL) ||
          (message.type === "error" && message.code === "protocol_mismatch")
        ) {
          this.requireRefresh();
          return;
        }
        if (this.incompatible) return;
        if (message.type === "pong")
          this.onRtt(Math.round(performance.now() - message.time));
        this.onMessage(message);
      });
      ws.addEventListener("close", (event) => {
        clearInterval(this.ping);
        this.socket = undefined;
        if (this.incompatible) return;
        if (event.reason === "protocol_mismatch") {
          this.requireRefresh();
          return;
        }
        if (event.code === 1008) {
          this.stopped = true;
          this.onStatus(false, "连接被拒绝，请刷新后重试");
          return;
        }
        this.schedule();
      });
    } catch {
      this.schedule();
    } finally {
      this.connecting = false;
    }
  }
  private schedule(): void {
    if (this.stopped || this.incompatible) return;
    this.reconnectStarted ||= Date.now();
    if (Date.now() - this.reconnectStarted >= RECONNECT_MS) {
      this.stopped = true;
      this.onStatus(false, "连接中断，点击重新连接后再次匹配");
      return;
    }
    this.onStatus(false, "连接中断，正在重连（席位最多保留 15 秒）");
    this.retry = setTimeout(() => void this.connect(), 700);
  }
}
