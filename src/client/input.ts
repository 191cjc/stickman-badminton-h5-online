import type { InputFrame } from "../shared/protocol";
import type { PlayerIntent } from "../shared/types";
import {
  ACTIONS,
  bindingOwner,
  cloneBindings,
  defaultControls,
  isAction,
  type Action,
  type KeyBindings,
} from "./controls";

/** Default aliases retained for consumers that display the initial controls. */
export const bindings: Record<string, string> = Object.fromEntries(
  ACTIONS.flatMap((action) =>
    defaultControls().bindings[action].map((code) => [code, action]),
  ),
);
export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    ["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A", "SUMMARY"].includes(
      target.tagName,
    ) ||
    target.isContentEditable ||
    Boolean(
      target.closest?.(
        'button, input, select, textarea, a, summary, [contenteditable]:not([contenteditable="false"])',
      ),
    )
  );
}
type SourceKind = "keyboard" | "pointer" | "gamepad";
export class Input {
  private sources = new Map<string, ReadonlySet<Action>>();
  // At most three provenance groups per edge, including released quick taps.
  private pending = { jump: new Set<SourceKind>(), hit: new Set<SourceKind>() };
  private keys = defaultControls().bindings;
  constructor(
    private readonly onRelease: () => void,
    onMute: () => void = () => {},
    onLeave: () => void = () => {},
    private readonly onChange: () => void = () => {},
    private readonly enabled: () => boolean = () => true,
  ) {
    window.addEventListener("keydown", (event) => {
      if (
        event.defaultPrevented ||
        isInteractiveTarget(event.target) ||
        !this.enabled() ||
        event.isComposing ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      )
        return;
      const action = bindingOwner(this.keys, event.code);
      if (event.repeat) {
        if (action) event.preventDefault();
        return;
      }
      if (["KeyM", "Escape"].includes(event.code)) {
        event.preventDefault();
        if (event.code === "KeyM") onMute();
        else onLeave();
        return;
      }
      if (!action) return;
      event.preventDefault();
      this.setSource(`keyboard:${event.code}`, [action], "keyboard");
    });
    window.addEventListener("keyup", (event) => {
      if (
        bindingOwner(this.keys, event.code) &&
        !isInteractiveTarget(event.target) &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.isComposing
      )
        event.preventDefault();
      this.setSource(`keyboard:${event.code}`, [], "keyboard");
    });
    window.addEventListener("blur", () => this.release());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.release();
    });
    window.addEventListener("pagehide", () => this.release());
    document
      .querySelectorAll<HTMLButtonElement>("[data-control]")
      .forEach((button) => {
        const action = button.dataset.control!;
        if (!isAction(action)) return;
        button.addEventListener("pointerdown", (event) => {
          if (!this.enabled() || !Number.isInteger(event.pointerId)) return;
          // Keep touch meanings independent of remappable keyboard codes.
          if (
            !this.sources.has(`pointer:${event.pointerId}`) &&
            this.sources.size >= 160
          )
            return;
          event.preventDefault();
          button.setPointerCapture(event.pointerId);
          this.setSource(`pointer:${event.pointerId}`, [action], "pointer");
        });
        for (const type of [
          "pointerup",
          "pointercancel",
          "lostpointercapture",
        ] as const)
          button.addEventListener(type, (event) =>
            this.setSource(`pointer:${event.pointerId}`, [], "pointer"),
          );
      });
  }
  setBindings(value: KeyBindings): void {
    this.release(false);
    this.keys = cloneBindings(value);
  }
  setGamepad(actions: readonly Action[]): void {
    this.setSource("gamepad", actions, "gamepad");
  }
  clearGamepad(): void {
    const before = this.logicalKey();
    this.sources.delete("gamepad");
    this.pending.jump.delete("gamepad");
    this.pending.hit.delete("gamepad");
    if (before !== this.logicalKey()) this.onChange();
  }
  private setSource(
    source: string,
    actions: readonly Action[],
    kind: SourceKind,
  ): void {
    const before = this.logicalKey();
    const jump = this.has("jump"),
      hit = this.has("hit");
    if (actions.length) this.sources.set(source, new Set(actions));
    else this.sources.delete(source);
    if (!jump && this.has("jump")) this.pending.jump.add(kind);
    if (!hit && this.has("hit")) this.pending.hit.add(kind);
    if (before !== this.logicalKey()) this.onChange();
  }
  private logicalKey(): string {
    const { move, jump, jumpPressed, hitHeld, hitPressed } = this.peek(1);
    return `${move}:${jump}:${jumpPressed}:${hitHeld}:${hitPressed}`;
  }
  private has(action: Action): boolean {
    for (const actions of this.sources.values())
      if (actions.has(action)) return true;
    return false;
  }
  release(notify = true): void {
    this.sources.clear();
    this.pending.jump.clear();
    this.pending.hit.clear();
    if (notify) this.onRelease();
  }
  read(seq: number): InputFrame {
    const input = this.peek(seq);
    this.commit(input);
    return input;
  }
  /** Only commit after synchronous Network.send succeeds. */
  peek(seq: number): InputFrame {
    return {
      type: "input",
      seq,
      move: ((this.has("right") ? 1 : 0) - (this.has("left") ? 1 : 0)) as
        -1 | 0 | 1,
      jump: this.has("jump"),
      jumpPressed: this.pending.jump.size > 0,
      hitHeld: this.has("hit"),
      hitPressed: this.pending.hit.size > 0,
    };
  }
  commit(input: InputFrame): void {
    if (input.jumpPressed) this.pending.jump.clear();
    if (input.hitPressed) this.pending.hit.clear();
  }
}
export const toIntent = (input: InputFrame): PlayerIntent => ({
  ...input,
  pausePressed: false,
});
