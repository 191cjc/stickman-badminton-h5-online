# Research: Flash 90302 characters, controls and animation geometry

- Query: Determine the original reachable character roster and unlocks, actual movement/jump/power semantics, controls, character-specific swing/serve/AI behavior, asset/timeline mappings, and gaps in the current H5 migration.
- Scope: internal; frozen recovered ActionScript, lossless SWF XML, full exports and current H5 source. No product source changes or runtime Flash execution.
- Date: 2026-10-13

## Findings

### 1. Reachable roster is smaller than the set of recovered character classes

The original has nine character classes, but class presence, slider art and telemetry branches do not establish that a character is selectable. Follow actual menu button bindings and callbacks:

| Original mode | Reachable character choices | Unlock behavior |
| --- | --- | --- |
| Local two-player (`multiplayer`) | Average Joe, Naughty Nadia, Hairy Harry, Flying Toaster, Pirate Pete, Top Hat Sam, The Red Dude | Seven choices available immediately; this menu does not read unlock progress. |
| Single-player campaign | Average Joe, Naughty Nadia, Hairy Harry, Robotron 3000 initially; Pirate Pete, Top Hat Sam, Flying Toaster, The Red Dude unlock later | Pirate at 1 campaign completion, Top Hat at 2, Toaster at 3, Red Dude at 4. |
| Little Timmy | Character class and preview exist, but no reachable selection callback in either of the two original menus | Do not call Timmy an original selectable character. |

Evidence:

- `reference/flash-90302/scripts/§_-2s§/§var §.as:63` binds seven character buttons plus start/undo; `:224`–`:256` maps the seven callbacks to Harry/Joe/Nadia/Toaster/Pirate/TopHat/Red Dude. No callback binds Robot or Timmy. Its Robot/Timmy preview branches (`:169`, `:197`) and Robot telemetry (`:107`, `:139`) are unreachable via those menu buttons.
- `reference/flash-90302/scripts/§_-2s§/§_-0E§.as:70` loads `SharedObject.getLocal("game").data.unlockLevel`; `:75` hides locked choices; `:81` explicitly enables Harry/Nadia, while Joe and Robot remain visible. `:85`, `:90`, `:95`, `:100` reveal Pirate/TopHat/Toaster/Red Dude at the four thresholds.
- Single-player bindings at `§_-0E§.as:106`–`:114` route Joe, Nadia, Harry, Toaster, Pirate, TopHat, Red Dude and Robot. Timmy's private callback at `:236` is never bound.
- `reference/flash-90302/scripts/ui/WinOverlay.as:53` normalizes absent progress to zero, increments it once, writes it back at `:66`, and shows the unlock names at `:68`–`:82`.
- `reference/flash-90302/scripts/§_-2s§/§_-u§.as:592` only opens the completion overlay after winning campaign level 5 (via the delayed `§_-2D§` call); an individual practice victory is not the original unlock trigger.
- Main menu routes to the single-player selector and versus selector at `reference/flash-90302/scripts/§_-2s§/§_-4o§.as:83` and `:89`.
- XML confirms actual placed menu buttons: `artifacts/flash-full-archive/original.xml:60470` (sprite424 versus) places seven choice buttons with IDs405,408,411,413,417,420,423, and no Robot448/Timmy button. `:59209` (sprite454 single) additionally places Robot448. This XML is the decompressed, frozen `reference/flash-90302/original.xml.gz` whose pinned hash is recorded in `SOURCE.json`.

The original does **not** have the present H5 app's separate free practice mode. Applying an unlocked original roster to AI practice, or offering Robot in online versus, is an H5 product adaptation, not reproduction of an original menu rule.

### 2. Correct multiplier meanings and source values

**Correction to the earlier conversation summary:** constructors assign fields in **movement, jump, power** order, not power/movement/jump. Base `§case §` controls movement (`§_-h§.as:540`, `:552`), `include` controls jump (`:366`, `:573`), and `§do§` controls shot power (`:337`, `:343`, `:347`).

