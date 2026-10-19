import type { Action } from "./controls";

interface PadButton {
  pressed: boolean;
  value: number;
}
export interface PadSample {
  index: number;
  id: string;
  connected: boolean;
  mapping: string;
  axes: readonly number[];
  buttons: readonly PadButton[];
}
type PadReader = () => readonly (PadSample | null)[] | undefined;
interface PadInput {
  setGamepad(actions: readonly Action[]): void;
  clearGamepad(): void;
}
const browserPads: PadReader = () => {
  // Getter, call and receiver are all part of the guarded adapter boundary.
  const get = navigator.getGamepads;
  return typeof get === "function" ? get.call(navigator) : undefined;
};
const ENTER = 0.35,
  RELEASE = 0.2;
export class GamepadController {
  private selected: { index: number; id: string } | undefined;
  private armed = false;
  private direction = 0;
  private status = "";
  constructor(
    private readonly input: PadInput,
    private readonly onStatus: (status: string) => void,
    private readonly read: PadReader = browserPads,
    private enabled = true,
  ) {
    window.addEventListener("gamepadconnected", (event) => {
      if (event.gamepad?.index === this.selected?.index) this.forget();
      this.refresh();
    });
    window.addEventListener("gamepaddisconnected", (event) => {
      const index = event.gamepad?.index;
      if (index === this.selected?.index) this.forget();
      this.refresh(index);
    });
  }
  setEnabled(enabled: boolean): void {
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      this.forget();
    }
    this.refresh();
  }
  /** Full gameplay/focus boundary: inactive discovery must never arm a device. */
  reset(): void {
    this.armed = false;
    this.direction = 0;
    this.input.clearGamepad();
    if (this.selected && this.enabled) this.showConnected();
  }
  private forget(): void {
    this.reset();
    this.selected = undefined;
  }
  refresh(excludeIndex?: number): void {
    this.sample(false, excludeIndex);
  }
  /** Called only by the existing InputScheduler, immediately before peek. */
  poll(): void {
    this.sample(true);
  }
  private sample(gameplay: boolean, excludeIndex?: number): void {
    if (!this.enabled) {
      this.forget();
      this.show("手柄已关闭");
      return;
    }
    try {
      const snapshots = this.read();
      if (snapshots === undefined) {
        this.forget();
        this.show("当前浏览器不支持手柄，可使用键盘或触屏。");
        return;
      }
      // Finite slot inspection prevents malformed fixtures from growing state.
      const exposed = snapshots
        .slice(0, 32)
        .filter(
          (pad): pad is PadSample =>
            pad !== null &&
            typeof pad === "object" &&
            pad.connected === true &&
            Number.isInteger(pad.index) &&
            pad.index >= 0 &&
            pad.index < 32 &&
            pad.index !== excludeIndex &&
            typeof pad.id === "string",
        );
      const eligible = exposed.filter((pad) => pad.mapping === "standard");
      let pad = eligible.find(
        (pad) =>
          pad.index === this.selected?.index && pad.id === this.selected.id,
      );
      if (!pad) {
        this.forget();
        pad = eligible.sort((a, b) => a.index - b.index)[0];
        if (pad) this.selected = { index: pad.index, id: pad.id };
      }
      if (!pad) {
        this.show(
          exposed.length
            ? "该手柄布局尚不支持，请使用标准手柄或键盘。"
            : "未检测到手柄，请连接后在本页按一下手柄按钮。",
        );
        return;
      }
      if (!gameplay) {
        this.showConnected();
        return;
      }
      const axis = pad.axes?.[0];
      const mapped = [0, 2, 14, 15].map((index) => pad!.buttons?.[index]);
      if (
        !Number.isFinite(axis) ||
        axis < -1 ||
        axis > 1 ||
        mapped.some(
          (button) =>
            !button ||
            typeof button.pressed !== "boolean" ||
            !Number.isFinite(button.value) ||
            button.value < 0 ||
            button.value > 1,
        )
      ) {
        this.reset();
        this.show("手柄数据不完整，请松开摇杆和按键后重试。");
        return;
      }
      const [jump, hit, left, right] = mapped.map(
        (button) => button.pressed || button.value >= 0.5,
      );
      if (!this.armed) {
        if (Math.abs(axis) <= RELEASE && !jump && !hit && !left && !right)
          this.armed = true;
        this.showConnected();
        return; // A neutral observation never manufactures a gameplay edge.
      }
      if (axis <= -ENTER) this.direction = -1;
      else if (axis >= ENTER) this.direction = 1;
      else if (
        (this.direction < 0 && axis >= -RELEASE) ||
        (this.direction > 0 && axis <= RELEASE)
      )
        this.direction = 0;
      const actions: Action[] = [];
      if (left || this.direction < 0) actions.push("left");
      if (right || this.direction > 0) actions.push("right");
      if (jump) actions.push("jump");
      if (hit) actions.push("hit");
      this.input.setGamepad(actions);
      this.showConnected();
    } catch {
      this.forget();
      this.show("暂时无法读取手柄，请检查浏览器设置后点击检测手柄重试。");
    }
  }
  private showConnected(): void {
    if (this.selected)
      this.show(
        `手柄 ${this.selected.index + 1}：${this.selected.id.slice(0, 100)} · ${this.armed ? "手柄可用" : "已连接，请先松开摇杆和按键"}`,
      );
  }
  private show(status: string): void {
    if (status === this.status) return;
    this.status = status;
    this.onStatus(status);
  }
}
