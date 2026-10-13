import { describe, expect, it } from "vitest";
import { parseClientMessage } from "../src/shared/protocol";

const commands = ["cancel", "leave", "release"];

describe("logical command validation", () => {
  it.each(commands)(
    "accepts the string command %s with exactly its intended keys",
    (type) => {
      expect(parseClientMessage(JSON.stringify({ type }))).toEqual({ type });
      expect(
        parseClientMessage(JSON.stringify({ type, side: "left" })),
      ).toBeNull();
    },
  );

  it.each(commands)("rejects array and nested-array forms of %s", (type) => {
    expect(parseClientMessage(JSON.stringify({ type: [type] }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: [[type]] }))).toBeNull();
  });

  it.each(
    [null, 1, true, {}, [], ["queue", "cancel"], "unknown"].map((type) => ({
      type,
    })),
  )("rejects non-command discriminators: %j", ({ type }) => {
    expect(parseClientMessage(JSON.stringify({ type }))).toBeNull();
  });

  it("rejects missing discriminators and non-object payloads", () => {
    for (const raw of ["{}", "null", "[]", '"queue"', "invalid JSON"])
      expect(parseClientMessage(raw)).toBeNull();
  });
});

it("accepts only the seven immutable role choices in queue and no injected authority fields", () => {
  for (const character of [
    "joe",
    "nadia",
    "harry",
    "toaster",
    "pirate",
    "top-hat",
    "red",
  ]) {
    expect(
      parseClientMessage(JSON.stringify({ type: "queue", character })),
    ).toEqual({ type: "queue", character });
    for (const extra of [
      { side: "left" },
      { room: "stolen" },
      { score: 7 },
      { position: 0 },
    ])
      expect(
        parseClientMessage(
          JSON.stringify({ type: "queue", character, ...extra }),
        ),
      ).toBeNull();
  }
  for (const character of [
    "robot",
    "timmy",
    "champ",
    "constructor",
    "__proto__",
    null,
    1,
    [],
    ["joe"],
    {},
  ])
    expect(
      parseClientMessage(JSON.stringify({ type: "queue", character })),
    ).toBeNull();
  expect(parseClientMessage('{"type":"queue"}')).toBeNull();
});
