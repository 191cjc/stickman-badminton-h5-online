# Research: Original Flash 90302 in-match effects, audio, and result presentation

- Query: Which visual effects and sounds are actually used by the recovered original, what precisely triggers and removes them, and what production conversion / synchronization work is needed?
- Scope: internal; unchanged Flash 90302 scripts/XML, the complete research export, current H5 simulation/renderer/converter.
- Date: 2026-10-13
- Ownership: research only. No gameplay, converter, public asset, protocol, or deployment edits were made.

**Confirmed product scope:** convert the original local multiplayer mode to online multiplayer only. The seven versus characters are Joe, Nadia, Harry, Pirate, Top Hat, Red Dude, and Toaster. Robot, Timmy, AI practice, the five-round campaign, unlock progression, WinOverlay newspaper and DeathScreen are outside this implementation. They are recorded below solely to distinguish archive assets/calls from the relevant versus triggers. The relevant result art is **FinishOverlay symbol269 frame1**, not WinOverlay symbol94. Online versus should use one point ding and one terminal cheer for either winning side, with confetti; do not import the campaign loss sigh or frame53 second cheer.

## Findings

### Evidence and files found

The original game is the user-confirmed `https://www.4399.com/flash/90302.htm`, frozen SWF SHA-256 `cab8a824c54af3a0b9454ef30fcbcabc532931f2a96717239fabd58f57e59912`. The full XML is `artifacts/flash-full-archive/original.xml`, also frozen as `reference/flash-90302/original.xml.gz`, XML SHA-256 `3c6172e89a9d540fdf976484cc3765190368cdf5f49838fb6f82e9b4bb6861d0`. Staging artifacts are available locally but are not runtime dependencies. The reproducible complete archive is `reference/flash-90302/full-export.tar.xz`.

| File | Role |
| --- | --- |
| `reference/flash-90302/scripts/§_-2g§/§_-24§.as` | Birdie: successful launch flash/audio, speed-dependent trail, net animation, scoring ground contact |
| `reference/flash-90302/scripts/fx/BigSpark.as` | Spark timeline removal callback |
| `reference/flash-90302/scripts/fx/SmallSpark.as` | Archived but apparently unused spark class |
| `reference/flash-90302/scripts/fx/ParticleBirdie.as` | Yellow star/scribble particle movement, spin, shrink, removal |
| `reference/flash-90302/scripts/fx/ParticleSmog.as` | Gray smoke particle movement, spin, shrink, removal |
| `reference/flash-90302/scripts/fx/ParticleConfetti.as` | Randomly colored confetti, lateral changes and off-stage removal |
| `reference/flash-90302/scripts/§_-0V§/§_-h§.as` | Common character: accepted swing sound, successful contacts, speech bubble hooks |
| `reference/flash-90302/scripts/§_-0V§/§_-5G§.as` | Robot smoke emitter and bobbing |
| `reference/flash-90302/scripts/§_-0V§/override.as` | Toaster smoke, pop serve sound, special speech |
| `reference/flash-90302/scripts/§_-2s§/§_-u§.as` | PlayState: score, result sounds, confetti activation and per-frame emission, intro/result overlay creation |
| `reference/flash-90302/scripts/ui/{FinishOverlay,WinOverlay,DeathScreen}.as` | Original result presentation; campaign-only distinctions |
| `reference/flash-90302/scripts/§_-2g§/{§_-2P§,§var§}.as` | Exhibition/round intro and character speech bubble |
| `reference/flash-90302/scripts/bobby/{§ null§,§_-0v§,§_-2W§,§_-3e§,§_-3h§}.as` | Timeline/callback clock, append depth, RNG/direction, audio manager |
| `reference/flash-90302/scripts/bobby/classes/{TransitionBase,TransitionFunction}.as` | Original black screen fade around campaign result screens |
| `artifacts/flash-full-archive/export/sprites/` | Complete SVG timelines including all effects/result symbols |
| `artifacts/flash-full-archive/export/sounds/` | Complete original MP3 sound exports |
| `tools/flash-assets/{extract,build,finalize}.py` | Current selected-art production converter, Joe-only manifest |
| `src/client/renderer.ts` | Current draw order and schema; no effects or audio |
| `src/shared/classic/{simulation,birdie,player,animation,types}.ts` | Authority and prediction-shared gameplay; no public presentation event stream |

### Exactly four instantiated fx classes; SmallSpark is unused

