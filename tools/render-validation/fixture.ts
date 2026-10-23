// Research-only entry: Vite serves this path directly; it is never in the product build.
import { Renderer as CanvasRenderer } from "../../artifacts/pixi-migration/canvas-source/client/renderer";
import { Renderer as PixiRenderer } from "../../src/client/renderer";
import {
  Effects,
  createParticle,
  confettiColor,
} from "../../src/client/effects";
import { Simulation } from "../../src/shared/simulation";
import { seededRandom } from "../../src/shared/classic/presentation";
import {
  CHARACTERS,
  type CharacterId,
} from "../../src/shared/classic/characters";
import type {
  AssetManifest,
  DrawFrame,
} from "../../src/shared/classic/manifest";
import type {
  ClassicBodyFrame,
  ClassicSwingKind,
} from "../../src/shared/classic/types";
import type { GameState } from "../../src/shared/state";
import type { Snapshot } from "../../src/shared/protocol";

type Options = {
  role: CharacterId;
  action: string;
  density: number;
  mirrored?: boolean;
  frame?: number;
};
// The archived/current classes have nominally different private declarations,
// while their immutable presentation contract is identical at this checkpoint.
type CanvasEffects = Parameters<CanvasRenderer["render"]>[3];
const canvas = document.querySelector<HTMLCanvasElement>("#fixture")!;
const variant = new URLSearchParams(location.search).get("variant") ?? "pixi";
const renderer =
  variant === "canvas" ? new CanvasRenderer() : new PixiRenderer(canvas);
let manifest: AssetManifest;
let current: {
  state: GameState;
  effects: Effects;
  view: {
    width: number;
    height: number;
    scale: number;
    offsetX: number;
    offsetY: number;
    dpr: number;
  };
  mirrored: boolean;
};

