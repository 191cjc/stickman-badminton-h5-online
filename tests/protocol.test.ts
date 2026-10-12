import { describe, expect, it } from "vitest";
import { parseClientMessage } from "../src/shared/protocol";

const commands = ["queue", "cancel", "leave", "release"];

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