Searching all 112 recovered AS files finds creations of only `BigSpark`, `ParticleBirdie`, `ParticleSmog`, and `ParticleConfetti`. `SmallSpark` occurs only in its own class. A full original XML scan finds no root or sprite `PlaceObject*` referencing symbol129 either. Thus it is archived/convertible, but there is no evidence for displaying it on a wall, net, or ground contact. Sound39 (`whipcrack2_01`) and sound44 (`birdiehithard`) similarly have no recovered runtime call or timeline sound reference.

The animation already present in H5 is the net's 24-frame ripple, symbol330. Birdie net-top or net-side collision calls `net.play()` without rewinding (`§_-24§.as:158`, `:176`); `Symbol44hsrthtr.as:15` stops on frame1 after wrapping. There is no accompanying spark or net-hit sound in those callsites. H5 implements this through `simulation.ts:197` and the net draw frames. Wall and ground physics do not create sparks or impact audio; scoring does create `ding`.

### BigSpark: successful shot, including serve, not merely a swing

`§_-24§.as:45` is the authoritative launch function. While `PlayState.pointActive` (`§_-3P§`) is true, it updates shot velocity and creates `BigSpark` at the **birdie's current x/y**, appended directly to the current PlayState. It rotates the spark to the launch direction (`:58`, `:59`). The branches for serve, underhand, and `abs(direction) <= 80` set scale0.6, but `:72` then unconditionally overwrites both scales with **0.3**. Reproduction should preserve the executed final value, not infer that these branches produce large sparks.

The same function plays `birdiehit.mp3` unless the third argument equals `"nosound"` (`:73`). Common `serveBirdie()` calls it with `"serve"` (`§_-h§.as:314`); successful overhead calls it with the default argument and underhand uses `"underhand"` (`:351`). Each accepted contact disables the current contact latch before launch (`:330`, `:332`), so one swing cannot repeatedly generate flashes for the same contact window. Toaster serve passes `"nosound"` and then plays `toasterpop.mp3` (`override.as:83`); it **still creates BigSpark**.

The compiled symbol278 has **25 exported frames**, not22 (`original.xml:77804`). `BigSpark.as:12` installs the script for frame22, and `:31` stops and removes it on that frame. Frames23–25 are recoverable art, not normally visible gameplay. Do not use all25 as a looping H5 effect. Copy the original clip clock/registration; avoid treating `22/60` as a measured native Flash lifetime. `bobby/§ null§.as:95` sets stage-add frame1 with clock0; custom playback uses `floor(clock / frameDuration)+1` and runs frame scripts during advancement (`:63`). New callbacks appended during the manager's callback loop may be processed in the same original ENTER_FRAME (`§_-0v§.as:123`, `:141`).

### ParticleBirdie: yellow star/scribble tail

After gravity, damping and movement, Birdie recomputes direction and speed (`§_-24§.as:206`). **Before wall/net/ground resolution**, if speed>50 it performs a percent chance `speed*100/1400`; success calls the emitter **twice** (`:209`, `:213`). Each is appended to PlayState's `false` container at the current birdie x/y (`:182`). The percent helper is exactly `Math.random()*100 < percentage`, with no explicit clamp (`§_-3e§.as:217`): speeds>=1400 always emit a pair. Emission is per original game-frame callback, independent of display resolution and dt; it is not one particle per30Hz snapshot or per browser RAF.

Source initialization and update (`ParticleBirdie.as:29`, `:41`):

- Direction uniform0..360; speed uniform1..3; spin uniform20..40; scaleVar uniform0.85..0.95; initial rotation uniform0..360. Initial runtime scale is1; symbol245 already contains a child scale0.3262329.
- Velocity convention is `(cos((dir-90)*π/180), sin((dir-90)*π/180))*speed` (`§_-3e§.as:259`); no inherited shuttle velocity/direction.
- Each callback: x/y += dx/dy *30*dt; rotation += spin*30*dt.
- Each callback: scales *= `pow(scaleVar, 0.5)` **without dt**. At60Hz this equals the smog formula below, but at another rate it does not. Fixed60Hz cosmetic stepping preserves this source quirk. Remove when scale<=0.1, or scale>1.
- It is the actual yellow angular star/scribble shape243 through sprite244, not a new smooth glow line or generic five-point star. Symbol245 has a source blur1.399993896484375 in each axis.

Source keeps updating the birdie after a point until the next serve resets it, so decaying trail can continue during the1.5s point interval. The source emitter is not explicitly gated by pointActive. H5 should not accidentally stop an already alive particle merely because score changed.

### ParticleSmog: Robot and Toaster emitters

