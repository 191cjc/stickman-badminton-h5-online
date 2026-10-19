/** Browser-local preferences; no device identity or controls are sent to server. */
export const ACTIONS = ["left", "right", "jump", "hit"] as const;
export type Action = (typeof ACTIONS)[number];
export type KeyBindings = Record<Action, string[]>;
export interface ControlsPreferences {
  version: 1;
  bindings: KeyBindings;
  gamepadEnabled: boolean;
}
export const ACTION_LABELS: Record<Action, string> = {
  left: "向左",
  right: "向右",
  jump: "跳跃",
  hit: "挥拍／发球",
};
export const CONTROLS_STORAGE_KEY = "fiso-online:controls:v1";
const defaults: KeyBindings = {
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  jump: ["KeyW", "ArrowUp"],
  hit: ["Space", "KeyS", "ArrowDown"],
};
const supported = new Set([
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .split("")
    .filter((key) => key !== "M")
    .map((key) => `Key${key}`),
  ..."0123456789".split("").flatMap((key) => [`Digit${key}`, `Numpad${key}`]),
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "Enter",
  "Backquote",
  "Minus",
  "Equal",
  "BracketLeft",
  "BracketRight",
  "Backslash",
  "Semicolon",
  "Quote",
  "Comma",
  "Period",
  "Slash",
  "IntlBackslash",
  "IntlRo",
  "IntlYen",
  "NumpadAdd",
  "NumpadSubtract",
  "NumpadMultiply",
  "NumpadDivide",
  "NumpadDecimal",
  "NumpadEnter",
  "NumpadEqual",
  "NumpadComma",
]);
export const isAction = (value: string): value is Action =>
  (ACTIONS as readonly string[]).includes(value);
export const isSupportedCode = (value: unknown): value is string =>
  typeof value === "string" && supported.has(value);
export function defaultControls(): ControlsPreferences {
  return {
    version: 1,
    bindings: cloneBindings(defaults),
    gamepadEnabled: true,
  };
}
export function cloneBindings(value: KeyBindings): KeyBindings {
  return {
    left: [...value.left],
    right: [...value.right],
    jump: [...value.jump],
    hit: [...value.hit],
  };
}
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
export function parseControls(
  raw: string | null,
): ControlsPreferences | undefined {
  if (raw === null || raw.length > 4096) return;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !object(value) ||
      !exactKeys(value, ["version", "bindings", "gamepadEnabled"]) ||
      value.version !== 1 ||
      typeof value.gamepadEnabled !== "boolean" ||
      !object(value.bindings) ||
      !exactKeys(value.bindings, ACTIONS)
    )
      return;
    const keys = new Set<string>();
    for (const action of ACTIONS) {
      const codes = value.bindings[action];
      if (!Array.isArray(codes) || codes.length > 3) return;
      for (const code of codes) {
        if (!isSupportedCode(code) || keys.has(code)) return;
        keys.add(code);
      }
    }
    // Each array was validated above; detach it from the parsed boundary object.
    return {
      version: 1,
      bindings: cloneBindings(value.bindings as KeyBindings),
      gamepadEnabled: value.gamepadEnabled,
    };
  } catch {
    return;
  }
}
type StorageFactory = () => Pick<Storage, "getItem" | "setItem">;
const browserStorage: StorageFactory = () => window.localStorage;
export function readControls(
  storage: StorageFactory = browserStorage,
): ControlsPreferences {
  try {
    return (
      parseControls(storage().getItem(CONTROLS_STORAGE_KEY)) ??
      defaultControls()
    );
  } catch {
    return defaultControls();
  }
}
export function saveControls(
  value: ControlsPreferences,
  storage: StorageFactory = browserStorage,
): void {
  try {
    storage().setItem(CONTROLS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* Live preferences still apply. */
  }
}
export function bindingOwner(
  bindings: KeyBindings,
  code: string,
): Action | undefined {
  return ACTIONS.find((action) => bindings[action].includes(code));
}
export function bindingError(
  bindings: KeyBindings,
  action: Action,
  code: string,
): string | undefined {
  if (!isSupportedCode(code))
    return code === "KeyM"
      ? "M 已保留用于静音。"
      : "此按键不能用于比赛，请选择字母、数字、方向键、空格等游戏键。";
  const owner = bindingOwner(bindings, code);
  if (owner && owner !== action)
    return `${keyLabel(code)} 已用于${ACTION_LABELS[owner]}，请先移除原绑定。`;
  if (!owner && bindings[action].length >= 3)
    return "每个动作最多设置三个按键，请先移除一个。";
}
const labels: Record<string, string> = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Space: "空格",
  Enter: "回车",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  IntlBackslash: "国际 \\",
  IntlRo: "国际 Ro",
  IntlYen: "国际 ¥",
  NumpadAdd: "小键盘 +",
  NumpadSubtract: "小键盘 -",
  NumpadMultiply: "小键盘 *",
  NumpadDivide: "小键盘 /",
  NumpadDecimal: "小键盘 .",
  NumpadEnter: "小键盘回车",
  NumpadEqual: "小键盘 =",
  NumpadComma: "小键盘 ,",
};
export function keyLabel(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return `小键盘 ${code.slice(6)}`;
  return labels[code] ?? code;
}
export const actionKeys = (bindings: KeyBindings, action: Action): string =>
  bindings[action].map(keyLabel).join(" / ") || "未设置";
export const keyboardHelp = (bindings: KeyBindings): string =>
  ACTIONS.map(
    (action) => `${ACTION_LABELS[action]} ${actionKeys(bindings, action)}`,
  ).join(" · ");
