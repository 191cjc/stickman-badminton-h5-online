import {
  Buffer,
  BufferUsage,
  Geometry,
  GlProgram,
  Mesh,
  Shader,
} from "pixi.js";
import type { DrawFrame } from "../shared/classic/manifest";
import { MAX_PARTICLES, type Particle } from "./effects";
import type { AtlasTextureFragment } from "./atlas-loader";

// These names match the public global/local uniform groups bound by Pixi's MeshPipe.
const vertex = `
attribute vec2 aPosition;
attribute vec2 aBaseUV;
attribute vec2 aDeltaUV;
attribute vec3 aBodyColor;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform vec4 uColor;
varying vec2 vBaseUV;
varying vec2 vDeltaUV;
varying vec3 vBodyColor;
varying vec4 vColor;
void main() {
  vec3 position = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix * vec3(aPosition, 1.0);
  gl_Position = vec4(position.xy, 0.0, 1.0);
  vBaseUV = aBaseUV;
  vDeltaUV = aDeltaUV;
  vBodyColor = aBodyColor;
  vColor = uWorldColorAlpha * uColor;
}`;
const fragment = `
varying vec2 vBaseUV;
varying vec2 vDeltaUV;
varying vec3 vBodyColor;
varying vec4 vColor;
uniform sampler2D uBase;
uniform sampler2D uDelta;
void main() {
  vec4 fixedColor = texture2D(uBase, vBaseUV);
  vec3 bodyContribution = texture2D(uDelta, vDeltaUV).rgb;
  gl_FragColor = vec4(fixedColor.rgb + bodyContribution * vBodyColor, fixedColor.a) * vColor;
}`;

/** A single draw for all confetti: fixed bevel/shadow + body-only RGB contribution. */
export class ConfettiMesh {
  readonly mesh: Mesh<Geometry, Shader>;
  private positions = new Float32Array(MAX_PARTICLES * 8);
  private baseUV = new Float32Array(MAX_PARTICLES * 8);
  private deltaUV = new Float32Array(MAX_PARTICLES * 8);
  private colors = new Float32Array(MAX_PARTICLES * 12);
  private geometry: Geometry;
  private shader: Shader;
  private positionBuffer: Buffer;
  private colorBuffer: Buffer;
  private count = 0;
  constructor(
    private original: DrawFrame,
    base: AtlasTextureFragment,
    delta: AtlasTextureFragment,
  ) {
    const indices = new Uint16Array(MAX_PARTICLES * 6);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const start = i * 4;
      indices.set(
        [start, start + 1, start + 2, start, start + 2, start + 3],
        i * 6,
      );
      for (const [target, asset] of [
        [this.baseUV, base],
        [this.deltaUV, delta],
      ] as const) {
        const rect = asset.fragment.frame,
          source = asset.texture.source;
        const x0 = rect.x / source.width,
          y0 = rect.y / source.height;
        const x1 = (rect.x + rect.width) / source.width,
          y1 = (rect.y + rect.height) / source.height;
        target.set([x0, y0, x1, y0, x1, y1, x0, y1], i * 8);
      }
    }
    const usage = BufferUsage.VERTEX | BufferUsage.COPY_DST;
    this.positionBuffer = new Buffer({
      data: this.positions,
      usage,
      shrinkToFit: false,
    });
    this.colorBuffer = new Buffer({
      data: this.colors,
      usage,
      shrinkToFit: false,
    });
    this.geometry = new Geometry({
      attributes: {
        aPosition: { buffer: this.positionBuffer, format: "float32x2" },
        aBaseUV: { buffer: this.baseUV, format: "float32x2" },
        aDeltaUV: { buffer: this.deltaUV, format: "float32x2" },
        aBodyColor: { buffer: this.colorBuffer, format: "float32x3" },
      },
      indexBuffer: indices,
    });
    this.shader = new Shader({
      glProgram: GlProgram.from({
        vertex,
        fragment,
        name: "classic-confetti-affine",
      }),
      resources: { uBase: base.texture.source, uDelta: delta.texture.source },
    });
    this.mesh = new Mesh({
      geometry: this.geometry,
      shader: this.shader,
      texture: base.texture,
      label: "confetti:batch",
    });
    this.mesh.visible = false;
    const trim = base.fragment.trim;
    this.corners = [
      original.x + (trim.x * original.width) / base.frame.pixelWidth,
      original.y + (trim.y * original.height) / base.frame.pixelHeight,
      (trim.width * original.width) / base.frame.pixelWidth,
      (trim.height * original.height) / base.frame.pixelHeight,
    ];
  }
  private corners: number[];
  /** Force the small shader/buffer path once beneath the real loading cover. */
  prewarm(): void {
    this.positions.set([-32, -32, -31, -32, -31, -31, -32, -31]);
    this.colors.fill(1, 0, 12);
    this.geometry.indexCount = 6;
    this.mesh.visible = true;
    this.positionBuffer.update(8 * 4);
    this.colorBuffer.update(12 * 4);
  }
  update(particles: readonly Particle[]): void {
    let count = 0;
    const [x, y, width, height] = this.corners;
    for (const particle of particles) {
      if (particle.kind !== "confetti" || count === MAX_PARTICLES) continue;
      const angle = (particle.rotation * Math.PI) / 180;
      const a = Math.cos(angle) * particle.scale,
        b = Math.sin(angle) * particle.scale;
      const color = parseInt(particle.color?.slice(1) ?? "ffffff", 16);
      const r = ((color >>> 16) & 255) / 255,
        g = ((color >>> 8) & 255) / 255,
        blue = (color & 255) / 255;
      for (let corner = 0; corner < 4; corner++) {
        const px = x + (corner === 1 || corner === 2 ? width : 0);
        const py = y + (corner >= 2 ? height : 0);
        this.positions[count * 8 + corner * 2] = particle.x + a * px - b * py;
        this.positions[count * 8 + corner * 2 + 1] =
          particle.y + b * px + a * py;
        const colorOffset = count * 12 + corner * 3;
        this.colors[colorOffset] = r;
        this.colors[colorOffset + 1] = g;
        this.colors[colorOffset + 2] = blue;
      }
      count++;
    }
    this.count = count;
    this.mesh.visible = count > 0;
    if (!count) return;
    this.geometry.indexCount = count * 6;
    this.positionBuffer.update(count * 8 * 4);
    this.colorBuffer.update(count * 12 * 4);
  }
  diagnostics() {
    return {
      particles: this.count,
      draws: this.count ? 1 : 0,
      source: this.original.path,
    };
  }
  destroy(): void {
    this.mesh.destroy();
    this.geometry.destroy(true);
    this.shader.destroy(false);
  }
}