| Character / source class | Parent sprite | Move (`§case §`) | Jump (`include`) | Power (`§do§`) | Constructor evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| Average Joe / `§_-18§` | 230 | 1 | 1 | 1 | `reference/flash-90302/scripts/§_-0V§/§_-18§.as:26` |
| Little Timmy / `§_-2Q§` | 196 | 1 | 1.15 | .96 | `reference/flash-90302/scripts/§_-0V§/§_-2Q§.as:28` |
| Naughty Nadia / `§_-51§` | 226 | 1.15 | 1.1 | .96 | `reference/flash-90302/scripts/§_-0V§/§_-51§.as:29` |
| Hairy Harry / `§_-0S§` | 233 | 1.1 | .9 | 1.05 | `reference/flash-90302/scripts/§_-0V§/§_-0S§.as:26` |
| Pirate Pete / `§_-2n§` | 221 | .89 | .9 | 1.1 | `reference/flash-90302/scripts/§_-0V§/§_-2n§.as:26` |
| Top Hat Sam / `§use §` | 169 | .89 | 1.25 | 1 | `reference/flash-90302/scripts/§_-0V§/§use §.as:26` |
| The Red Dude / `§_-5P§` (export label `SliderChamp`) | 236 | 1.2 | 1 | 1 | `reference/flash-90302/scripts/§_-0V§/§_-5P§.as:26` |
| Robotron 3000 / `§_-5G§` | 217 | .85 | 1.25 | 1 | `reference/flash-90302/scripts/§_-0V§/§_-5G§.as:40` |
| Flying Toaster / `override` | 178 | 1 | 1.15 | .96 | `reference/flash-90302/scripts/§_-0V§/override.as:39` |

The Red Dude is the actual menu name (`§_-0E§.as:329`); `Champ`/`Devil` are exporter/telemetry labels. Do not expose a newly invented character named Champ.

Shared original numeric rules (`reference/flash-90302/scripts/§_-0V§/§_-h§.as`): base walk225 (`:18`), jump impulse−400 (`:20`), gravity1200 (`:34`), power factor.9 (`:22`). Overhead speed = `1250 * 1.4 * power * .9` and direction = `(racket.rotation + 30) * facing` (`:335`–`:337`). Underhand speed = `(airborne ? 1150 : 1300) * 1.4 * power * .9` and actual launch direction is always `40 * facing` (`:341`–`:357`); an intermediate underhand rotation calculation is overwritten and must not become the actual direction. All ordinary serves use1485speed/±40degrees, independently of character power (`:314`–`:320`).

### 3. Original human controls; Space currently differs in H5

- Single-player keyboard characters accept A/← and D/→ for movement, W/↑ for jump, **S/↓/Space for hit** (`§_-h§.as:428`–`:461`).
- Original same-keyboard multiplayer splits P1 to A/D/W/S plus Space (`:463`–`:496`), P2 to arrows only (`:498`–`:531`); match setup applies input mode1/2 at `§_-u§.as:129`–`:130`.
- Obfuscated input-field mapping is proven by keycodes87/65/83/68 in `reference/flash-90302/scripts/bobby/§_-1Q§.as:156`–`:170`.
- Hit is latched until release (`§_-h§.as:584`–`:595`), and `swingMe` accepts only when not swinging and active clip at frame1 (`:264`). Repeated presses do not cancel an active action.
- Current H5 `src/client/input.ts:4` maps Space to **jump**, contrary to original. Its same controls for both computers are consistent with the project's online requirement, but restoring source Space→hit needs accompanying instructions/touch bindings and regression checks.

### 4. Robot controls must be migrated as a different logical-input model

`reference/flash-90302/scripts/§_-0V§/§_-5G§.as`:

