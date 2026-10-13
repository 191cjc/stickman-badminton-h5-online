import { afterEach, expect, it, vi } from "vitest";
import { Audio } from "../src/client/audio";
import type { AssetManifest } from "../src/shared/classic/manifest";
import { readFileSync } from "node:fs";
const manifest = JSON.parse(
  readFileSync("public/classic/manifest.json", "utf8"),
) as AssetManifest;
const nodes: FakeSource[] = [];
class FakeSource {
  buffer: unknown;
  loop = false;
  onended?: () => void;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  constructor() {
    nodes.push(this);
  }
}
class FakeContext {
  state = "suspended";
  destination = {};
  gain = { gain: { value: 1 }, connect: vi.fn() };
  gains = [this.gain];
  createGain = () => {
    if (this.gains.length === 1 && this.gain.connect.mock.calls.length === 0)
      return this.gain;
    const gain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
    this.gains.push(gain);
    return gain;
  };
  createBufferSource = () => new FakeSource();
  decodeAudioData = async (bytes: ArrayBuffer): Promise<unknown> => ({
    length: bytes.byteLength,
  });
  resume = async () => {
    this.state = "running";
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  nodes.length = 0;
});
it("fades music with the original per-callback increment, independently of mute and display refresh, then resets on scene exit", async () => {
  const gains: number[] = [];
  for (const refresh of [30, 60, 144]) {
    const context = new FakeContext();
    vi.stubGlobal("AudioContext", function () {
      return context;
    });
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16),
    }));
    const owner = new Audio();
    await owner.load(manifest);
    await owner.unlock();
    owner.setMatch(true);
    const music = context.gains[1];
    expect(music.gain.value).toBe(0);
    for (let frame = 0; frame < refresh / 2; frame++)
      owner.advance(1 / refresh);
    gains.push(music.gain.value);
    expect(music.gain.value).toBeCloseTo(30 / (2 * 30), 12);
    owner.toggle();
    for (let frame = 0; frame < refresh / 2; frame++)
      owner.advance(1 / refresh);
    expect(context.gain.gain.value).toBe(0);
    expect(music.gain.value).toBe(1);
    owner.toggle();
    expect(context.gain.gain.value).toBe(1);
    owner.setMatch(true);
    expect(context.gains).toHaveLength(2); // repeated snapshots do not restart fade
    owner.stop();
    owner.advance(1);
    owner.setMatch(true);
    expect(context.gains.at(-1)!.gain.value).toBe(0);
    owner.stop();
  }
  expect(gains.every((gain) => Math.abs(gain - gains[0]) < 1e-12)).toBe(true);
});
it("decodes original assets only, unlocks on gesture, overlaps SFX, bounds voices, mutes mixer and clears on scene exit", async () => {
  const context = new FakeContext();
  vi.stubGlobal("AudioContext", function () {
    return context;
  });
  const fetcher = vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(16),
  }));
  vi.stubGlobal("fetch", fetcher);
  const owner = new Audio();
  await owner.load(manifest);
  expect(fetcher).toHaveBeenCalledTimes(8);
  owner.play("whoosh");
  expect(nodes).toHaveLength(0);
  await owner.unlock();
  owner.play("whoosh");
  owner.play("birdiehit");
  expect(owner.diagnostics().voices).toBe(2);
  expect(nodes.slice(0, 2).every((n) => n.start.mock.calls.length === 1)).toBe(
    true,
  );
  owner.toggle();
  expect(context.gain.gain.value).toBe(0);
  owner.toggle();
  expect(context.gain.gain.value).toBe(1);
  for (let i = 0; i < 40; i++) owner.play("ding");
  expect(owner.diagnostics().voices).toBe(32);
  expect(nodes[0].stop).toHaveBeenCalled();
  owner.setMatch(true);
  expect(owner.diagnostics().music).toBe(true);
  expect(nodes.at(-1)!.loop).toBe(true);
  owner.setMatch(false);
  expect(owner.diagnostics()).toEqual({
    voices: 0,
    music: false,
    muted: false,
  });
  expect(nodes.at(-1)!.stop).toHaveBeenCalledOnce();
});
it("autoplay rejection does not throw or prevent gameplay and late unlock cannot restart exited music", async () => {
  const context = new FakeContext();
  context.resume = async () => {
    throw new Error("autoplay");
  };
  vi.stubGlobal("AudioContext", function () {
    return context;
  });
  vi.stubGlobal("fetch", async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(16),
  }));
  const owner = new Audio();
  await owner.load(manifest);
  owner.setMatch(true);
  await expect(owner.unlock()).resolves.toBeUndefined();
  expect(owner.diagnostics().music).toBe(false);
  context.resume = async () => {
    context.state = "running";
  };
  owner.stop();
  await owner.unlock();
  expect(owner.diagnostics().music).toBe(false);
});
it("decodes sounds that arrive after an early mute gesture and shares each decode", async () => {
  const context = new FakeContext();
  const decode = vi.spyOn(context, "decodeAudioData");
  vi.stubGlobal("AudioContext", function () {
    return context;
  });
  let releaseDownloads!: () => void;
  const downloads = new Promise<void>((resolve) => {
    releaseDownloads = resolve;
  });
  vi.stubGlobal("fetch", async () => {
    await downloads;
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(16) };
  });
  const owner = new Audio();
  const loading = owner.load(manifest);
  await owner.unlock();
  expect(decode).not.toHaveBeenCalled();
  releaseDownloads();
  await loading;
  await Promise.all([owner.unlock(), owner.unlock()]);
  expect(decode).toHaveBeenCalledTimes(8);
  owner.play("whoosh");
  owner.setMatch(true);
  expect(owner.diagnostics()).toMatchObject({ voices: 1, music: true });
  owner.stop();
});
it("isolates a missing download or unsupported MP3 while retaining playable sounds", async () => {
  const context = new FakeContext();
  context.decodeAudioData = async (bytes: ArrayBuffer) => {
    if (new Uint8Array(bytes)[0] === 45) throw new Error("unsupported_mp3");
    return {};
  };
  vi.stubGlobal("AudioContext", function () {
    return context;
  });
  vi.stubGlobal("fetch", async (url: string) => {
    if (url.includes("whoosh-38")) throw new Error("network_error");
    const id = Number(url.match(/-(\d+)\.mp3/)![1]);
    return { ok: true, arrayBuffer: async () => Uint8Array.from([id]).buffer };
  });
  const owner = new Audio();
  await expect(owner.load(manifest)).resolves.toBeUndefined();
  await expect(owner.unlock()).resolves.toBeUndefined();
  owner.play("whoosh");
  owner.play("birdiehit");
  expect(owner.diagnostics().voices).toBe(0);
  owner.play("ding");
  owner.setMatch(true);
  expect(owner.diagnostics()).toMatchObject({ voices: 1, music: true });
  owner.stop();
});
