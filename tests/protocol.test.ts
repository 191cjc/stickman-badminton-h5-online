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
      parseClientMessage(
        JSON.stringify({ type: "queue", shuttleSpeed: 1, character }),
      ),
    ).toEqual({ type: "queue", shuttleSpeed: 1, character });
    for (const extra of [
      { side: "left" },
      { room: "stolen" },
      { score: 7 },
      { position: 0 },
    ])
      expect(
        parseClientMessage(
          JSON.stringify({
            type: "queue",
            shuttleSpeed: 1,
            character,
            ...extra,
          }),
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
      parseClientMessage(
        JSON.stringify({ type: "queue", shuttleSpeed: 1, character }),
      ),
    ).toBeNull();
  expect(parseClientMessage('{"type":"queue"}')).toBeNull();
});

it("keeps input logical-only and rejects invented clock/contact authority and invalid ranges", () => {
  const input = {
    type: "input",
    swing: "auto",
    seq: 1,
    move: 0,
    jump: false,
    jumpPressed: false,
    hitHeld: false,
    hitPressed: false,
  };
  expect(parseClientMessage(JSON.stringify(input))).toEqual(input);
  for (const extra of [
    { ackTick: 1 },
    { tick: 1 },
    { time: 1 },
    { contact: true },
    { hitJump: true },
    { x: 500 },
    { side: "left" },
    { score: 7 },
  ])
    expect(
      parseClientMessage(JSON.stringify({ ...input, ...extra })),
    ).toBeNull();
  for (const patch of [
    { seq: 0 },
    { seq: 1.5 },
    { seq: 2_000_000_001 },
    { move: 2 },
    { jump: 1 },
    { hitPressed: "true" },
  ])
    expect(
      parseClientMessage(JSON.stringify({ ...input, ...patch })),
    ).toBeNull();
});

it("requires one of four numeric speeds and accepts every character at each speed", () => {
  for (const character of [
    "joe",
    "nadia",
    "harry",
    "toaster",
    "pirate",
    "top-hat",
    "red",
  ])
    for (const shuttleSpeed of [1, 1.25, 1.5, 2]) {
      const queue = { type: "queue", character, shuttleSpeed };
      expect(parseClientMessage(JSON.stringify(queue))).toEqual(queue);
    }
  for (const shuttleSpeed of [
    undefined,
    null,
    "1",
    true,
    [],
    {},
    0,
    1.1,
    3,
    Number.NaN,
    Infinity,
  ])
    expect(
      parseClientMessage(
        JSON.stringify({ type: "queue", character: "joe", shuttleSpeed }),
      ),
    ).toBeNull();
});
it("requires edge-owned swing enum including released short taps and rejects stale forced choices", () => {
  const input = {
    type: "input",
    seq: 1,
    move: 0,
    jump: false,
    jumpPressed: false,
    hitHeld: false,
    hitPressed: true,
    swing: "auto",
  };
  for (const swing of ["auto", "overhead", "underhand"]) {
    expect(parseClientMessage(JSON.stringify({ ...input, swing }))).toEqual({
      ...input,
      swing,
    });
    expect(
      parseClientMessage(
        JSON.stringify({ ...input, hitPressed: false, swing }),
      ),
    ).toEqual(swing === "auto" ? { ...input, hitPressed: false, swing } : null);
  }
  for (const swing of [undefined, null, [], {}, 1, "serve", "OVERHEAD"])
    expect(parseClientMessage(JSON.stringify({ ...input, swing }))).toBeNull();
});
