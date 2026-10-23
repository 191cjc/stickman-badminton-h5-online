# Measured performance and remaining costs

The authoritative comparison is docs/pixi-migration.md with raw Canvas/final Pixi reports and environment under docs/pixi-evidence. Baseline was captured before product edits. Pinned Chromium151,1440×1000,DPR2,twoToaster/Pirate guests,50ms logical keyboard driver,75s cold+75s warm; measurements run serially without bake/tests/other browsers. Software ANGLE Vulkan/SwiftShader is not a physical-GPU result. Warm retains context HTTP cache but the identical local server has no Cache-Control; readiness is observed polling, bytes are ResourceTiming subtotals and JS heap is sampled without forced GC.

## Investigation

1. Initial Pixi migration regressed to cold p95200/183.4ms and warm433.3/533.2ms. JS/GL timing and CPU profiling did not show repeated decode/upload; ordinary callbacks mostly small while native draw/composition dominated. Rejected the initial result.
2. Cap ordinary sprite shader to one sampler; replace full-court stencil mask with explicit root scissor and clear letterbox first. Keep two-texture confetti shader and source order. Fixed-state final26-case supplement has identical metrics to corresponding original202cases.
3. Reuse unchanged Effects-absent idle frames with consumed-value signature and explicit recovery invalidation. Effects-present always draws.
4. Include point/serve waits in quality windows.35ms tolerates stable30Hz. Separate25ms severe target leaves headroom; all grace/cooldown/floor and slow-fraction safeguards retained.
5. Choose smallest of two lossless PNG encodes. Full34-image old/new RGBA/metadata proof and36-file independent byte reproduction pass. Total PNG saves2,186,388bytes/13.93%, memory unchanged, build CPU increases. Source digest unchanged.
6. Two post-compression formal runs under105ms severe threshold remain reviewable in docs/pixi-evidence/pixi-pre70*. First had a650ms isolated cold-client2 gap/646ms long task.20s instrumented diagnostic did not reproduce it; long tasks concentrated early, regular RAF callbacks mostly<40ms and no within-action upload growth. No native stack for that exact650ms event; precise cause and universal removal are unproven.
7. Second formal cold client1 showed mean102.495ms, density2.8 through the next cooldown/window, then density2 at~13s and whole-window p9549.9ms. Its peer at mean113.883ms jumped1.4 immediately. This exposed an arbitrary105ms policy seam. Lower severe branch to2×35=70ms, preserving complete2s/4-sample/50%slow eligibility and25ms target.69/70/102.5ms regressions plus existing lone-stall/healthy/floor/cooldown checks pass. This changes detail under sustained70–105ms overload; it is not an equal-quality speedup claim.

## Final independently rebuilt run

Variant pixi-quality70-final, complete:true/errors[]. Cold ready1077.9/1008.0ms, frame p9533.4/33.4ms/max133.3/133.4ms, long tasks29/29,p95114/117ms,max125/124ms. Warm ready1359.7/1081.9ms, frame p9533.4/33.4ms/max300/250ms, long tasks22/25,p95229/164ms,max299/241ms. Last density1.4 each. Baseline and full JS/resource tables live in the main report; do not select only favorable counters.

Warm task counts and some sampled heap increase; startup high-density native cost remains. Final sampled JS heap maximum cold10.6/12.1MiB,warm13.8/15.8MiB is not a total/process/GPU peak. ActiveHD9pages85.47MiB is an estimate and stays loaded after backing decreases to avoid new uploads. decode/upload10/10 in every5s sample; same-role rematch reuses pages. Original source-files total6,385,408bytes; recorded ResourceTiming baseline250entries is truncated, so its2,268,834-byte subtotal cannot compare total transfer against final32entries/11,527,211bytes. High-density lossless PNG+Pixi increases delivery bytes. No physical/mobile/weak-network claim.

All exploratory raw runs, timing probes and initial/repeated failures remain under ignored artifacts/pixi-migration. Reproducible formal driver, servers, fixed-state comparison and behavioral acceptance tools ship under tools/render-validation. No production deployment.