- `humanControlHandler()` is deliberately empty (`:79`); this is not a keyboard-moving human with different multipliers.
- Stage MOUSE_DOWN calls `swingMe()` while match not ended (`:59`, `:83`–`:88`); remove listener on teardown (`:140`–`:143`).
- Every non-ended original frame changes bob offset by `.05`, reverses at±1, then applies `x -= (x - root.mouseX) / pow(1.4, 60*dt)` and `y -= (y - root.mouseY) / pow(1.4, 60*dt) + bob` when mouseY is finite and not5 (`:96`–`:115`). Save the resulting y before calling base movement/contact (`:116`–`:117`).
- Base stepping still applies court/serve x bounds. It does not clamp Robot y to the normal ground when `extends` is false. Do not copy Joe's grounded/y logic unconditionally.
- After match end, Robot bobs around saved y using step `.2`, bounds±4 (`:119`–`:133`). Cosmetic smoke continues with25% probability per original callback (`:134`–`:136`), created at `x + random(-5,5), y` (`:91`–`:94`).
- The placed extra held-ball layer `_‑4M` is hidden normally (`:58`), shown during serve (`:73`–`:76`), hidden on release (`:67`–`:70`). Its sprite214 contains shuttle100 and another shape102. Generic serve-layer handling would omit this shuttle or draw it twice.

For the source-faithful mode restriction recommended here, Robot is local practice only: add local logical pointer-target/click intent and viewport conversion without adding unused pointer fields to the online protocol. Convert CSS coordinates through the existing viewport offset/scale to the640×426 source coordinate system. Include bob state in local snapshots; release/focus loss must invalidate the target/click according to an explicit lifecycle rule. If a later product decision separately opens Robot online, that extension must transmit bounded **pointer target** and click edge as logical control, never client player position/velocity, and reuse the same smoothing in authority and local-player prediction. Derive side/seat from the authenticated socket; source side/serve clamps still apply.

### 5. Toaster is keyboard-controlled, bobs, and has a different serve

`reference/flash-90302/scripts/§_-0V§/override.as`:

- Inherits normal human controls (no humanControlHandler override).
- `jumpMe()` is empty (`:79`), **but human Toaster can still jump**: the inherited human handler directly sets `dy=-400*include`/`extends=true` (`§_-h§.as:571`–`:574`) without calling jumpMe. Only AI explicit jump calls are neutralized. Treating Toaster as unable to human-jump would introduce a new parity bug.
- Saves ground as bob baseline when added (`:51`–`:54`). Calls base stepping first (`:101`), then whenever AI-controlled **or** not jumping, updates bob by `.2`, reverses at±4, and writes `y = baseline + bob` (`:102`–`:115`). Human jumping retains the normal arc until grounded. This order also matters for contact location: base contact happens before the current callback's final bob y update.
- Smoke emits25%/callback at `x + random(-5,5), y-60` (`:94`–`:96`, `:117`–`:119`).
- `serveBirdie()` uses its own servePoint but same1485/±40 launch; supplies `"nosound"` to suppress the generic birdie-hit audio, then plays `toasterpop.mp3` (`:83`–`:91`). The shot still triggers the Birdie launch effects; nosound does not disable sparks.
- **Toaster serve timeline is27frames with release at frame8**, source `reference/flash-90302/scripts/Symbol30copy9.as:36`, `:44`, `:49`; current Joe's23frames/frame7 is wrong for this character.

### 6. Exact source asset and timeline mapping

All parent character sprites have40frames and body labels `normal=1`, `backward=11`, `forward=21`, `jump=30`. Parent gotoAndStop changes body instances while independently clocked swing clips continue. The scene creates players with runtime scale±1.25/1.25 (`§_-u§.as:347`–`:365`). Never change simulation units to enlarge the canvas.

| Family | Serve / Underhand / Overhead symbols | Timeline callbacks |
| --- | --- | --- |
| Joe, Nadia, Harry, Pirate, TopHat, Red Dude, Timmy | 135 /137 /140 | Serve23frames release7; underhand19 contactEnd10; overhead27 contactEnd15; final callback switches overhead; frame1 stops. |
| Robot | 198 /174 /197 | Same23/19/27 timing and7/10/15 callbacks, different placements/racket art. |
| Toaster | 172 /174 /171 | Serve27frames release8; underhand19 contactEnd10; overhead27 contactEnd15. |

Frame-script evidence: `Symbol30copy3.as:36`, `Symbol30copy2agr.as:36`, `Symbol30copy2ragdag.as:36`, `Symbol30copy6.as:36`, `Symbol30copy5.as:36`, `Symbol30copy4.as:36`, `Symbol30copy9.as:36`, `Symbol30copy7.as:36`, all under `reference/flash-90302/scripts/`.

