# Research: manual swing modifiers and binding migration

- Query: Pressure-test confirmed mapping A (J auto hit/serve, K jump, W+hit overhead, S+hit underhand), six remappable actions, pending-edge provenance, strict protocol5 input, source swing gates and migration from saved v1 controls.
- Scope: internal, planning only. Owns this research file; no code, tests, task activation, other research or specs changed.
- Date: 2026-10-22

## Findings

### Recommendation and confirmed scope

Use six browser-local remappable actions: `left`, `right`, `jump`, `hit`, `overhead`, `underhand`. The last two are **modifier holds**, not swing buttons. Defaults:

| Action | New defaults | Meaning |
| --- | --- | --- |
| left | A / ← | Existing horizontal movement |
| right | D / → | Existing horizontal movement |
| jump | K / ↑ | Existing jump |
| hit | J / Space / ↓ | Auto hit or original dedicated serve |
| overhead | W | Hold while a new aggregate hit begins to request original overhead clip |
| underhand | S | Hold while a new aggregate hit begins to request original underhand clip |

Capture the swing choice on each aggregate hit false→true transition. Exactly one held modifier selects its clip; neither or both selects `auto`. Send required `swing:'auto'|'overhead'|'underhand'` on protocol5 inputs, with `swing:'auto'` whenever `hitPressed:false`. Retain the existing jump fields and their existing packet-time meaning. Do not introduce a hit-time jump wire bit or synthesize jump edges as part of this feature.

The selected swing is applied only when the original shared player logic accepts a fresh swing start. Serving always selects the original serve, including W+J and S+J. Original recovery, contactEnable, latches, animation lengths, source geometry and shot power remain authoritative. A manual selection can miss; it is not a hit guarantee, trajectory-direction command or recovery cancel. The prior shuttle-speed design remains separate and compatible.

### Source files and contracts

| File / anchor | Relevant behavior |
| --- | --- |
| `src/client/controls.ts:2` | Current four-action list drives Action and KeyBindings types. |
| `src/client/controls.ts:16` | Existing v1 key, defaults W/up for jump and Space/S/down for hit. |
| `src/client/controls.ts:69` | cloneBindings manually enumerates four fields; adding ACTIONS alone will lose modifier arrays here. |
| `src/client/controls.ts:88` | Strict bounded parser requires exactly four arrays, unique supported physical codes and no cross-action duplicates. |
| `src/client/controls.ts:124` | Storage getter/read/parse failures return detached defaults; save failure retains live settings. |
| `src/client/controls.ts:152` | Existing binding conflict and per-action three-key limit can apply to modifier rows. |
| `src/client/input.ts:35` | Source map, plus pending jump/hit source-kind Sets, merges keyboard/pointer/gamepad. |
| `src/client/input.ts:46` | Native keyboard guards suppress repeat, interactive targets, browser shortcuts, IME and disabled gameplay. |
| `src/client/input.ts:89` | Touch buttons own pointer IDs and logical actions, independent of keyboard codes. |
| `src/client/input.ts:123` | clearGamepad removes only that source and its unsent provenance; surviving keyboard/touch holds remain. |
| `src/client/input.ts:130` | setSource creates edges only on aggregate false→true; adding another alias/device while held is not another hit. |
| `src/client/input.ts:144` | logicalKey currently includes only held/edge booleans and move; selected swing must join it. |
| `src/client/input.ts:164` | peek is non-consuming; commit clears pending edges only after a successful synchronous send. |
| `src/client/input.ts:182` | toIntent spreads the logical frame, then sets pausePressed false. |
| `src/client/main.ts:249` | One paced scheduler polls pad → peek → mirror → send → successful commit/seq/prediction. |
| `src/client/gamepad.ts:55` | Detach/disable/rearm calls input.clearGamepad, not full Input.release. |
| `src/client/controls-settings.ts:112` | Settings clones preferences and constructs all rows from ACTIONS; reset uses defaultControls. |
| `src/client/controls-settings.ts:130` | Existing status element can display migration conflicts without saving an extra preference field. |
| `src/client/perspective.ts:34` | worldInput flips only move and spreads other fields; overhead/underhand remain vertical clip semantics for either side. |
| `src/shared/types.ts:5` | PlayerIntent owns logical input plus internal hitJump used for burst protection. |
| `src/shared/protocol.ts:16` | Current wire input has no swing field. |
| `src/shared/protocol.ts:95` | Exact-key input parser rejects unknown/internal fields; enum addition and protocol bump must be coordinated. |
| `src/server/service.ts:382` | Pending server packet queue is already bounded to 120. |
| `src/server/service.ts:521` | Latest packet owns held state/seq, any packet can own jumpPressed, newest hit edge owns hitJump. |
| `src/client/prediction.ts:95` | Own-actor prediction repeats the same latest-held/newest-hit coalescing and edge-owner ledger. |
| `src/shared/classic/simulation.ts:147` | setIntents preserves unconsumed booleans across sub-frame callers, but currently spreads only the newest intent payload. |
| `src/shared/classic/simulation.ts:188` | clearEdges consumes hitPressed/jumpPressed and deletes internal hitJump once a real frame runs. |
| `src/shared/classic/player.ts:123` | Auto swing selection serves first, otherwise uses restored role-specific zones, ball descent and near-net override. |
| `src/shared/classic/player.ts:150` | startClassicSwing rejects point-inactive, recovering/swinging or non-frame1 states before choosing a clip. |
| `src/shared/classic/player.ts:249` | Shared authority/prediction step starts on hitPressed or unlatched held hit, and then latches. |