Robot creates one smog particle with25% probability each character update (`§_-5G§.as:134`) at `x + random(-5,5), y`, in PlayState's `_-37` container (`:91`). Toaster uses the same25% emission at `x + random(-5,5), y-60` (`override.as:94`, `:117`). The emission check is outside Robot's `!matchEnded` branch; Robot continues smoke and source bobbing after result. Toaster also continues its unconditional smoke check. It is not a movement-only effect.

Initialization/update (`ParticleSmog.as:29`, `:41`): direction145..215, speed2..4, spin20..40, scaleVar0.85..0.95, initial rotation0..360; convert dir through the same `dir-90` convention. This produces predominantly **downward** drift in Canvas/Flash positive-y coordinates; changing it upward would change original behavior. x/y and spin use30*dt; shrink uses `pow(scaleVar,30*dt)`; remove at scale<=0.1. Runtime scale starts1. Symbol242 contains child scale1.7103119 and original blur11×11. Gray source shape240 is related to the tail scribble geometry, not a generic circle/smoke texture.

### ParticleConfetti: exact callsite and celebration lifecycle

`PlayState.§_-0A§()` appends one confetti directly to PlayState with x uniform0..stageWidth and y=-10 (`§_-u§.as:163`). Its only caller is `handleEnterFrame` (`:674`): when private celebration flag`_-42` is true, perform chance70 and emit **one**. At60Hz the expectation is42 particles/sec, not a fixed count/burst; probabilities remain source probabilities, not guaranteed emission counts.

Flag activation/reset is explicit:

| Original condition | Source behavior |
| --- | --- |
| Human wins single-player game (left score>=7) | Set matchEnded and celebration=true; `cheer.mp3`, result message`You Win`, `§_-u§.as:592` |
| Human loses single-player game (right score>=7) | Set matchEnded; `sigh.mp3`, message`Good Try`; **do not set celebration**, `:608` |
| Either side wins local multiplayer | FinishOverlay(1), matchEnded=true, celebration=true, `cheer.mp3`, `P1 Wins`/`P2 Wins`, `:625` |
| Multiplayer rematch | Reset scores, celebration=false and matchEnded=false, `:175` |
| Next single-player level | Reset celebration=false and scores, `:194` |

Celebration continues while the PlayState stays active; there is **no confetti end timer**. MatchEnded does not stop `PlayState.handleEnterFrame` and its effect generation (`:655`). The callback comes from the global ENTER_FRAME manager (`§_-0v§.as:70`, `:117`, `:123`), not from a result timer or score-change event. Unlike current H5 `ClassicSimulation.update()` (`simulation.ts:141`), original terminal results do not freeze all scene callbacks. Online result retention/leave can define H5 scene lifetime, but its presentation must keep a cosmetic clock active after authoritative score/result freezes.

ParticleConfetti initialization (`ParticleConfetti.as:26`): dx uniform1..4, dy uniform3..6, initial x/y as above. Color uses three **inclusive integers0..256** (helper`§ else§(...,true)` at`§_-3e§.as:39`), via `RGB.getUint()`/ColorTransform. Preserve/document this source edge; normalizing to0..255 alters the random distribution. `RGB.as:59` hands offsets to Flash's color getter, so the exact256 edge must be tested or stated as a compatibility limitation rather than guessed.

The color transform applies to **`this.body.body`**, not the complete filtered outer clip (`:32`, `:33`). x +=dx*30*dt; y +=dy*30*dt. Each callback has1.6666% chance to reset dx to1..4, then50% chance to negate it (`:41`). There is **no source spin**. Remove when `y + height/2 > stage.stageHeight` (`:49`), with world height426. The square is shape279 through sprites280/281; the outer symbol282 applies bevel5×5 at45° distance5 strength0.26953125 and black glow2×2 strength0.796875. A blanket tint of the final raster also tints the filters and does not reproduce the source transform hierarchy.

### Layer order and coordinates

`§_-2W§.as:18` uses `parent.addChild()` (append), then assigns x/y. Full original PlayState timeline is symbol344 (`original.xml:74653`); resolved frame1 placements:

| Depth | Symbol / instance | Meaning / original transform |
| --- | --- | --- |
| 1,3,6,8,10 | 310,312,314,315,318 | Base court art currently exported as one background |
| 12 | 330 / `_-3m` | Net; transform scale1.4571533×1.3813324, origin317.25,374.45 |
| 17 | 332 / `_-4P` | Dynamic score/result TextField; origin250.05,17; red font331 height31 |
| 18,20 | 334 / `switch`,`_-2S` | Two static court markers, positioned at net.x±125 by`§_-u§.as:123` |
| 22 | 114 / `_-37` | Smoke container |
| 24 | 114 / `_-i` | **Both** players; left appended first, right second (`:347`, `:362`); runtime scales+1.25 /-1.25 x, +1.25 y |
| 30 | 114 / `false` | Trail particles |
| 32 | 114 / `_-0s` | Moving birdie (`:332`) |
| appended to PlayState | BigSpark, intro/result overlays, confetti | Above timeline children; relative z-order follows actual append sequence |