Custom clip clock evidence: `reference/flash-90302/scripts/bobby/§ null§.as:56` sets gotoAndStop clock to currentFrame/fps; stage addition sets it to0 (`:95`–`:102`), and custom playback walks frames (`:63`–`:74`). Existing H5 already preserves these semantics for Joe; generalize its metadata, not elapsed-duration swing approximations.

Adult human sprites230/226/233/221/169/236 share identical mounted serve/underhand/overhead geometry and underhand/computer zones. Their body art differs. Timmy shares swing symbols but mounts them1pixel left and18pixels lower, with lower selection zones/servePoint; his short body also uses different animation sprites. Robot and Toaster change both art and geometry.

| Family | Serve mount `(a,d,x,y)` | Underhand mount | Overhead mount | Unscaled explicit servePoint |
| --- | --- | --- | --- | --- |
| Adult human | `(.9380493,-.9380493,7.75,-53.05)` | same as serve | `(.9380493,.9380493,7.75,-51.65)` | `(28.45,-22.25)` |
| Timmy | `(.9380493,-.9380493,6.75,-35.05)` | same as serve | `(.9380493,.9380493,6.75,-33.65)` | `(27.45,-4.25)` |
| Robot | `(.9457245,-.9457245,-1,2)` | `(.9457245,-.9457245,0,0)` | `(.9457245,.9457245,0,0)` | `(21,36.45)` |
| Toaster | `(.9457245,.9457245,0,-53)` | `(.9457245,-.9457245,0,-53)` | same as serve | `(22,-86.55)` |

Adult underHitbox wraps shape151 via sprite152 at scale1.1691132/x17.25/y−36.25; computerHitbox wraps153 via154 at the same mount. Timmy uses x16.25/y−18.25. Toaster under zone is adult, computer zone x5.25/y−36.25. Robot under zone wraps shape215 via216 at scale1.0062256/x4.1/y30.7; computer zone wraps153 via154 at scale1.0062256/x4.1/y12.7. As with existing Joe, derive actual zone contours and transformed racket hitbox AABBs from SWF precision rather than sprite image bounds.

All examined racket `hitbox2` descendants terminate at collision shape109. Actor mount × racket placement × body × hitbox × shape must be composed per family/frame. A shared terminal hit shape does not mean equal mounted racket geometry. `tools/flash-assets/extract.py:142`–`:170` shows the current Joe-only derivation to generalize.

Explicit serve coordinates are added unscaled to player x/y in original `§_-h§.as:317` and `override.as:86` despite player draw scale1.25. Apply facing sign to x offset only; do not introduce scale1.25 here.

Body rendering extraction must preserve every visible body placement and color transform in depth order, not hardcode Joe depths11/13/15 for all roles:

| Role | Body-only placements at normal; backward/forward/jump changes |
| --- | --- |
| Joe | sprites142,144,229; movement replaces144 with163/166; jump removes legs142 and uses168 |
| Nadia | same basic body, head225 |
| Harry | same basic body, head232 |
| Pirate | same basic body, head219 **plus extra shape220 at depth21**; keep it |
| TopHat | same basic body, head150 |
| Red Dude | same basic body, head235 |
| Timmy |142,190,193,195; backward/forward use188/187 (8-frame clips), jump190; accessory195 at depth17 |
| Robot | body213 at depth7 plus separately controlled held-ball214 at depth24; all four body labels use the same body placements |
| Toaster | body177 at depth7; all four labels use the same body placements |

Frozen XML entry anchors (`artifacts/flash-full-archive/original.xml`): Joe230 `:80076`, Nadia226 `:80210`, Harry233 `:79942`, Pirate221 `:80448`, TopHat169 `:81795`, Red236 `:79808`, Timmy196 `:81391`, Robot217 `:81023`, Toaster178 `:81689`; swing135 `:78861`,137 `:79017`,140 `:79166`,198 `:80594`,174 `:80691`,197 `:80781`,172 `:81539`,171 `:81575`; collision zones151/152 `:79280`/`:79346`,153/154 `:79355`/`:79412`,215/216 `:80911`/`:81014`.

