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
  ) {
    window.addEventListener("keydown", (event) => {
      if (
        event.target instanceof HTMLElement &&
        ["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)
      )
        return;
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
        this.down.delete(event.code);
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
          event.preventDefault();
          button.setPointerCapture(event.pointerId);
          this.press(key);
        });
        for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
          button.addEventListener(type, () => this.down.delete(key));
      });
  }
  private press(key: string): void {
    const action = bindings[key];
    if (!this.has(action)) {
      if (action === "jump") this.jumpPressed = true;
      if (action === "hit") this.hitPressed = true;
    }
    this.down.add(key);
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
    this.jumpPressed = false;
    this.hitPressed = false;
    return input;
  }
}
export const toIntent = (input: InputFrame): PlayerIntent => ({
  ...input,
  pausePressed: false,
});