function freeze<T>(object: T): T {
  if (object && typeof object === "object") {
    Object.freeze(object);
    for (const value of Object.values(object)) freeze(value);
  }
  return object;
}
function describeFrame(
  frame: DrawFrame,
  tx = 0,
  ty = 0,
  sx = 1,
  sy = 1,
  mirrored = false,
) {
  const point = (x: number, y: number) => ({
    x: mirrored ? 640 - (tx + sx * x) : tx + sx * x,
    y: ty + sy * y,
  });
  return {
    ...frame,
    corners: [
      point(frame.x, frame.y),
      point(frame.x + frame.width, frame.y),
      point(frame.x + frame.width, frame.y + frame.height),
      point(frame.x, frame.y + frame.height),
    ],
    determinant: sx * sy * (mirrored ? -1 : 1),
  };
}
function snapshot(state: GameState): Snapshot {
  return {
    type: "snapshot",
    room: "fixed-state",
    tick: 240,
    ack: 0,
    ackTick: null,
    status: "playing",
    reconnectRemainingMs: 0,
    state,
    effects: { cursor: 0, events: [] },
  };
}
function fixture(options: Options) {
  const simulation = new Simulation({
    seed: 0x90302,
    cosmeticSeed: 0x90302f,
    characters: { left: options.role, right: options.role },
  });
  const state = simulation.snapshot();
  Object.assign(state.score, { left: 1, right: 2 });
  state.elapsed = 4;
  state.net.frame = 8;
  Object.assign(state.shuttle, {
    state: "flying",
    x: 367,
    y: 154,
    rotation: 37,
  });
  const body: ClassicBodyFrame = ["forward", "backward", "jump"].includes(
    options.action,
  )
    ? (options.action as ClassicBodyFrame)
    : "normal";
  const swing: ClassicSwingKind = ["serve", "overhead", "underhand"].includes(
    options.action,
  )
    ? (options.action as ClassicSwingKind)
    : "overhead";
  const family = manifest.characters[options.role].family;
  const swingLength = manifest.families[family].swings[swing].length;
  const swingFrame =
    options.frame === -1
      ? swingLength
      : (options.frame ??
        (swing === "serve"
          ? Math.min(9, swingLength)
          : Math.min(6, swingLength)));
  for (const side of ["left", "right"] as const) {
    const player = state.players[side];
    Object.assign(player, {
      x: side === "left" ? 174 : 466,
      y: body === "jump" ? 315 : 400,
      bodyFrame: body,
      bodyFrameIndex: options.frame && options.frame > 0 ? options.frame : 7,
      swingKind: swing,
      swingFrame,
      swinging: ["serve", "overhead", "underhand"].includes(options.action),
      serving: options.action === "serve",
    });
    if (!player.swinging) player.swingFrame = 1;
  }
  if (options.action === "serve") state.shuttle.state = "attached";
  const effects = new Effects();
  effects.reset("fixed-state");
  effects.ingest(snapshot(state));
  effects.advance(options.action === "intro" ? 60 : 240, 0, () => {});
  if (
    ["intro", "layers", "finish-left", "finish-right", "confetti"].includes(
      options.action,
    )
  ) {
    if (options.action === "intro" || options.action === "layers") {
      // Keep both names different so mirrored name selection is observable.
      state.players.left.characterId = options.role;
      state.players.right.characterId =
        options.role === "pirate" ? "toaster" : "pirate";
      Object.defineProperty(effects, "introAlpha", { value: 0.85 });
    }
    const rng = seededRandom(0x90302c);
    for (const [kind, x, y, rotation, scale] of [
      ["smoke", 176, 303, 21, 1],
      ["smoke", 462, 310, -33, 0.72],
      ["tail", 365, 153, 47, 1],
      ["tail", 340, 165, 12, 0.65],
    ] as const)
      effects.particles.push(
        Object.assign(createParticle(kind, x, y, rng), { rotation, scale }),
      );
    // Intentionally overlap the central overlay to expose depth mistakes.
    effects.sparks.push(
      { x: 280, y: 213, frame: 6, tick: 240, order: 4, dir: -21 },
      { x: 360, y: 213, frame: 9, tick: 240, order: 8, dir: 39 },
    );
    effects.finishOrder = 6;
    if (options.action !== "intro") {
      effects.finish(true, state);
      Object.defineProperty(effects, "finishAlpha", { value: 0.85 });
      effects.finishOrder = 6;
      state.phase = "matchEnd";
      state.winner = options.action === "finish-right" ? "right" : "left";
      const colors = [
        "#000000",
        "#ffffff",
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#12ab45",
        "#808080",
        confettiColor(256, 256, 256),
      ];
      for (let i = 0; i < colors.length; i++)
        effects.particles.push(
          Object.assign(
            createParticle("confetti", 240 + i * 24, 208 + (i % 2) * 20, rng),
            {
              color: colors[i],
              rotation: i * 23,
              scale: options.action === "confetti" ? 4 : 1.5,
            },
          ),
        );
    }
  }
  const mirrored = !!options.mirrored;
  const displayed = (side: "left" | "right") =>
    mirrored ? (side === "left" ? "right" : "left") : side;
  const scoreKey =
    state.phase === "matchEnd"
      ? `${displayed(state.winner!) === "left" ? "p1" : "p2"}wins`
      : `${state.score[displayed("left")]}-${state.score[displayed("right")]}`;
  const actorFrames = Object.values(effects.frozenPlayers ?? state.players).map(
    (player) => {
      const character = manifest.characters[player.characterId];
      const swings =
        manifest.families[character.family].swings[player.swingKind];
      const bodies = character.body[player.bodyFrame];
      return {
        side: player.side,
        role: player.characterId,
        // Oracle comes from original source metadata, independent of atlas trim or Pixi transforms.
        frames: [
          swings[
            Math.max(0, Math.min(swings.length - 1, player.swingFrame - 1))
          ],
          bodies[Math.max(0, player.bodyFrameIndex - 1) % bodies.length],
        ].map((frame) =>
          describeFrame(
            frame,
            player.x - 0.05,
            player.y,
            player.side === "left" ? 1.25 : -1.25,
            1.25,
            mirrored,
          ),
        ),
      };
    },
  );
  return {
    state: freeze(state),
    effects,
    oracle: {
      actors: actorFrames,
      scoreKey,
      score: describeFrame(manifest.scores[scoreKey]),
      introNames: ["left", "right"].map(
        (side) =>
          `${state.players[displayed(side as "left" | "right")].characterId}-${side}`,
      ),
      brand: describeFrame(manifest.courtBrand),
      expectedOrder: [
        "background",
        "net",
        "score",
        "markers",
        "smoke",
        "left-swing",
        "left-body",
        "right-swing",
        "right-body",
        "tail",
        "shuttle",
        "brand",
        "intro",
        "earlier-spark",
        "finish",
        "later-spark",
        "confetti",
      ],
    },
  };
}
function effectsState(effects: Effects) {
  return JSON.stringify({
    particles: effects.particles,
    sparks: effects.sparks,
    intro: effects.introAlpha,
    finish: effects.finishAlpha,
    order: effects.finishOrder,
    frozen: effects.frozenPlayers,
  });
}
function draw() {
  const { view, state, effects, mirrored } = current;
  if (renderer instanceof CanvasRenderer) {
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    renderer.render(
      ctx,
      view,
      state,
      effects as unknown as CanvasEffects,
      mirrored,
    );
  } else renderer.render(view, state, effects, mirrored);
}
async function render(options: Options) {
  const { state, effects, oracle } = fixture(options);
  const view = {
    width: 640,
    height: 426,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    dpr: options.density,
  };
  canvas.style.width = `${640 * options.density}px`;
  canvas.style.height = `${426 * options.density}px`;
  if (renderer instanceof CanvasRenderer) {
    canvas.width = 640 * options.density;
    canvas.height = 426 * options.density;
  }
  current = { state, effects, view, mirrored: !!options.mirrored };
  const before = effectsState(effects);
  const prepared =
    renderer instanceof CanvasRenderer
      ? await renderer.prepare(
          view,
          state,
          effects as unknown as CanvasEffects,
          () => {},
          !!options.mirrored,
        )
      : await renderer.prepare(
          view,
          state,
          effects,
          () => {},
          !!options.mirrored,
        );
  if (!prepared) throw Error("Fixture prepare invalidated");
  draw();
  // Canvas source creates asynchronous per-color SVGs. Wait for those real decodes;
  // Pixi has no such per-color work. No clocks or simulation steps happen here.
  if (renderer instanceof CanvasRenderer) {
    const deadline = performance.now() + 15000;
    while (renderer.diagnostics().colors?.pending) {
      if (performance.now() > deadline)
        throw Error("Source color decode timed out");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  draw();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  draw();
  if (effectsState(effects) !== before)
    throw Error("Rendering mutated Effects");
  return {
    options,
    oracle,
    state,
    diagnostics: renderer.diagnostics(),
    backing: { width: canvas.width, height: canvas.height },
    roleLabels: Object.keys(CHARACTERS),
  };
}
Object.assign(window, { renderFixture: render, fixtureStatus: "loading" });
try {
  manifest = await renderer.load();
  Object.assign(window, { fixtureStatus: "ready" });
} catch (error) {
  Object.assign(window, {
    fixtureStatus: "failed",
    fixtureError: String(error),
  });
  throw error;
}
window.addEventListener("pagehide", () => {
  if (renderer instanceof CanvasRenderer) renderer.clearEffectsImages();
  else renderer.destroy();
});