Reference exports are present under `artifacts/flash-full-archive/export/sprites/DefineSprite_<ID>_<class>/`, e.g. `DefineSprite_217__-0V._-5G`, `DefineSprite_178__-0V.override`, `DefineSprite_230__-0V._-18`, `DefineSprite_169__-0V.use%20`, and the eight named swing directories. These are reference renders including originally invisible/action-controlled pieces: use source-aware filtered extraction for production, not direct wholesale parent SVG screenshots.

### 7. AI differences come from campaign configuration and actor geometry

Original campaign opponent order and tuning live in `reference/flash-90302/scripts/§_-2s§/§_-u§.as:368`:

- Levels1–4: Nadia, Harry, Pirate, TopHat; default fifth entry Red Dude is replaced with the player's own role for final rival (`:429`–`:438`). A Robot player instead receives Toaster as final opponent.
- If an early opponent matches the player class, substitute Joe (`:448`–`:450`).
- AI constructor character stats are **overwritten**: levels1–4 move1.1/jump1/power1, level5 move1.15/jump1/power1 (`:387`–`:443`, applied at `:460`–`:462`). Robot-player opponents receive an extra1.1move factor (`:452`–`:454`).
- Error threshold and overhead preference are100/90/65/50/35 by stage, applied at `:463`–`:464`; each successful contact raises current threshold by7 (`§_-h§.as:333`), and new active rally resets it to initial−7 (`:673`).
- Generic AI base is `§_-h§.as:598`–`:751`: return-home after1s, predictive landing horizontal target, .5s swing interval, source contour hit testing, occasional jumps and.2/.3s serve callbacks.
- Robot-player-specific landing-distance branches occur at `§_-h§.as:640`–`:646`; current H5 omits them. Toaster AI retains different computer zone/body bob and empty jumpMe; it is not Joe AI with a painted sprite.

Current `src/shared/classic/ai.ts:11` already migrates the ordinary right-side AI algorithm with simulation-clock timers. `src/shared/classic/simulation.ts:93` keeps two Joe players and offers only normal/boss threshold100/35 and move1.1/1.15. These two presets align with first/final source parameter magnitudes but do not represent a complete original campaign.

### 8. Current-H5 gap mapping and bounded migration recommendation

| Gap | Current owner/evidence | Needed change |
| --- | --- | --- |
| No selected character ID or registry | `src/shared/classic/player.ts:17`; all multipliers1 at`:25`; `simulation.ts:49` creates two Joe actors | Source-backed character definitions; immutable chosen role per room seat; player state includes role and required controller state. |
| One global geometry/timeline | `src/shared/classic/assets.ts:3`,`:23`; `player.ts:158`,`:214`; `simulation.ts:217`,`:276` | Registry by actor/family; adult human geometry can be shared when XML proves equality; derive Toaster/Robot separately. |
| One body/swing manifest | `src/client/renderer.ts:18`,`:109`; hardcoded extraction `tools/flash-assets/extract.py:208`–`:216` | Per-role art, correct body/additional layers and independent clips; distinct Toaster release metadata; include Robot's conditional held-ball. |
| Keyboard-only movement and wrong original Space binding | `src/client/input.ts:4`; `player.ts:263` | Source keyboard map and pointer target/click controller when Robot supported; viewport conversion and explicit bounds at wire boundary. |
| No floating/bob state | `src/shared/classic/player.ts:17`,`:287` | Serializable bob/baseline and source update order, shared with Prediction; Toaster human/AI jump distinction. |
| No source character select UI | `src/client/main.ts` coordinates scenes; protocol currently queue/cancel without role payload | Choose one of the seven versus roles before queue; server validates allowed IDs and freezes each role at match creation; no client-selected seat/opponent/state. |
| Practice present but now excluded | `simulation.ts:93`; `ai.ts:11`; `main.ts:281` | Remove live practice/AI mode under latest scope; source AI/campaign evidence above remains research, not an implementation requirement. |

