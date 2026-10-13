import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { classicAssetData } from "../../src/shared/classic/assets-data";
import {
  classicAnimation,
  classicGeometry,
  racketPose,
} from "../../src/shared/classic/assets";

const root = resolve(import.meta.dirname, "../..");
const reference = resolve(root, "reference/flash-90302");
const xml = gunzipSync(
  readFileSync(resolve(reference, "original.xml.gz")),
).toString();
import type {
  AssetManifest,
  DrawFrame,
} from "../../src/shared/classic/manifest";
import { CHARACTER_IDS } from "../../src/shared/classic/characters";
import {
  characterAnimation,
  characterGeometry,
} from "../../src/shared/classic/assets";
const manifest = JSON.parse(
  readFileSync(resolve(root, "public/classic/manifest.json"), "utf8"),
) as AssetManifest;
const body = manifest.characters.joe.body;
const swings = manifest.families.adult.swings;
const readArt = (frame: DrawFrame) =>
  readFileSync(resolve(root, "public/classic", frame.path), "utf8");
const hash = (data: string | Buffer) =>
  createHash("sha256").update(data).digest("hex");

describe("frozen Flash artwork and collision evidence", () => {
  it("ties generated collision data to the verified original SWF/XML", () => {
    expect(hash(readFileSync(resolve(reference, "original.swf")))).toBe(
      "cab8a824c54af3a0b9454ef30fcbcabc532931f2a96717239fabd58f57e59912",
    );
    expect(hash(xml)).toBe(
      "3c6172e89a9d540fdf976484cc3765190368cdf5f49838fb6f82e9b4bb6861d0",
    );
    expect(classicAssetData.source.xmlSha256).toBe(hash(xml));
    expect(xml).toContain('spriteId="230"');
  });

  it("preserves script frame events rather than timing from browser clocks", () => {
    const cases = [
      ["Symbol30copy3.as", [0, 6, 22], classicAnimation.serve.frames],
      ["Symbol30copy2ragdag.as", [0, 14, 26], classicAnimation.overhead.frames],
      ["Symbol30copy2agr.as", [0, 9, 18], classicAnimation.underhand.frames],
    ] as const;
    for (const [file, events, frames] of cases) {
      const script = readFileSync(resolve(reference, "scripts", file), "utf8");
      const call = script.match(/addFrameScript\(([^;]+)\);/)?.[1] ?? "";
      const offsets = call
        .split(",")
        .filter((_, index) => index % 2 === 0)
        .map(Number);
      expect(offsets).toEqual([...events]);
      expect(offsets.at(-1)! + 1).toBe(frames);
    }
    expect(classicAnimation.serve.release).toBe(7);
    expect(classicAnimation.overhead.contactEnd).toBe(15);
    expect(classicAnimation.underhand.contactEnd).toBe(10);
    const netScript = readFileSync(
      resolve(reference, "scripts/Symbol44hsrthtr.as"),
      "utf8",
    );
    expect(netScript).toContain('symbol="symbol330"');
    expect(netScript).toMatch(/addFrameScript\(0,this\.frame1\)/);
    expect(netScript).toMatch(/function frame1\(\)[\s\S]*?stop\(\)/);
    const netFrames = xml.match(/frameCount="(\d+)"[^>]*spriteId="330"/)?.[1];
    expect(classicAnimation.net.frames).toBe(Number(netFrames));
  });

  it("uses actual instance origins, separate from net collision bounds", () => {
    // Original translations in SWF twips: Joe569/-445, scene6326/7541 and6326/6475.
    expect(classicGeometry.servePoint).toEqual({ x: 569 / 20, y: -445 / 20 });
    expect(classicGeometry.net.x).toBe(6345 / 20);
    expect(classicGeometry.net.sideOrigin).toEqual({
      x: 6326 / 20,
      y: 7541 / 20,
    });
    expect(classicGeometry.net.topOrigin).toEqual({
      x: 6326 / 20,
      y: 6475 / 20,
    });
    expect(classicGeometry.net.side.width).toBeCloseTo(21 * 1.5480957, 8);
    expect(classicGeometry.net.side.height).toBeCloseTo(21 * 5.463791, 8);
  });

  it("preserves racket contacts and local rotation at recorded original frames", () => {
    // Independent frame1 witness: Joe mount + body(-222,-250) + hitbox(469,215),
    // invisible circle bounds ±290 twips enlarged1.4401855. No runtime1.25 here.
    const frame = racketPose("overhead", 1);
    expect(frame.rotation).toBe(0);
    expect(frame.hitbox.x).toBeCloseTo(-41.387545452104675, 10);
    expect(frame.hitbox.y).toBeCloseTo(-109.22998915210468, 10);
    expect(frame.hitbox.width).toBeCloseTo(39.17798500420935, 10);
    expect(racketPose("overhead", 27)).toEqual(frame);
    // Original overhead frame9 has scaleX0.0051116943 and rotateSkew00.999527.
    expect(racketPose("overhead", 9).rotation).toBeCloseTo(89.706985691, 6);
    expect(racketPose("serve", 1).rotation).toBe(0);
    expect(racketPose("underhand", 1).rotation).toBeLessThan(-50);
  });

  it("retains curved selection zones instead of substituting bounding boxes", () => {
    expect(classicGeometry.underhandZone.length).toBeGreaterThan(100);
    expect(classicAssetData.source.polygonTolerance).toBe(0.01);
    const under = classicGeometry.underhandZone;
    expect(under[0].x).toBeCloseTo(17.25 + 24.1 * 1.1691132, 9);
    expect(under[0].y).toBeCloseTo(-36.25 - 28.05 * 1.1691132, 9);
    expect(under.at(-1)?.x).toBeCloseTo(under[0].x, 9);
    expect(under.at(-1)?.y).toBeCloseTo(under[0].y, 9);
  });

  it("draws only the body plus selected swing and preserves nested walking frames", () => {
    expect(
      Object.fromEntries(
        Object.entries(body).map(([name, frames]) => [name, frames.length]),
      ),
    ).toEqual({ normal: 1, backward: 16, forward: 16, jump: 1 });
    for (const frames of Object.values(body)) {
      for (const frame of frames)
        expect(readArt(frame)).not.toMatch(
          /serveSwing|underhandSwing|overheadSwing|underHitbox|computerHitbox/,
        );
    }
    for (const name of ["forward", "backward"]) {
      const frames = body[name as "forward" | "backward"].map(readArt);
      expect(new Set(frames).size).toBe(8);
      for (let i = 0; i < 16; i += 2) expect(frames[i]).toBe(frames[i + 1]);
    }
    for (const [kind, frames] of Object.entries(swings)) {
      expect(frames).toHaveLength(
        classicAnimation[kind as keyof Omit<typeof classicAnimation, "fps">]
          .frames,
      );
      const others = ["serveSwing", "underhandSwing", "overheadSwing"].filter(
        (name) => name !== `${kind}Swing`,
      );
      for (const frame of frames)
        for (const other of others) expect(readArt(frame)).not.toContain(other);
    }
  });

  it("serves internal static SVGs with hashes and no executable/remote content", () => {
    expect(readdirSync(resolve(root, "public/classic"))).not.toContain(
      "original.swf",
    );
    for (const [path, digest] of Object.entries(manifest.files)) {
      expect(path).not.toMatch(/\.\.|^\//);
      const art = readFileSync(resolve(root, "public/classic", path));
      expect(hash(art)).toBe(digest);
      if (!path.endsWith(".svg")) continue;
      expect(art.toString()).not.toMatch(
        /<script|<foreignObject|<a\s|\son\w+=|(?:xlink:)?href=["'](?:https?:|javascript:)/i,
      );
      expect(art.toString()).toContain('viewBox="');
    }
    expect(readArt(manifest.background)).not.toMatch(
      /kongBtn|switch|mouseHitbox2/,
    );
    expect(manifest.netFrames).toHaveLength(24);
    expect(
      manifest.netFrames[0].x + manifest.netFrames[0].filterPadding,
    ).toBeGreaterThan(300);
    expect(manifest.shuttle.x).toBeLessThan(0);
  });
});

describe("original multiplayer assets beyond Joe", () => {
  it("includes exactly the seven accessible roles and source body art/attachments", () => {
    expect(Object.keys(manifest.characters)).toEqual(CHARACTER_IDS);
    for (const id of CHARACTER_IDS) {
      const character = manifest.characters[id];
      for (const frames of Object.values(character.body))
        for (const frame of frames)
          expect(readArt(frame)).not.toMatch(
            /underHitbox|computerHitbox|Swing/,
          );
      expect(character.body.normal[0].path).toContain(id);
    }
    // Pirate's additional shape220/depth21 survives the body closure.
    expect(manifest.characters.pirate.bodySymbols.normal).toEqual([
      142, 144, 219, 220,
    ]);
    expect(manifest.characters.pirate.bodyDepths.normal).toEqual([
      11, 13, 15, 21,
    ]);
    expect(manifest.uiSources).toEqual({
      courtBrand: { symbol: 343, frame: 1 },
      intro: { symbol: 255, frame: 1 },
      finish: { symbol: 269, frame: 1 },
    });
    expect(hash(readArt(manifest.characters.pirate.body.normal[0]))).not.toBe(
      hash(readArt(manifest.characters.joe.body.normal[0])),
    );
    expect(manifest.characters.toaster.body.forward).toHaveLength(1);
    const script = readFileSync(
      resolve(reference, "scripts/Symbol30copy9.as"),
      "utf8",
    );
    expect(script).toContain(
      "addFrameScript(0,this.frame1,7,this.frame8,26,this.frame27)",
    );
    expect(characterAnimation("toaster").serve).toEqual({
      frames: 27,
      release: 8,
    });
    expect(characterGeometry("toaster").servePoint).toEqual({
      x: 22,
      y: -86.55,
    });
    expect(racketPose("overhead", 1, "toaster")).not.toEqual(
      racketPose("overhead", 1, "joe"),
    );
  });
  it("exports original FX lifetimes with padded unchanged filter hierarchy and only active sounds", () => {
    expect(manifest.schema).toBe(2);
    expect(manifest.effects.spark.originalSymbol).toBe(278);
    expect(manifest.effects.spark.frames).toHaveLength(25);
    expect(manifest.effects.spark.removeFrame).toBe(22);
    for (const name of ["tail", "smoke", "confetti"] as const) {
      const frame = manifest.effects[name].frames[0];
      expect(frame.filterPadding).toBeGreaterThan(0);
      expect(readArt(frame)).toContain("feGaussianBlur");
    }
    expect(readArt(manifest.effects.confetti.frames[0])).toContain(
      'data-confetti-body="true"',
    );
    expect(readArt(manifest.effects.confetti.frames[0])).toContain(
      'flood-color="#ff0000"',
    );
    expect(
      Object.values(manifest.sounds)
        .map((s) => s.originalSymbol)
        .sort((a, b) => a - b),
    ).toEqual([19, 20, 38, 40, 43, 45, 46, 47]);
    for (const sound of Object.values(manifest.sounds)) {
      const tag = xml.match(
        new RegExp(
          '<item type="DefineSoundTag"[^>]*soundId="' +
            sound.originalSymbol +
            '"[^>]*>',
        ),
      )?.[0];
      const raw = Buffer.from(
        tag!.match(/soundData="([a-fA-F0-9]+)"/)![1],
        "hex",
      );
      expect(hash(raw.subarray(2))).toBe(sound.sha256);
      expect(raw.readInt16LE()).toBe(sound.seekSamples);
    }
    expect(readArt(manifest.ui.intro)).not.toContain("Quarter-Finals");
    expect(Object.keys(manifest.scores)).toHaveLength(66);
  });
  it("retains the original court brand's visible Up art, registration and filters without executable sponsor actions", () => {
    expect(xml).toMatch(/characterId="343"[^>]*name="kongBtn"/);
    expect(manifest.uiSources.courtBrand).toEqual({ symbol: 343, frame: 1 });
    const art = readArt(manifest.courtBrand);
    expect(art).toContain("matrix(1.0, 0.0, 0.0, 1.0, 565.9, 12.95)");
    expect(art).toContain("feGaussianBlur");
    expect(art).toContain("feComposite");
    expect(art).not.toMatch(/<a\s|<script|kongBtn|https?:\/\/(?!www\.w3\.org)/);
  });
});