All empty containers114 have original translation(-0.05,0), otherwise identity. The source passes birdie/character parent-local x/y into those containers; a stage/global reconstruction must account for that0.05px if seeking exact source offsets. BigSpark/confetti appended directly to PlayState do not inherit player1.25 scale. Speech bubbles are appended **inside a player**, so inherit its parent scale but explicitly cancel mirrored text orientation.

Current renderer order is background→players→net→birdie (`renderer.ts:81`), so net already differs from the original depth order. An effect integration should explicitly use background→net→score/markers→smoke→players→trail→birdie→ordered transient foreground overlays, with source originals' actual score/marker depths if exporting them separately. Avoid putting smoke above characters or the tail above the moving shuttle. Appended foreground effects and UI are not universally separated: e.g. confetti created after FinishOverlay is above it, whereas an earlier spark is below a later overlay. Preserve event creation order where overlapping matters.

### Scoring, intro/result UI, and other active presentation

Original award function `§_-u§.as:562` checks pointActive once, plays `ding.mp3`, clears pointActive, increments winner's score and assigns that side the next serve. First score to7 wins; **no win-by-two/deuce rule**. A nonterminal point schedules `setupServe()` after1500ms (`:622`, `:644`). Original uses `setTimeout`, whereas current authority intentionally uses the fixed simulation point timer. Replicating visuals must not transfer authority to browser timers.

The original HUD displays`left - right` every game callback while matchEnded=false (`:650`), then retains the final message. No distinct score-popup particle/flash or score animation is found. Static symbols335–338 are also in the original scene, but not active effect classes.

Intro symbol255 (`§_-2P§.as:9`) is centered in stage by`§_-u§.as:209`. It contains selected character names and Exhibition / campaign round name; it stays2s then alpha decreases3*dt until removed (`§_-2P§.as:31`, `:79`). Text selection chooses different embedded TextFields for one-line versus multiline names. It does not block the whole original gameplay callback.

AI opening speech uses symbol97. `§_-h§.as:165` schedules a random greeting after1s; `:170` schedules explicit mirror-character text. Bubble is child of the character at x=-20*sign(scaleX), y=-70 with text unmirroring (`:129`); Timmy overrides y=-47 (`§_-2Q§.as:45`), Toaster y=-65 (`override.as:57`), Nadia substitutes opponent-dependent wording (`§_-51§.as:46`). `§var§.as:14` prepends a newline for one-line text; `:27` removes after3s. Important: base score-win/loss taunt hooks are empty or contain empty chance25 branches (`§_-h§.as:138`), and no subclasses override them. Having phrase arrays in characters does **not** establish active taunts on every point/win/loss. Greetings are campaign source behavior, not multiplayer match speech (`§_-u§.as:466`, `:481`), and are excluded from the confirmed online-only implementation.

Original result variants:

- Multiplayer: `FinishOverlay(1)` immediately at stage center on victory; alpha starts0, fades in4.5*dt, frame1 has rematch/more buttons (`FinishOverlay.as:30`, `:38`, `:80`). Rematch resets game and fades this overlay out at4.5*dt. Source frame2 is next-level UI, not the multiplayer panel. This is a relevant source result style for online mode, with project-owned rematch/leave behavior.
- Single-player early-round win: FinishOverlay(2) with next-level action. Campaign final win: schedules after1500ms, black screen transition fade-in1s/out0.7s, then `WinOverlay(paperNum)` (`§_-u§.as:492`, `:544`, `:596`). WinOverlay starts stopped, calls play150ms later, chooses character-specific newspaper body frame1..9, stops at frame53 (`WinOverlay.as:39`, `:46`, `:139`). XML symbol94 includes **StartSound47 at frame53** (`original.xml:89183`), in addition to the immediate victory cheer. Generic SVG frame playback does not execute that sound tag.
- Single-player loss: schedules after1s, black transition fade-in0.37s/out0.47s and `DeathScreen(characterClass)` (`§_-u§.as:550`, `:613`). The loss art selects nested characterSet1..9 (`DeathScreen.as:40`). Source class attempts outer frame2 for an ad variant although recovered symbol309 has only1 frame: do not invent a missing second loss scene. External ads/analytics are not battle visuals and must stay outside the H5 runtime.
- `TransitionBase.as:30`, `:42` renders a black stage-sized rectangle with timed alpha and callback; this is source transition code rather than a missing bitmap.