### Bounded local hit payload and provenance

Keep the existing pending jump Set. Replace the pending hit Set with an insertion-ordered `Map<SourceKind,SwingChoice>` where SourceKind remains exactly keyboard/pointer/gamepad. This retains at most three entries, with no growing counter, list or per-event history.

On a fresh aggregate hit rise in `setSource`:

1. Update the source map, preserving existing OR semantics and edge detection.
2. Read only held **keyboard modifier actions** at that instant. Use their remapped actions, not literal event codes. Both modifiers held means auto.
3. `pendingHit.delete(kind); pendingHit.set(kind, capturedChoice)`. Replacing the same kind moves it to the end, so the map represents each kind's latest pending hit in recency order.
4. `peek` takes the final surviving map value if any; otherwise uses auto. It still reports current aggregate hitHeld independently. Ordinary keyup/pointerup/modifier release does not remove pending records.
5. Include emitted `swing` in logicalKey so removing a newer pad-owned choice and revealing a different retained keyboard choice triggers the existing scheduler even when edge booleans/held state do not change.
6. On successful synchronous send/commit, consume the pending hit records represented by that accepted frame, just as existing commit consumes collapsed hit edges. Failed send keeps the same next seq and all pending choices. No async event can run inside the normal synchronous peek/send/commit transaction; the mirrored frame is a clone, so do not rely on frame object identity.
7. clearGamepad deletes only the gamepad map entry; a retained older keyboard/pointer hit can become the latest survivor. Device neutral release (`setGamepad([])`) preserves ordinary quick taps until send, while detach/disable (`clearGamepad`) intentionally removes pad-owned unsent records. Full release/remap/blur/settings/room/reconnect clears every record and modifier hold.

Keep gamepad and stock touch adapters limited to the original four logical movement/jump/hit actions. They do not create a modifier or second hit sender. Their hit can nevertheless capture a keyboard modifier already held when the aggregate hit rises. Pressing W or S while a pad/touch/J hit is already held creates neither a new edge nor a new choice. The current onChange/scheduler architecture needs no additional polling loop.

Multiple hits before one accepted send intentionally collapse to the latest surviving hit request, as multiple received packets already collapse per server frame. Do not queue several future swings or make ignored presses fire after recovery.

| Sequence before successful send | Expected pending output |
| --- | --- |
| W down, J down, W up, J up | hitPressed true, hitHeld false, swing overhead |
| J down, then W down | Original hit remains auto |
| W and S held, then J down | Auto |
| W+J quick tap, then S+J quick tap | Underhand; latest keyboard edge replaces earlier keyboard choice |
| Keyboard overhead quick tap, then later pad hit while S held | Underhand from latest pad edge; clearing pad reveals keyboard overhead |
| Keyboard overhead hit already held, pad also holds hit, pad detaches | Keyboard-owned overhead edge survives if unsent; no duplicate edge |
| Pad-owned overhead edge, then keyboard J joins the already-held hit, pad detaches | Keyboard remains held, pad edge disappears; hitPressed false and swing auto unless another pending source record exists |
| Successful overhead send, J still held, S subsequently pressed | Later held frames use auto and no new hitPressed; current swing unchanged |