Final user-confirmed scope on 2026-10-13: **only original two-player battle converted to online**; no campaign and no AI practice. Restore the seven actual original-versus choices, exact source art/multipliers, source Space→hit, Toaster27/frame8serve/pop/smoke/bob/human-jump rules, shared collision/authority/prediction and applicable battle effects. All seven are immediately selectable, matching source versus. Robot, Timmy and single-mode selection are excluded. Earlier practice/AI recommendations are superseded; there is no remaining unlock/product-choice question. Keep all source classes and AI/campaign data in the frozen complete archive without migrating these excluded features.

## Files found

- `reference/flash-90302/scripts/§_-0V§/*.as` — common actor and nine character subclasses.
- `reference/flash-90302/scripts/§_-2s§/§var §.as`, `§_-0E§.as`, `§_-u§.as` — versus selection, single-player selection/unlocks, match/campaign ownership.
- `reference/flash-90302/scripts/ui/WinOverlay.as` — completion progress and unlock messages.
- `reference/flash-90302/scripts/Symbol30*.as` — attack/serve frame scripts.
- `reference/flash-90302/scripts/bobby/§_-1Q§.as`, `§ null§.as` — physical key translation and custom timeline clocks.
- `reference/flash-90302/original.xml.gz`; `artifacts/flash-full-archive/original.xml` — frozen lossless placement/shape/timeline evidence.
- `artifacts/flash-full-archive/export/sprites/` — full per-symbol SVG reference exports.
- `src/shared/classic/{player,ai,assets,simulation}.ts`, `src/client/{input,renderer}.ts` — existing Joe migration and runtime gaps.
- `tools/flash-assets/extract.py` — current selected art/geometry extraction, source precision and transform patterns.

## External references and versions

- User-confirmed original landing page: https://www.4399.com/flash/90302.htm . No new network downloads were needed for this research.
- Source frozen at SWF SHA256 `cab8a824c54af3a0b9454ef30fcbcabc532931f2a96717239fabd58f57e59912`; XML SHA256 `3c6172e89a9d540fdf976484cc3765190368cdf5f49838fb6f82e9b4bb6861d0`.
- Full exporter is JPEXS26.3.0; original stage640×426/60fps. Recovered AS/converted SVG are evidence, not the author's editable FLA or an open-source licence.

## Related specs

- `.trellis/spec/shared/simulation.md` — shared fixed-step source geometry, custom clocks, authority and source-evidence limits.
- `.trellis/spec/shared/protocol.md` — strict logical input, versioned transport, completed-step acknowledgements.
- `.trellis/spec/frontend/state-management.md` — local-character-only prediction and remote interpolation.
- `.trellis/spec/frontend/event-lifecycle.md` — input release/focus/reconnect and pointer capture.
- `.trellis/spec/guides/code-reuse-thinking-guide.md`, `cross-layer-thinking-guide.md` — frozen-source boundary and producer/parser/consumer tracing.
- `.trellis/spec/deployment/source-archive.md` — immutable full-source archive, resource completeness versus runtime parity.

## Caveats / Not Found

- This is static source/XML research; no unchanged SWF was executed and no browser or real dual-computer gameplay was tested. Per-frame native Flash scheduling and body animation continuity still require visual/runtime comparison.
- Nine classes and eight Slider exports do not prove nine/eight selectable roles. Both menu callback graphs and placed buttons were inspected; Timmy is not reachable, Robot is absent from versus.
- Toaster `jumpMe` no-op is frequently misread: inherited human jump bypasses it. This must have a source-derived regression test.
- Do not blindly export parent-frame images: reference SVGs may include hidden hit zones, inactive swing clips and held balls whose original visibility was controlled by code.
- Source human parent repeatedly gotoAndStop's body labels while nested clips own clocks; exact nested idle/jump/body animation behavior was not runtime measured here. Current H5 intentionally renders idle/jump as one frame; expanding all body clocks is separate from transporting correct swing state.
- Source actor dialogue arrays exist; several generic score/win/loss methods are empty (`§_-h§.as:138`–`:157`). Do not invent automatic trash-talk emission merely from unused arrays.
- No campaign progress mechanism exists in current H5. Restoring original single-player locks requires an explicit campaign/progress scope; do not add server databases or locks to online versus merely to mimic single-player SharedObject persistence.
