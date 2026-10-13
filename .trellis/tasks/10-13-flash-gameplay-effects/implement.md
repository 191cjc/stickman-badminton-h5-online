# 原版双人联机实施计划（已批准实施）

## Planning gate and scope

- [x] 用户同意创建任务，后续确认角色直接开放。
- [x] 用户进一步明确只保留原版双人改为联机；原单人、AI 对练、闯关、解锁/进度保存不进入本任务。
- [x] 源研究保存：可达7角色、真实属性顺序、Toaster 特殊动作；特效/音频/双人结果；跨层所有者和社区残留审计。
- [x] PRD 完成正式结构收敛，设计围绕7角色/在线唯一模式；保留单任务，因为资源/状态/前后端需一并切换。
- [x] 实施/检查 JSONL 清单路径验证通过；超长特效研究拆分为两份，避免上下文注入截断。
- [x] 最终规划摘要已展示，用户随后回复“开始吧”，明确批准进入实施。
- [x] 最终审阅批准后已执行 task.py start，status=in_progress。

## 1. Source-derived asset and character contract

Owner: Trellis implement agent，先做生成器、共享注册表/资产契约和源测试；其他执行者不得同时写生成模块。

- [x] 以冻结 SWF/XML 哈希和现有 Joe source-value tests 建立基线；不得改参考来满足测试。
- [x] 增加7角色共享注册表；原名 The Red Dude 不错误写成 Champ；不暴露 Robot/Timmy ID。
- [x] 参数化 extract/finalize，输出各角色 body/附件/预览和 adult/Toaster 几何/时间轴；核对 Pirate 附件、隐形选择区排除、发球内嵌球互斥和 depth。
- [x] schema2 包含角色、原 BigSpark278/tail245/smog242/confetti282、Intro255/Finish269.frame1相关装饰/动态字层，以及原音频/资源哈希。选择符号列表由同一 export spec 派生。
- [x] 原 blur/glow overflow padding、registration 补偿、confetti nested color hierarchy 有数值/浏览器依据（不声称native Flash逐像素等效）。生成资源从冻结源可重建，不依赖 ignored research export。
- [x] 音频从 XML soundData[2:] 派生且逐文件核对完整导出；保留 seek header 来源记录。No original SWF/AS/analytics in public/dist。
- [x] 数字精度、原 frame script、body/swing路径、哈希/可见性、Toaster serve27/release8 测试通过；Joe 重构输出保持原行为。

## 2. Seven-human authoritative simulation and effects events

Owner: 同一 implement agent，资产契约完成后修改共享模拟/输入及 tests。不要复制另一套预测动作函数。

- [x] 创建7角色 human-versus 模拟；共享人物 serializable character/clip/bob 状态和深拷贝。
- [x] 移除产品 single/normal/boss/AI 控制路径；清理无用 hitMove；保留实际输入合包 hitJump 保护。调整对应旧 AI-only 测试为范围变化记录，不偷偷删去仍适用的 ball/score/pause/lifecycle 测试。
- [x] 各角色源属性、动作锁存、实际 racket AABB/underhand zones、非缩放 servePoint、两个方向 shot 规则；Toaster 的 contact-before-final-bob、人类跳跃和专用 frame8 release/pop。
- [x] 维持60-Hz、原自定义独立 clip clocks及回调顺序；ball live/landing-preview/score owners不因人物数据参数化改成社区规则。
- [x] 增加独立 FX RNG、monotonic presentation cursor，源 accepted swing/serve/contact/point/natural-result 事件。
- [x] 源位置的 tail pair emission（球碰撞前）及 Toaster smoke emission；128事件/30tick journal 初值需验证最坏密度/输出界限。严格隔离 gameplay state/RNG 与 cosmetics。
- [x] 源值回归：7角色×2侧移动/跳跃/发球、body/bob/contact、动作恢复与快速输入；真实合法双方来回；网/墙/地面及单次七分计分；FX 开/关或seed差异不改变 gameplay replay。

## 3. Protocol v3, matching, prediction and court presentation

Owner: 同一 implement agent，确定的共享契约进入 server/client；主会话协调并观察有无新增需求，不扩展角色/模式。

- [x] queue 严格接受7角色enum，Guest 排队选择在 room creation 固定，双方可相同角色；重复同选择幂等、不同选择需取消重排；不能让未匹配的第三人提交席位。
- [x] 协议3/subprotocol badminton-v3/state flash-90302-v2；session/hello/matched/snapshot/client/scripts/tests 一并改；v1/v2在绑定socket/guest/seat前明确拒绝。
- [x] Server Snapshot 传 effects envelope/cursor，先/后 result snapshot 顺序均有正确消费；ack只确认完成的60-Hz步，输入/结果/重连回收语义保持。
- [x] 首个权威角色状态初始化 Prediction；共享步进重放只影响本地角色，角色/room/score/phase/status重置；Interpolation discrete字段不混成另一角色或虚构接触。
- [x] 场内选角/预览、disabled与已选状态、改角再匹配、连接/席位提示；移除 practice DOM/事件/分支；Space回到源hit，正常键盘焦点/触屏释放可用。
- [x] Renderer 恢复 net/markers/smoke/players/trail/shuttle/foreground 原层级；7角色可见帧与数字帧同源。
- [x] Effects 按采样tick消费单次spark/emission，ID去重/年龄快进/过期；60-Hz粒子移动/缩小/回收；重复/晚到/旧房间/重连cursor不重播历史。
- [x] 双人 Intro255 两秒后淡出，真实七分 Finish269.frame1 淡入+cheer/cosmetic confetti持续到退结果，Toaster原终局bob/smoke；所有结果呈现不重启权威球/得分。
- [x] 原SFX通道重叠、Toaster nosound例外、比赛music、原按钮声音；native可访问静音按钮/M、Esc通过服务端leave退出，gesture unlock/autoplay失败/voice回收；无未使用spark/hard-hit/AI-loss/campaign声效。
- [x] Blur/hidden/pagehide/release/close 重置输入；reconnecting暂停/清瞬态，resumed建基线；scene/new-room/exit停止旧音频/粒子/循环。