The pad-first/keyboard-joins case must not transfer the removed pad's forced choice to the keyboard. Existing held semantics remain intact: if authority has not previously latched any hit, a held-only frame can still start an **auto** swing under the original shared gate. This feature does not redefine held latches to guarantee that a surviving held source cannot auto-start. It guarantees that a removed source's pending forced choice does not leak or manufacture a new hitPressed edge.

### Strict wire and coalescing contract

Define shared SwingChoice alongside PlayerIntent (or a dependency-neutral shared type). InputFrame requires the field and empty intents explicitly use auto; the final main design permits optional in-process PlayerIntent.swing, with omitted legacy calls meaning auto. Protocol5 exact-key parsing accepts only the three literal strings and enforces `!hitPressed => swing==='auto'`. Reject omitted/unknown/array/null wire choices and non-auto held-only/release frames rather than silently normalizing malformed input. Continue rejecting internal hitJump, seat/position/score injection and unknown keys. Queue speed validation and handshake migration are coordinated by the main session; do not release a manual-only intermediate protocol5 build.

At both `service.ts` and `prediction.ts`, keep the current latest-held and newest-hit selection. Set:

```ts
current.hitPressed = !!hit;
current.swing = hit?.swing ?? 'auto';
if (hit) current.hitJump = hit.jump;
```

The selected hit's swing and existing packet-time jump must come from the **same hit frame**, even if a newer held/release frame says auto and jump false. With several hit packets, latest hit wins both fields. Keep any-packet jumpPressed and current movement/held state unchanged. Clear swing to auto in retained held intents and consumed-edge state, and clear hitJump on the existing boundaries. Prediction keeps the selected hit seq among replay edge owners, exactly as today.

Example: seq1 is `{hitPressed:true,swing:'overhead',jump:true}`, seq2 is release/held-only `{hitPressed:false,swing:'auto',jump:false,move:1}`. The completed step uses seq2 movement/held/ack ownership, seq1 overhead and internal hitJump true. If seq3 is a newer underhand hit with jump false, it supplies **both** underhand and hitJump false; never combine seq3 swing with seq1 jump.

There is a second payload latch in `ClassicSimulation.setIntents`, not just server/prediction coalescing. It ORs hitPressed across calls before a fixed frame is available. Therefore an incoming held-only auto frame must not overwrite an older unconsumed forced choice. If the new intent has a hit edge use its swing/hitJump; else if the buffered intent still has a hit edge retain that buffered swing/hitJump; otherwise use auto/no hitJump. Keep movement and held booleans from the newest intent and existing OR semantics for jumpPressed/pause. Clearing consumed edges resets the manual choice to auto. This covers 120 Hz callers and other sub-frame input consumers without touching 60 Hz physics.

**Jump guarantee limit:** this feature retains current wire `jump` as sampled held state. If K was already held/committed when physical J rises, but K is released before a failed send later succeeds, the wire can contain jump false and no fresh jumpPressed. No new bit preserves that physical hit-time K value. Existing coalesced hitJump protection remains correct for the jump value on the selected accepted hit packet. Do not promise exact physical-hit jump capture, overload jump with stale held state or add a synthetic jump edge to hide this limit.

### Shared simulation change boundary

Apply a request only inside accepted `startClassicSwing` selection. Keep all current acceptance checks first. Return serve before evaluating requested overhead/underhand. For auto, run the existing role-specific chooser unchanged. For a forced choice, choose that original clip directly, bypassing only automatic zone/descent/near-net selection. Continue using its existing source hitbox/rotation/contactEnd and current contact geometry for launch power/direction.

