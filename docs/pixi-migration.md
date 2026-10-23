# PixiJS 本地迁移与验证（2026-10-22）

当前源码已使用 PixiJS8.22.0 WebGL，原复杂SVG滤镜改为构建阶段烘焙。战斗模拟、输入/预测/插值、Effects/Audio时钟和协议5保持原有实现；未执行生产部署。唯一呈现RAF仍在main，不创建Pixi Application/Ticker/AnimatedSprite。

## 运行与生成

```bash
npm ci
npm run dev
# 默认客户端 http://127.0.0.1:5184/badminton-h5-online/

# 素材已提交，普通构建不需要浏览器
npm run assets:verify
npm run build

# 修改派生SVG后重新生成；固定Playwright1.62.0/Chromium1234
npx playwright install chromium
npm run assets:atlas
npm run assets:atlas -- --check
```

隔离构建验收使用 `node tools/render-validation/server.mjs --dist dist`，地址为 `http://127.0.0.1:18926/badminton-h5-online/`，后端18925；fixture18927。完整命令、统计口径见 [验证工具](../tools/render-validation/README.md)，素材格式见 [构建说明](../tools/flash-assets/README.md)。官方API依据保存在任务研究记录，版本化API入口为 [WebGLRenderer](https://pixijs.download/v8.22.0/docs/rendering.WebGLRenderer.html)、[TextureSource](https://pixijs.download/v8.22.0/docs/rendering.TextureSource.html)。现有严格CSP不变，使用包内官方 `pixi.js/unsafe-eval` 免动态代码生成适配。

## 素材与资源结果

499个源SVG路径包含490个场景/角色路径与9个DOM图。保留原来源清单、浮点注册点、动画帧序、滤镜padding、图层和透明度；裁剪只去alpha0，按实际整数位图尺寸补偿原点，拆片边界复制真实邻居像素。PNG为透明无损格式，2px补边、线性采样、无mipmap，单页≤2048。

| 构建统计                 |        HD |        SD |
| ------------------------ | --------: | --------: |
| 全部分组PNG页数          |        14 |        11 |
| 全部分组PNG字节          | 9,728,171 | 3,743,248 |
| 最坏活动双人组合RGBA估算 |  85.47MiB |  22.27MiB |

这些是构建统计与页RGBA估算，运行期只载入court/common、当前两个人物和挥拍家族。原生DOM预览共35,396字节。新角色先释放旧角色页，同组合再次匹配复用；窗口/画质变化保留图集档位，避免重新上传。估算不含解码副本、帧缓冲、驱动、JS堆或进程总量。

独立重烘焙36个文件逐字节一致，生成清单SHA256为 `c565a4153d32c4f12911a53bf21c3424914d6544880ad62cf79309fa671ef6eb`。当前源清单关联为 `b23addc58b37608bd5f135a80d98c1602b8487ce1412722192015ca467773e51`。多色彩屑端点验证：alpha误差0，最大预乘RGB误差HD1.131/255、SD1.179/255；仅主体着色，保留固定高光/阴影。详情见 [构建报告](../public/classic-atlas/report.json)。跨平台字节重现尚未验证。

最终编码同时比较两种无损PNG策略，选择较小者，平局保留原策略。全部34张图从15,693,203降至13,506,815字节（−13.93%），逐张解码RGBA、尺寸、注册点、分片和分组均相同；HD减少14.73%，SD减少11.90%，页RGBA内存不变。[逐张证据](pixi-evidence/compression.json)。最终完整烘焙44.865秒、独立校验重烘焙45.167秒；没有优化前完整构建计时，不能据此给出全流程倍率。三张HD场地的受控编码CPU合计由策略3的1.216秒增至策略0的12.057秒，体积少819,135字节；这是构建成本，非浏览器性能。[编码探测](pixi-evidence/compression-court.json)。

<!-- PERFORMANCE:START -->

## 同条件性能

同一台Linux6.8/KVM、4vCPU AMD EPYC7K62主机，Node24.19.0、Chromium151.0.7922.34/Playwright1.62.0，两个1440×1000、DPR2、独立游客客户端，Toaster/Pirate及相同50ms逻辑键盘驱动。各75秒cold +75秒warm，包含移动/跳跃/发球/挥拍、烟雾/球尾/闪光、自然结果/彩屑及再次匹配；每5秒采样。固定窗口/原生DPR，内部画质依各版本的实际策略变化，下表列出末值。每格为客户端1 /2。不是持续长回合、实体双机、物理输入延迟或统计显著性实验；脚本相同，随机自然比赛路径并非逐tick相同。

实测为WebGL2，max texture8192，ANGLE Vulkan/SwiftShader Device(Subzero)，属于**软件WebGL**。未证明实体GPU上的帧率。cold为新browser context，warm为相同context保留HTTP缓存、清Cookie后reload；隔离服务器有意不设Cache-Control以匹配基线，不能称warm已命中生产immutable缓存。就绪时间是导航后轮询观测时刻，非loading层消失的精确时刻。

| 版本 / 缓存   |     观察到就绪ms | 帧间隔p95 ms |    帧间隔最大ms | 最后世界密度 |
| ------------- | ---------------: | -----------: | --------------: | -----------: |
| Canvas / cold |  3040.7 / 3574.5 |  33.4 / 49.9 |   433.3 / 433.3 |    1.4 / 2.0 |
| Canvas / warm | 9247.6 / 16351.5 |  50.0 / 50.0 | 1433.2 / 1200.0 |    1.4 / 1.4 |
| Pixi / cold   |  1077.9 / 1008.0 |  33.4 / 33.4 |   133.3 / 133.4 |    1.4 / 1.4 |
| Pixi / warm   |  1359.7 / 1081.9 |  33.4 / 33.4 |   300.0 / 250.0 |    1.4 / 1.4 |

| 版本 / 缓存   | 长任务次数 |  长任务p95 ms |     最长任务ms | 采样到JS堆最大MiB |
| ------------- | ---------: | ------------: | -------------: | ----------------: |
| Canvas / cold |    38 / 31 | 224.0 / 323.0 |  419.0 / 421.0 |         9.7 / 8.1 |
| Canvas / warm |    18 / 11 | 579.0 / 335.0 | 1399.0 / 449.0 |       11.6 / 11.6 |
| Pixi / cold   |    29 / 29 | 114.0 / 117.0 |  125.0 / 124.0 |       10.6 / 12.1 |
| Pixi / warm   |    22 / 25 | 229.0 / 164.0 |  299.0 / 241.0 |       13.8 / 15.8 |

加载与最坏停顿改善，暖态帧间隔p95降低；冷态客户端1的p95基本不变。冷态客户端2的末密度由基线2降至1.4，两个版本采用不同的实际自适应结果；画质策略变化也影响性能，不能把全部差值归因于Pixi，也不能称这是相同内部像素数下的渲染微基准。70–105ms持续过载会更早降低细节；固定密度画面对照另见下节。暖态长任务**次数增加**，最长耗时及p95下降，仍有启动高密度绘制、GPU/浏览器提交和尺寸切换停顿；不能称所有指标变好。JS堆部分增加，未测得总进程/GPU内存，不能宣称省内存。堆值是CDP采样值，未强制GC，不是全过程峰值。Canvas末尾RGBA缓存约55.5–64.0MiB；Pixi当前HD9页85.47MiB为页像素估算，包含对象不同，且均不含浏览器/驱动副本。图集档位在画质下降后保留，避免新下载/上传，其代价是保留HD页内存。活动组合仍低于原96MiB总预算。

动作和同角色再次匹配的全部5秒采样中，每端图集decode/upload计数均保持10/10（含启动及换入该组合），活动页9，无新SVG滤镜/每色SVG工作。新角色需加载不同分组，退出/切换/恢复的释放与重新上传另由生命周期验收覆盖。原Canvas同窗存在缓存miss/eviction，不能把所有miss都当作首次SVG过滤或直接换算卡顿时长。

ResourceTiming基线每端记录250项，明显触及默认buffer上限，编码字节小计2,268,834；最终Pixi每端记录32项，小计11,527,211字节。它们是记录到的**小计**，不可据此宣称总传输减少。原版507个源文件构建统计共6,385,408字节；高密度无损PNG及Pixi JS增加下载体积，弱网冷启动仍须实机验收。版本化哈希资源提供生产缓存条件，未在生产部署/测速。

已按实测修复的瓶颈：普通shader单采样器，矩形scissor替代全场stencil；无Effects空闲画面按完整值签名复用、恢复时显式重画；画质窗口覆盖仍在绘制的回合等待，避免短回合不断清零；35ms容忍稳定30fps，严重窗口均值≥70ms时按独立25ms目标/像素面积估算跳级，保留宽限/冷却/floor。裁剪先清整个root及留边，再限制单一root pass并finally复位。背景不透明混合的实验无稳定收益，保留原混合方式。PNG最终采用两种无损策略中更小者，构建CPU增加，解码像素完全相同。

第一轮直迁Pixi曾严重回退（cold p95 200/183.4ms，warm433.3/533.2ms），未作为交付结果。调查定位到原生绘制/合成成本而非重复SVG解码或上传；逐项修复后重测，所有探索轮原始结果保留在本地artifacts/pixi-migration。比较脚本和条件可重跑，单次75秒不代表所有随机场次或设备。

PNG压缩后、70ms修正前也保留两轮完整75秒结果：[第一轮](pixi-evidence/pixi-pre70.json)、[重复轮](pixi-evidence/pixi-pre70-repeat.json)。第一轮cold p95为33.4/33.4ms，但客户端2曾出现650ms最大间隔/646ms长任务；重复轮cold p95为49.9/33.4ms，首窗口均值102.495ms未达到旧105ms跳级分界，客户端1停在密度2.8直到下一冷却/窗口。最终70ms分界和102.5ms回归检查修复该策略边界，本表为重新构建后的独立最终轮，未删除较差结果。

额外20秒cold/warm诊断轮没有重现650ms，长任务集中在开始阶段，大部分普通RAF回调低于40ms，记录到上传/提交API的阻塞，动作期间decode/upload计数未增长。650ms单次尖峰没有取得原生浏览器栈，不能声称已证明其精确原因或保证不再发生；最终轮的更低最大值仅代表该轮实测。此诊断轮经过计时封装且较短，不与75秒正式统计混算。原始诊断脚本/输出在本地artifacts/pixi-migration/peak-diagnostic*。

原始数据：[Canvas](pixi-evidence/canvas.json)、[最终Pixi](pixi-evidence/pixi.json)、[环境](pixi-evidence/environment.json)。
<!-- PERFORMANCE:END -->

## 画面对照

冻结旧Canvas源码与实际WebGL调用相同冻结状态，分别以世界密度2/4绘制，角色与Effects不得被渲染修改。共202组（每密度101组），覆盖七角色的前后移动、跳跃、发球/高位/低位挥拍及首尾帧，世界镜像、可读比分/名字/标识、两侧胜利、网/球、烟雾/球尾、结果前后闪光和八色彩屑。几何/选择器及真实scene矩阵测试配合截图，不能只以像素误差判定还原。

| 全画面RGB通道差异，单位0..255 |            SD |          HD |
| ----------------------------- | ------------: | ----------: |
| 各案例平均绝对误差范围        |   1.679–1.837 | 0.919–1.015 |
| 各案例p95范围                 |           5–6 |           3 |
| 任意通道差>3的像素比例范围    | 14.72%–16.17% | 4.26%–5.32% |

抽查各角色、挥拍边界、介绍/结果、镜像与彩屑：未发现注册点跳动、角色/挥拍深度错误、反字、滤镜截断或拼片漏缝。背景纹理、细线和抗锯齿边缘存在采样差异，SD更明显；本结果不宣称逐像素一致，也不是原生Flash对照。图均按 **Canvas｜Pixi｜差异×4** 排列：

- [Nadia发球首帧SD](pixi-evidence/nadia-serve-frame1-density2-contact.png)、[Red低位挥拍末帧SD](pixi-evidence/red-underhand-frame-1-density2-contact.png)、[Top Hat镜像SD](pixi-evidence/top-hat-forward-mirrored-density2-contact.png)、[ToasterSD](pixi-evidence/toaster-serve-density2-contact.png)。
- [图层HD](pixi-evidence/pirate-layers-density4-contact.png)、[镜像介绍HD](pixi-evidence/pirate-intro-mirrored-density4-contact.png)、[镜像结果HD](pixi-evidence/pirate-finish-right-mirrored-density4-contact.png)、[彩屑SD](pixi-evidence/pirate-confetti-mirrored-density2-contact.png) / [HD](pixi-evidence/pirate-confetti-mirrored-density4-contact.png)。
- [全部逐项统计、图集页数与上下文记录](pixi-evidence/visual.json)。完整202张联系图在本地 `artifacts/pixi-migration/visual-compact/`，可用 `--compact --batch-size 32 --boundaries` 重现。

首次不限制大图输出的验证在工作盘仅余172MiB时中止，并出现上下文丢失/黑图；该轮不计通过。改为分批、保留联系图和统计后，23组HD探测与完整202组均通过，完整轮无上下文事件、浏览器错误或全黑图。未删除冻结来源或迁移前备份。

## 操作、恢复与质量检查

- 两个独立游客在1/1.25/1.5/2x各自然完成七分比赛，同tick权威分别比较976/577/549/506组，全部一致。原键盘J/K/W/S、镜像、合成标准手柄、逻辑触屏按钮、设置迁移/持久化、重连、再次匹配及320×568/812×375布局通过；默认页面无诊断接口。[原始报告](pixi-evidence/acceptance.json)。
- 启动PNG失败→原生重载重试通过；新对手角色PNG失败时快照继续、游戏输入被阻止、原生退出可用。[故障报告](pixi-evidence/loading-retry.json)。
- 实际WEBGL_lose_context恢复保留房间；DPR1缩放/镜像、自然结果30秒后服务端回收仍保留比分/角色、换角色释放旧页，以及延迟新角色PNG期间丢失上下文→退出→恢复均通过。[生命周期报告](pixi-evidence/lifecycle.json)。
- 独立审查修复了场景取消误伤上下文恢复代次、加载遮盖期间结果回收丢失最后状态、销毁后加载回调更新DOM的问题；上下文/销毁路径有直接回归检查，回收期间状态保留以源码审查和分别的真实浏览器场景验证，组合边界仍见下述限制。渲染测试27项、画质测试24项、图集测试11项，完整24文件455项测试通过。`npm run typecheck`、`npm run lint`、`npm run build`通过，独立素材重建/校验通过。
- 最终主包473.73kB（gzip139.56kB）；删除未使用的Graphics/stencil依赖后，不再触发500kB建议提示。旧主包133.23kB，新增Pixi/免eval代码仍增加启动JS体积。后续可依据真实生产缓存测量再评估拆包。

- 最终采样器/scissor路径另跑26组SD/HD图层、镜像、挥拍、介绍/结算/彩屑对照，逐项像素统计与完整202组中的对应案例完全一致，无上下文事件或错误。[最终补验](pixi-evidence/visual-final.json)。
- headed Xvfb真实标签切换验收通过：可信visibilitychange、隐藏期间无绘制/输入释放、快照继续、返回后中性重置及手柄回中重启。使用外部浏览器默认context和noDefaults，避免自动化焦点模拟掩盖隐藏；这不证明实体设备生命周期。[可见性报告](pixi-evidence/visibility.json)。

## 回退与未验证范围

原Canvas提交 `fb87796d75391668d70a5cb9f8d213087b3bbfdd`，标签 `pre-pixijs-20261022`，完整历史bundle已验证并保存在本地 `artifacts/pixi-migration/backups/pre-pixijs-20261022.bundle`。可用 `git worktree add ../stickman-badminton-canvas pre-pixijs-20261022` 独立审查原版，无需覆盖当前改动。仓库未配置remote，用户请求的迁移前推送尚未完成；没有生产发布。

尚未验收真实Android/iOS、Safari/Firefox、实体GPU/低端设备、WebGL1降级、实体手柄/触屏、物理双机及弱网延迟。BFCache实际命中与不同驱动恢复也未证明。延迟新角色请求贯穿自然结果再到房间回收的组合场景未直接自动化覆盖：资源截止15秒短于结果保留30秒；分别的真实场景和该组合源码审查通过，不能称组合E2E已通过。PNG烘焙在其他浏览器上的采样/色彩可能不同。
