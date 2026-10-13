import { BASE_PATH } from "../shared/protocol";
import type { AssetManifest } from "../shared/classic/manifest";
export type AudioId = keyof AssetManifest["sounds"];
/** Original SFX can overlap; all nodes/buffers belong to this page's audio owner. */
export class Audio {
  private context?: AudioContext;
  private gain?: GainNode;
  private raw = new Map<AudioId, ArrayBuffer>();
  private buffers = new Map<AudioId, AudioBuffer>();
  private voices = new Set<AudioBufferSourceNode>();
  private music?: AudioBufferSourceNode;
  private musicGain?: GainNode;
  private musicFade = 0;
  private musicAccumulator = 0;
  private musicWanted = false;
  private decoding = new Map<AudioId, Promise<void>>();
  muted = false;
  async load(manifest: AssetManifest): Promise<void> {
    await Promise.allSettled(
      Object.entries(manifest.sounds).map(async ([key, sound]) => {
        const res = await fetch(
          `${BASE_PATH}classic/${sound.path}?v=${sound.sha256}`,
        );
        if (!res.ok) throw new Error(`sound_load_${sound.path}`);
        this.raw.set(key as AudioId, await res.arrayBuffer());
      }),
    );
    if (this.context?.state === "running") {
      await this.decodeAvailable();
      if (this.musicWanted) this.startMusic();
    }
  }
  private async decodeAvailable(): Promise<void> {
    if (!this.context) return;
    await Promise.all(
      [...this.raw].map(([key, bytes]) => {
        let pending = this.decoding.get(key);
        if (!pending) {
          pending = this.context!.decodeAudioData(bytes.slice(0))
            .then((buffer) => {
              this.buffers.set(key, buffer);
            })
            .catch(() => {
              /* An unsupported sound must not silence all remaining sounds. */
            });
          this.decoding.set(key, pending);
        }
        return pending;
      }),
    );
  }
  async unlock(): Promise<void> {
    try {
      this.context ??= new AudioContext();
      if (!this.gain) {
        this.gain = this.context.createGain();
        this.gain.gain.value = this.muted ? 0 : 1;
        this.gain.connect(this.context.destination);
      }
      await this.context.resume();
      await this.decodeAvailable();
      if (this.musicWanted) this.startMusic();
    } catch {
      /* Autoplay/decoder failures cannot block matching or gameplay. */
    }
  }
  play(id: AudioId): void {
    const buffer = this.buffers.get(id);
    if (
      !buffer ||
      !this.context ||
      !this.gain ||
      this.context.state !== "running"
    )
      return;
    // Resource cap, not a new gameplay/audio cooldown.
    if (this.voices.size >= 32) {
      const oldest = this.voices.values().next().value;
      oldest?.stop();
      if (oldest) this.voices.delete(oldest);
    }
    const node = this.context.createBufferSource();
    node.buffer = buffer;
    node.connect(this.gain);
    this.voices.add(node);
    node.onended = () => {
      this.voices.delete(node);
      node.disconnect();
    };
    node.start();
  }
  toggle(): boolean {
    this.muted = !this.muted;
    if (this.gain) this.gain.gain.value = this.muted ? 0 : 1;
    return this.muted;
  }
  setMatch(active: boolean): void {
    this.musicWanted = active;
    if (active) this.startMusic();
    else this.stop();
  }
  /** §_-3h§ ENTER_FRAME adds 1/(2*30), from the instruction scene's fade parameter2.
   * Run source callbacks at60Hz regardless of display refresh; mute remains a separate mixer gain.
   */
  advance(frameDt: number): void {
    if (!this.musicGain || !(frameDt > 0) || !Number.isFinite(frameDt)) return;
    this.musicAccumulator += Math.min(frameDt, 0.25);
    while (this.musicAccumulator + 1e-9 >= 1 / 60) {
      this.musicAccumulator = Math.max(0, this.musicAccumulator - 1 / 60);
      this.musicFade = Math.min(1, this.musicFade + 1 / (2 * 30));
    }
    this.musicGain.gain.value = this.musicFade;
  }
  private startMusic(): void {
    if (
      this.music ||
      !this.musicWanted ||
      this.context?.state !== "running" ||
      !this.gain ||
      !this.buffers.has("music")
    )
      return;
    const node = this.context.createBufferSource();
    node.buffer = this.buffers.get("music")!;
    node.loop = true;
    this.musicGain = this.context.createGain();
    this.musicGain.gain.value = 0;
    this.musicFade = 0;
    this.musicAccumulator = 0;
    this.musicGain.connect(this.gain);
    node.connect(this.musicGain);
    node.start();
    this.music = node;
  }
  stop(): void {
    this.musicWanted = false;
    if (this.music) {
      this.music.stop();
      this.music.disconnect();
      this.music = undefined;
    }
    this.musicGain?.disconnect();
    this.musicGain = undefined;
    this.musicFade = 0;
    this.musicAccumulator = 0;
    for (const node of this.voices) {
      node.stop();
      node.disconnect();
    }
    this.voices.clear();
  }
  diagnostics() {
    return { voices: this.voices.size, music: !!this.music, muted: this.muted };
  }
}