`stepClassicPlayer` passes `intent.swing` only on `intent.hitPressed`; an unlatched held-only fallback uses auto. Both authority and own-actor prediction call the same player step; no renderer/prediction-specific clip override. Modifiers held after the edge cannot change the request, and an edge rejected during recovery is consumed as today rather than queued for later. A contact-disabled/recovering swing cannot gain another hit merely because its modifier changes.

worldInput continues flipping only horizontal move. W/S mean the same overhead/underhand kinds for left/right and mirrored views; source facing/shot direction is still chosen by classicDirection. Forced underhand near the net is a legitimate choice of original clip, not an altered auto-zone or new allowance.

### Version2 preferences and conservative migration

Use `fiso-online:controls:v2` and `{version:2,bindings:{six exact action arrays},gamepadEnabled:boolean}`. Keep the existing maximum 4096 saved characters, maximum three keys/action, physical-code support, reserved shortcuts, unique codes and exact-key validation. Retain a separate strict v1 parser for migration; expanding ACTIONS and reusing the new parser would reject every old preference before migration. Update cloneBindings/defaults/labels/help/reset and generated row handling together.

Recommended read order:

1. A valid v2 entry wins; detach its arrays. Malformed/unknown-version present v2 uses safe detached new defaults, consistent with strict parsing; do not silently resurrect stale v1 preferences beneath a broken v2 entry.
2. Only if v2 is absent, parse v1 strictly. Compare its four binding arrays to the old defaults as **sets**, including exact length/membership; array order is not customization. Ignore gamepadEnabled for this classification.
3. If all four sets exactly match old defaults, use all six new defaults and **preserve gamepadEnabled even when false**. This updates returning default users to J/K/W/S.
4. Otherwise preserve all four customized arrays exactly, including empty actions and array order. Add overhead `[KeyW]` only if W is unassigned across those four arrays, and underhand `[KeyS]` only if S is unassigned. Leave conflicting modifiers `[]`; never steal a custom or still-used legacy binding. Do not force J/K onto customized users.
5. Surface a readable migration notice, for example “已保留自定义按键；W 已用于跳跃，上手修饰未设置，请在设置中添加。” Use existing binding status/help and “未设置” rows; keep notice outside the strict saved preference object. Default hotkey instructions must derive from live bindings, so a customized user is not told that J or W is active when it is not.
6. Persist a valid migration as v2 on a best-effort basis (or on the existing save boundary), preserving live settings if saving fails. Do not modify/delete v1. Rollback then sees its original v1 preferences. Restoring defaults resets all six live rows and persists v2 only.
7. Missing/invalid v1 or storage getter/read exceptions use detached new defaults and keep matching/play available. A save exception must retain already loaded/migrated live preferences rather than reverting them. Preserve the separate self-left key and mute/escape/browser shortcut rules.

The notice should be shown after settings render/capture initialization so it is not immediately erased by a generic capture status update. A transient migration result can carry notice text separately from ControlsPreferences; no persistent migration flag, extra unknown saved field or extra user confirmation is needed.

### Meaningful verification cases for implementation

