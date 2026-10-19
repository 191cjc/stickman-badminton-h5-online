import type { InputFrame } from "../shared/protocol";
import type { PlayerIntent } from "../shared/types";

export const bindings: Record<string, string> = {
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  KeyW: "jump",
  ArrowUp: "jump",
  Space: "hit",
  KeyS: "hit",
  ArrowDown: "hit",
};
export class Input {
  private down = new Set<string>();
  private jumpPressed = false;
  private hitPressed = false;
  constructor(
    private readonly onRelease: () => void,
    onMute: () => void = () => {},
    onLeave: () => void = () => {},
    private readonly onChange: () => void = () => {},
    private readonly enabled: () => boolean = () => true,
  ) {
    window.addEventListener("keydown", (event) => {
      if (
        event.target instanceof HTMLElement &&
        ["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)
      )
        return;
      // After a release (settings/blur), an OS repeat is not a fresh press.
      if (!this.enabled()) return;
      if (event.repeat) {
        if (bindings[event.code]) event.preventDefault();
        return;
      }
      if (!event.repeat && ["KeyM", "Escape"].includes(event.code)) {
        event.preventDefault();
        if (event.code === "KeyM") onMute();
        else onLeave();
        return;
      }
      if (!bindings[event.code]) return;
      event.preventDefault();
      this.press(event.code);
    });
    window.addEventListener("keyup", (event) => {
      if (bindings[event.code]) {
        if (
          !(event.target instanceof HTMLElement) ||
          !["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(
            event.target.tagName,
          )
        )
          event.preventDefault();
        this.lift(event.code);
      }
    });
    window.addEventListener("blur", () => this.release());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.release();
    });
    window.addEventListener("pagehide", () => this.release());
    document
      .querySelectorAll<HTMLButtonElement>("[data-control]")
      .forEach((button) => {
        const key = button.dataset.control!;
        button.addEventListener("pointerdown", (event) => {
          if (!this.enabled()) return;
          event.preventDefault();
          button.setPointerCapture(event.pointerId);
          this.press(key);
        });
        for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
          button.addEventListener(type, () => this.lift(key));
      });
  }
  private press(key: string): void {
    const before = this.logicalKey();
    const action = bindings[key];
    if (!this.has(action)) {
      if (action === "jump") this.jumpPressed = true;
      if (action === "hit") this.hitPressed = true;
    }
    this.down.add(key);
    if (before !== this.logicalKey()) this.onChange();
  }
  private lift(key: string): void {
    const before = this.logicalKey();
    this.down.delete(key);
    if (before !== this.logicalKey()) this.onChange();
  }
  private logicalKey(): string {
    const { move, jump, jumpPressed, hitHeld, hitPressed } = this.peek(1);
    return `${move}:${jump}:${jumpPressed}:${hitHeld}:${hitPressed}`;
  }
  private has(action: string): boolean {
    return [...this.down].some((key) => bindings[key] === action);
  }
  release(notify = true): void {
    this.down.clear();
    this.jumpPressed = false;
    this.hitPressed = false;
    if (notify) this.onRelease();
  }
  read(seq: number): InputFrame {
    const input = this.peek(seq);
    this.commit(input);
    return input;
  }
  /** Peek/commit is synchronous around Network.send. A rejected send must not
   * consume either pending edge or advance the caller's sequence/history. */
  peek(seq: number): InputFrame {
    const input: InputFrame = {
      type: "input",
      seq,
      move: ((this.has("right") ? 1 : 0) - (this.has("left") ? 1 : 0)) as
        -1 | 0 | 1,
      jump: this.has("jump"),
      jumpPressed: this.jumpPressed,
      hitHeld: this.has("hit"),
      hitPressed: this.hitPressed,
    };
    return input;
  }
  commit(input: InputFrame): void {
    if (input.jumpPressed) this.jumpPressed = false;
    if (input.hitPressed) this.hitPressed = false;
  }
}
export const toIntent = (input: InputFrame): PlayerIntent => ({
  ...input,
  pausePressed: false,
});