### Audio: exact symbol-to-file mapping and triggers

All12 original DefineSound tags are MP3 (soundFormat2). Each complete export below is byte-identical to XML `soundData` **after removing its first two SWF MP3 seek-sample bytes**. This was checked for all12 by comparing bytes; it is a practical way to extend the production converter without depending on ignored artifacts. Retain seek-sample metadata if recording audio timing. The archive's `-1.wav` is not one of these12 gameplay sound definitions.

All paths in this table have prefix`artifacts/flash-full-archive/export/sounds/`:

| ID | Original class/name and export filename | Trigger/evidence |
| --- | --- | --- |
| 38 | `whoosh.mp3` → `38_whoosh.mp3.mp3` | Accepted swing **start**, even if it misses; common guard `!swingLatched && currentSwing.frame==1`, `§_-h§.as:260` |
| 45 | `birdiehit.mp3` → `45_birdiehit.mp3.mp3` | Successful launch/contact except nosound, `§_-24§.as:73`; includes normal serve |
| 40 | `toasterpop.mp3` → `40_toasterpop.mp3.mp3` | Toaster successful serve release replacing birdiehit; whoosh still happens at swing start, `override.as:83` |
| 43 | `ding.mp3` → `43_ding.mp3.mp3` | One per active point award, `§_-u§.as:562` |
| 47 | `cheer.mp3` → `47_cheer.mp3.mp3` | Human single-player win, either multiplayer winner; second timeline trigger at campaign WinOverlay.frame53 |
| 42 | `sigh.mp3` → `42_sigh.mp3.mp3` | Single-player human loss only, `§_-u§.as:617` |
| 46 | `backgroundmusic.mp3` → `46_backgroundmusic.mp3.mp3` | Started when entering instruction scene, fades in; also restarts at campaign final, `§_-R§.as:25`, `§_-u§.as:431` |
| 41 | `titlemusic.mp3` → `41_titlemusic.mp3.mp3` | Title/menu looping music, `§_-1K§.as:31`, `§_-4o§.as:30`; faded out on entering instruction scene |
| 19 | `guncock.wav` → `19_guncock.wav.mp3` | Compiled button hover state sounds; match sponsor343, result buttons262/265/268, other buttons |
| 20 | `shotgun.mp3` → `20_shotgun.mp3.mp3` | Escape→menu in-match `§_-u§.as:168`; compiled primary button press transitions |
| 39 | `whipcrack2_01.mp3` → `39_whipcrack2_01.mp3.mp3` | Archived class/asset, **no active use found** |
| 44 | `birdiehithard.mp3` → `44_birdiehithard.mp3.mp3` | Archived class/asset, **no active use found**; do not automatically assign it to smashes |

Compiled button sound transitions are not AS calls. XML has DefineButtonSound for FinishOverlay buttons262/265/268 with `[0,19,20,0]` (`original.xml:77981`, `:78042`, `:78109`); fields1/2 are over-up hover and over-up→over-down press transitions. Match sponsor343 has only hover19 (`:74650`). DeathScreen buttons68/291 have19+20, sponsor307 hover19; WinOverlay primary68 has19+20 and sponsor36 hover19. If original button visual/feedback is migrated, recreate local DOM/pointer hover/press audio deliberately; do not synchronize UI click sounds as battle authority. No original jump, footstep, wall-impact or net-impact sound call is found.

`§_-3h§.as:93` plays named effects at volume1 (or0 while muted) with one play, separate from long music loops9999 (`:69`, `:81`). Its last-channel reference is overwritten, but previous SFX channels are **not stopped**, so whoosh and hit can overlap; a single restart-only HTMLAudioElement is insufficient. M toggles game mute (`:181`), affecting the global mixer. Fade step code assumes30 in the divisor while called per native ENTER_FRAME (`:106`), so source fade timings also need compatibility caveats rather than inventing nominal durations. Browser audio should unlock from the already existing Start/Practice user gesture; keep a visible mute control, stop music on scene exit, avoid playing retained historical sounds after reconnect.

## Conversion and synchronization details

Continue with `effects-conversion-and-sync.md` for exact export paths, converter changes, journal/RNG recommendations and compatibility caveats. Both documents apply to the confirmed multiplayer-only scope; campaign findings are exclusion evidence.
