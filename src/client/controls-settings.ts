import {
  ACTIONS,
  ACTION_LABELS,
  bindingError,
  cloneBindings,
  defaultControls,
  keyLabel,
  type Action,
  type ControlsPreferences,
} from "./controls";

/** One page-owned native capture session; never sends gameplay commands. */
export class KeyboardCapture {
  private action: Action | undefined;
  private held = new Set<string>();
  private consumed = new Set<string>();
  get active(): boolean {
    return this.action !== undefined;
  }
  constructor(
    private readonly accept: (
      action: Action,
      code: string,
    ) => string | undefined,
    private readonly status: (message: string) => void,
  ) {
    document.addEventListener(
      "keydown",
      (event) => {
        const wasDown = this.held.has(event.code);
        if (this.held.size < 128) this.held.add(event.code);
        if (this.consumed.has(event.code)) {
          this.consume(event);
          return;
        }
        if (
          !this.action ||
          event.ctrlKey ||
          event.altKey ||
          event.metaKey ||
          event.isComposing
        )
          return;
        if (event.code === "Tab") {
          this.cancel();
          return;
        }
        if (event.repeat || wasDown) return;
        this.consume(event);
        this.consumed.add(event.code);
        if (event.code === "Escape") {
          this.cancel();
          return;
        }
        const error = this.accept(this.action, event.code);
        if (error) this.status(error);
        else {
          this.action = undefined;
          this.status(`已设置 ${keyLabel(event.code)}。`);
        }
      },
      true,
    );
    document.addEventListener(
      "keyup",
      (event) => {
        this.held.delete(event.code);
        if (this.consumed.delete(event.code)) this.consume(event);
      },
      true,
    );
    const lost = () => {
      this.held.clear();
      this.consumed.clear();
      this.cancel();
    };
    window.addEventListener("blur", lost);
    window.addEventListener("pagehide", lost);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) lost();
    });
  }
  begin(action: Action): void {
    this.action = action;
    // Enter activates a native button on keydown. Its later keyup belongs to
    // opening capture, and must not activate a different native control.
    for (const code of this.held)
      if (code === "Enter" || code === "Space") this.consumed.add(code);
    this.status(`请按下${ACTION_LABELS[action]}的按键，Esc 取消。`);
  }
  cancel(): void {
    if (!this.action) return;
    this.action = undefined;
    this.status("已取消按键设置。");
  }
  private consume(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

export class ControlsSettings {
  private preferences: ControlsPreferences;
  private capture: KeyboardCapture;
  private rows: HTMLElement;
  private message: HTMLElement;
  constructor(
    private readonly panel: HTMLElement,
    initial: ControlsPreferences,
    private readonly onChange: (preferences: ControlsPreferences) => void,
  ) {
    this.preferences = {
      ...initial,
      bindings: cloneBindings(initial.bindings),
    };
    this.rows = this.element("keyboard-bindings");
    this.message = this.element("binding-status");
    this.capture = new KeyboardCapture(
      (action, code) => {
        const error = bindingError(this.preferences.bindings, action, code);
        if (error) return error;
        if (!this.preferences.bindings[action].includes(code)) {
          this.preferences.bindings[action].push(code);
          this.changed();
          this.rows
            .querySelector<HTMLButtonElement>(`[data-binding-add="${action}"]`)
            ?.focus();
        }
      },
      (message) => {
        this.message.textContent = message;
      },
    );
    panel.addEventListener("pointerdown", () => this.capture.cancel());
    panel.addEventListener("focusin", () => this.capture.cancel());
    this.element("controls-reset").addEventListener("click", () => {
      this.capture.cancel();
      this.preferences.bindings = defaultControls().bindings;
      this.changed();
      this.message.textContent = "已恢复默认按键。";
    });
    const enabled = this.element<HTMLInputElement>("gamepad-enabled");
    enabled.checked = initial.gamepadEnabled;
    enabled.addEventListener("change", () => {
      this.capture.cancel();
      this.preferences.gamepadEnabled = enabled.checked;
      this.changed(false);
    });
    this.render();
    const missing = (["overhead", "underhand"] as const).filter(
      (action) => !initial.bindings[action].length,
    );
    if (missing.length)
      this.message.textContent = `已保留现有按键；${missing.map((action) => ACTION_LABELS[action]).join("、")}未设置，可自行添加空闲按键。`;
  }
  setOpen(open: boolean): void {
    if (!open) this.capture.cancel();
  }
  private changed(render = true): void {
    this.onChange({
      ...this.preferences,
      bindings: cloneBindings(this.preferences.bindings),
    });
    if (render) this.render();
  }
  private render(): void {
    this.rows.replaceChildren();
    for (const action of ACTIONS) {
      const row = document.createElement("div");
      row.className = "binding-row";
      row.dataset.bindingAction = action;
      const label = document.createElement("span");
      label.className = "binding-label";
      label.textContent = ACTION_LABELS[action];
      const keys = document.createElement("div");
      keys.className = "binding-keys";
      if (!this.preferences.bindings[action].length) {
        const empty = document.createElement("span");
        empty.textContent = "未设置";
        keys.append(empty);
      }
      for (const code of this.preferences.bindings[action]) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.bindingRemove = code;
        remove.textContent = `${keyLabel(code)} ×`;
        remove.setAttribute(
          "aria-label",
          `移除${ACTION_LABELS[action]}按键 ${keyLabel(code)}`,
        );
        remove.addEventListener("click", () => {
          this.capture.cancel();
          this.preferences.bindings[action] = this.preferences.bindings[
            action
          ].filter((key) => key !== code);
          this.changed();
          this.message.textContent = `已移除 ${keyLabel(code)}。`;
          this.rows
            .querySelector<HTMLButtonElement>(`[data-binding-add="${action}"]`)
            ?.focus();
        });
        keys.append(remove);
      }
      const add = document.createElement("button");
      add.type = "button";
      add.dataset.bindingAdd = action;
      add.textContent = "添加";
      add.disabled = this.preferences.bindings[action].length >= 3;
      add.setAttribute("aria-label", `添加${ACTION_LABELS[action]}按键`);
      add.addEventListener("click", () => this.capture.begin(action));
      row.append(label, keys, add);
      this.rows.append(row);
    }
  }
  private element<T extends HTMLElement>(id: string): T {
    const value = this.panel.querySelector<T>(`#${id}`);
    if (!value) throw new Error(`Missing controls element: ${id}`);
    return value;
  }
}