- **Schema/migration:** all six defaults and detached copies; strict v2 parse and unknown-field/version/code/conflict rejection; unchanged v1 parser; reordered old-default arrays upgrade; old defaults with gamepadEnabled false upgrade while retaining false; partially customized arrays survive exactly; W/S free individually assigned, occupied individually unbound with visible notice; malformed/present v2 does not load stale v1; throwing storage boundaries; v1 remains byte-for-byte untouched after migration/reset/save.
- **Native keyboard:** J/Space/down hit, K/up jump, W/S alone never hit or jump; modifier aliases/remapping; physical key repeat/IME/Ctrl/Alt/Meta/native controls suppressed; W+J overhead, S+J underhand, W+S+J auto; modifiers pressed after J do not retarget; help/rows/reset and narrow-screen settings remain reachable.
- **Pending transactional input:** quick tap released before peek retains manual choice; failed/backpressured/throwing send retains choice and seq with no prediction accept; release/repress before retry chooses newest same-kind request; pointer/gamepad hit samples currently held keyboard modifier; no duplicate aggregate edge from aliases or another held device.
- **Provenance/removal:** test both keyboard-first and pad-first held overlaps; clearGamepad drops only pad-owned pending choice and no holds/edges from keyboard/touch; removing the newest pad reveals an older pending keyboard choice; same booleans but changed selected choice still notifies scheduler; complete release/remap/focus/settings/room/reconnect clears modifiers and choices. Source map/pending size remains bounded through thousands of taps.
- **Server/prediction bursts:** newest hit choice survives newer release/held-auto packets; two hit packets choose latest hit's swing and packet-time jump together; existing any-packet jumpPressed and latest-held movement semantics preserved; same exact selected intent in authority and prediction, ack after completed frame, no extra swing on fallback/reconcile. Protocol rejects forced choice with hitPressed false and rejects wire hitJump.
- **Sub-frame latch:** buffer forced hit, update by less than 1/60, set held/release auto intent, update to complete one frame; forced choice survives exactly once. Buffer a newer hit before consumption and verify it supersedes the older hit. Consumed choices reset to auto.
- **Source gates/roles:** serving ignores forced kinds and releases at existing adult/Toaster tick; auto traces retain original clip selection; force each kind where auto would choose the other, with original clip hitboxes/rotation/power/contactEnd; missed/out-of-range/recovery/point-inactive inputs remain misses/ignored; repeated press cannot cancel; all seven roles/both seats/Toaster bob use the same player logic. All speed tiers honor unchanged actor timing and selected clip.
- **Mirror/browser integration:** actual-right self-left changes horizontal move only; manual kinds and K+jump semantics unchanged; real scheduler/Network tests observe accepted outbound protocol5 payloads and matching prediction; isolated two-browser match checks show authority-selected kind and consistent ball/score. Physical keyboard rollover and real gamepad sampling remain separate hardware validation.

Existing homes: `tests/controls.test.ts`, `tests/input.test.ts`, `tests/gamepad.test.ts`, `tests/input-scheduler.test.ts`, `tests/protocol.test.ts`, `tests/service.test.ts`, `tests/prediction.test.ts`, `tests/prediction-clock.test.ts`, `tests/perspective.test.ts`, `tests/classic/core.test.ts`, `tests/classic/characters.test.ts`, and `tests/hit-timing.test.ts`. Planning did not add or run tests.

### Related specs and external references

- `.trellis/spec/frontend/controls-and-devices.md`: bounded local preferences, aggregate edges/source provenance, scheduler transaction, neutral gamepad rearm, remapping/capture guards and real-hardware verification limits. Its current four-action/v1/default contract will need a reviewed spec update during implementation.
- `.trellis/spec/shared/protocol.md`: exact input fields, rejected internal hitJump, completed-step ack, atomic frontend/backend version transition. Protocol4 references must move together with already-planned speed protocol5.
- `.trellis/spec/shared/simulation.md`: original serve/recovery/contact/timeline order, shared actor prediction, no invented last-touch allowance and source geometry.
- `.trellis/spec/frontend/state-management.md`: own-actor-only prediction and mirror/input transaction boundaries.
- `.trellis/workflow.md`: task remains planning; this research is not implementation/start approval.
- No external library/API change is needed. Repository context: TypeScript ^6.0.3, Vitest ^4.1.8, Node >=24; existing native keyboard/Gamepad API integration is retained.

## Caveats / Not Found

- Forced manual clip selection intentionally differs from automatic source zone choice. It retains the original clip/contact/shot mechanics and does not promise successful contact or a particular upward/downward ball trajectory.
- Exact physical-hit jump-state preservation is outside the chosen wire contract; current packet-time jump and coalesced hitJump behavior remain. This is explicit, not an unverified claim of perfect simultaneous key capture.
- Multiple pre-send physical hits collapse to the latest surviving request; no queue of future swings is introduced. Gamepad button taps entirely between exposed browser samples can still be missed.
- A held-only auto fallback can start under current latches after a pad-owned edge is removed while keyboard remains held. The removed forced choice must not survive; changing baseline held semantics would be separate scope.
- Customized users may retain W as jump or S as hit, leaving one/both manual modifiers unbound. This is intentional preservation; dynamic help and visible “未设置” rows/notice are required.
- Protocol5 adds this strict enum together with speed fields and all handshake clients/scripts. This research does not itself update or verify deployment compatibility, hardware rollover, physical gamepad mapping or two-computer latency.