## 4. Quality and isolated comparison

Owner: 独立 Trellis check agent，检查全任务而非最后一段；直接修复发现，完成后主会话核实报告。

- [x] Review全部PRD/设计/source research和所有层spec；角色/几何/协议/事件/预测/呈现/回收跨层一致。
- [x] Protocol恶意输入：未知/Robot/Timmy、数组discriminator、extra keys、score/room/side/position、伪Cookie/Origin、旧v1/v2、连接冲突。
- [x] 真实本地HTTP/WS独立游客：不同/同角色对战、两侧控制、完整七分同tick球/比分、最终声音事件一致、release/输入合包/timeout、retain-seat reconnect、到期与再匹配房间回收。
- [x] FX/source/audio测试：miss只有whoosh、真实hit只有一spark/hit、Toaster pop无hit、point一次ding、自然result一次cheer；重复/迟到/停顿/重连不重播；60Hz与不同RAF密度/寿命一致、有界资源及末局呈现时钟。
- [x] lint/typecheck/全适用测试/build，必要的shell语法/独立HTTP资源与握手检查先通过。
- [x] 用户已有browser测试授权：隔离本地服务、两个Cookie context，与未改SWF的Ruffle compatibility运行对照选角/两侧发球/Toaster/尾迹闪光/烟雾/彩屑/音频和紧凑屏幕布局。代码与HTTP验证先行，不占公网排队用户。
- [x] 验证原归档/hash不变、src/build无upstream可执行导入/旧游戏资源；其他三个游戏服务及文件不改变。
- [x] docs/validation逐项记录实际观察，不能用转换版自回放替代原运行；physical双机/其他浏览器/触屏/弱网仍外部验收，不预报延迟。

## 5. Source/spec documentation and independent release

Owner: 主会话更新规范、协调提交、准备和执行已授权的发布/收尾；只操作本项目资源。

- [x] GAME_SOURCE/README/design/validation更新当前7角色双人范围、网络必要适配、素材/代码映射/原权利声明；历史UPSTREAM仍保留。
- [x] 更新 shared simulation/protocol、frontend state/input/layers、backend角色席位/事件及deployment兼容规范。已有描述与实际60Hz service ticker不符时按源纠正，不作假设。
- [x] 提交前完整检查一次；按workflow整理具体work commit清单并确认，避免混入未识别或其他任务文件。
- [x] 准备独立release、旧release回滚及前后端v3同步切换；稳定Cookie secret不变，重启本项目service清内存比赛的规则保持；不同服务/入口不操作。
- [x] 发布后HTTP/assets/Cookie/WS3/旧协议拒绝与独立日志检查；公网真实匹配脚本只在队列为空时运行。
- [x] 记录实际发布release/服务状态/回滚目标及验证边界；没有发布则明确开发与生产状态，不能声称已上线。

## Commands and evidence

```bash
python3 .trellis/scripts/task.py validate .trellis/tasks/10-13-flash-gameplay-effects
# 只有最终审阅批准之后：
python3 .trellis/scripts/task.py start .trellis/tasks/10-13-flash-gameplay-effects

python3 tools/flash-assets/build.py
npx vitest run tests/classic/assets.test.ts tests/classic/core.test.ts
npx vitest run tests/protocol.test.ts tests/service.test.ts tests/prediction.test.ts tests/network.test.ts
# 同时执行实现后新增的必要 effects/audio/lifecycle 测试：
npm run lint
npm run typecheck
npm test
npm run build
bash -n scripts/publish.sh scripts/rollback.sh
```

本地 HTTP 检查使用隔离的 Vite/backend origin（service tests用port0），先确认端口空闲，不能接到生产8794房间。生产检查沿用 `node scripts/http-check.mjs https://www.firesoul.cn`，脚本中的协议断言必须已同步到v3。原版 full archive 未修改时不需要为每个UI步骤重新解包/归档验证；冻结hash/资产source tests和Git差异足以检查这次来源边界。

## Risk/rollback points

最敏感处：generated assets-data/API、Toaster接触和浮动先后、滤镜边界及动态text/fonts、FX event dedup/result顺序、终局后cosmetic独立时钟、v2旧页面拒绝。每阶段保持可验证diff；单角色Joe基线守住后扩展7角色。若产生新产品决定，回到规划修订范围而非私自扩展。

线上仍用既有完整release直至所有实施检查通过。回滚必须前后端一起切回先前release，页面刷新；保持Cookie secret与其他项目配置。若无法证实某个滤镜/时序等效，具体记录证据缺口，不伪称素材或源行为已完全还原。

## Completion evidence

Implementation and independent check reports plus [main verification](research/main-verification.md) record161 tests, final local/public507-resource checks, authorized browser/Ruffle observations, release and isolation evidence. Work commits use the earlier user Git authorization; no additional scope or remote push. Physical dual-computer/weak-network/touch/other-browser acceptance remains explicitly external.
