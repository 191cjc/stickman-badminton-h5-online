/** Reachable original multiplayer roster (§_-2s§.§var §); fields are move/jump/power. */
export const CHARACTERS = {
  joe: {
    name: "Average Joe",
    label: "普通乔",
    symbol: 230,
    family: "adult",
    move: 1,
    jump: 1,
    power: 1,
  },
  nadia: {
    name: "Naughty Nadia",
    label: "淘气娜迪娅",
    symbol: 226,
    family: "adult",
    move: 1.15,
    jump: 1.1,
    power: 0.96,
  },
  harry: {
    name: "Hairy Harry",
    label: "毛茸茸哈里",
    symbol: 233,
    family: "adult",
    move: 1.1,
    jump: 0.9,
    power: 1.05,
  },
  toaster: {
    name: "Flying Toaster",
    label: "飞行烤面包机",
    symbol: 178,
    family: "toaster",
    move: 1,
    jump: 1.15,
    power: 0.96,
  },
  pirate: {
    name: "Pirate Pete",
    label: "海盗皮特",
    symbol: 221,
    family: "adult",
    move: 0.89,
    jump: 0.9,
    power: 1.1,
  },
  "top-hat": {
    name: "Top Hat Sam",
    label: "高帽山姆",
    symbol: 169,
    family: "adult",
    move: 0.89,
    jump: 1.25,
    power: 1,
  },
  red: {
    name: "The Red Dude",
    label: "红色小子",
    symbol: 236,
    family: "adult",
    move: 1.2,
    jump: 1,
    power: 1,
  },
} as const;
export type CharacterId = keyof typeof CHARACTERS;
export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];
export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && Object.hasOwn(CHARACTERS, value);
}
