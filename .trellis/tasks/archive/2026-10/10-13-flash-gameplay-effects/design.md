# 原版双人对战联机设计（已批准实施）

## Architecture and change boundary

沿用现有共享 Flash 内核、服务器房间及浏览器 Canvas。最小行为缺口是：服务器和预测只能创建 Joe，数字碰撞/动作及渲染绑定 Joe 的全局资产，快照没有角色或可去重的效果事件，场内菜单没有选角。行为应分别在共享角色/模拟、资产生成、认证匹配和浏览器呈现的现有所有者中补齐。

改造不重新引入社区内核，不改写已有球的重力/阻尼/球网碰撞，不把球和计分交给客户端，不改其他项目入口。冻结原文件及完整归档保持不变。角色素材不能只换图或把 source 三个字段按错误顺序配置；角色例外路径必须有源码证据。

研究依据：`research/characters.md`、`research/effects.md`、`research/effects-conversion-and-sync.md`、`research/integration-boundaries.md`、`research/live-source-audit.md`。用户已确认直接开放角色，最新要求只做原版双人转联机；下面设计按此收敛；用户最终回复“开始吧”，已批准实施。

## Character data and generated assets

新增纯共享 `characters.ts` 注册表，保存以下唯一可选集合、原角色类/symbol、实际移动/跳跃/力量倍率和来源。原类/符号等实现细节仅供代码/文档，不在产品选择界面暴露。对战创建时确定 ID，房间内不接受换角。

| ID / original name | Move | Jump | Power | Sprite / swing family |
| --- | --- | --- | --- | --- |
| joe / Average Joe | 1 | 1 | 1 | 230 / adult |
| nadia / Naughty Nadia | 1.15 | 1.1 | .96 | 226 / adult |
| harry / Hairy Harry | 1.1 | .9 | 1.05 | 233 / adult |
| toaster / Flying Toaster | 1 | 1.15 | .96 | 178 / toaster |
| pirate / Pirate Pete | .89 | .9 | 1.1 | 221 / adult |
| top-hat / Top Hat Sam | .89 | 1.25 | 1 | 169 / adult |
| red / The Red Dude | 1.2 | 1 | 1 | 236 / adult |

全部直接开放，与原版双人菜单一致。Robot、Timmy、单人 AI/闯关选择及 unlockLevel 不进入产品注册表/协议。

从冻结 XML 生成每个接入角色的注册原点、嵌套矩阵、击球 AABB、underhand 选择区域、servePoint、动作总帧数、发球释放帧、接触结束/恢复动作帧、body 标签及嵌套步行帧。原轮廓扁平化误差继续有明确上界，数值保留 SWF 精度。公共球/网数据仍共用，不按角色复制。成人 family 为 serve135/under137/over140，Toaster 为 serve172/under174/over171；Toaster serve27/release8，其余 serve23/release7，under19/contactEnd10、over27/contactEnd15。

改造 `assets.ts` 的访问接口为角色感知的只读几何/动画查询，例如 `characterGeometry(id)`、`characterAnimation(id)`、`racketPose(id, kind, frame)`。Joe 默认创建兼容原行为；自动测试证明参数化没有改变旧 Joe 路径。特殊角色必须拥有专用策略，禁止仅共用 Joe 击球几何。

运行素材清单升级 schema2：`characters[id]` 保存 body、swings、必要的浮动/特殊帧及选角预览；`effects` 保存原特效独立图层/帧；`sounds` 保存原音频路径、symbol/哈希；公共 background/net/shuttle 沿用既有源。所有 path 相对 `classic/`，在项目 BASE_PATH 下访问。数值模块与可见资源从同一源重建，测试禁止外部 SVG 引用与未解析的缺失图层。

渲染遵循各角色原 depth 顺序，不能假定所有角色 swing-before-body；Pirate 的额外 shape220/depth21 不得遗漏。发球内嵌球与独立球按实际显示规则互斥。effect 的 registration origin、frame visibility、颜色变换、rotation/scale 从原资源提取。给 tail/smoke/confetti SVG 的 filter overflow 添加有依据的 bounds padding，同步调整 draw anchor，不能裁掉原 blur/glow。彩屑只替换嵌套 body 色，不把外层 bevel/glow 一并着色，0..256 色值边界按源转换核实并记录兼容差异。

画面顺序恢复为 background→net→原 score/markers→smoke→players→trail→shuttle→按创建次序追加的 spark/intro/result/confetti。原空容器 -0.05px x 位移纳入源映射。提取双人 Intro255、FinishOverlay269.frame1 相关静态图层/字体/文字，排除 campaign-only frame2/WinOverlay/DeathScreen 和赞助/广告动作。原按钮装饰可用于可访问 DOM 控件，服务器结果与匹配文字仍由本项目呈现。

音频从已校验 XML DefineSound 的 soundData 去除两字节 seek header 后派生，记录哈希/seek 元数据。纯 art-only 中间 SWF 无 AS/广告/远程行为；研究工具不成为生产依赖。

## Shared simulation and prediction

`ClassicPlayerState` 增加 characterId、Toaster bob/baseline 等可序列化状态；继续深拷贝 clip 和其他实际嵌套数据。`ClassicSimulation` 通过 options 接收两侧已校验角色和测试可控 seed，只运行两个 human-versus actor。移除产品 single/difficulty/AI 构造与控制路径，相关源码仍在冻结参考中。删除无用内部 hitMove 字段；保留等效 hitJump 合包边沿保护和中性的输入类型，不能用改名掩盖通用接口来源。

由共享 player step 根据 source 策略运行角色行为，预测复用同一函数。保留 60-Hz 输入/模拟、30-Hz 快照和原 MovieClip 独立时钟；动作结束前连按不可重启动作。Toaster human 按键跳跃保留普通弧线；仅在非跳跃时应用 source bob。其 base 步进/接触发生在当前帧最终 bob 写入 y 之前，因此 step 返回权威接触原点/事件或采用等效分阶段步进，不能在最终浮动位置误做本帧接触。预测也按同一源顺序处理最终 y，动画释放发球则用源当时的角色位置。回归测试覆盖两个侧别与 bob 方向边界。

球运动仍由 `birdie.ts` 所有。simulate 在真实发球释放/接触时根据角色源规则调用 launch 并生成事件。预测不调用 launch、不评分、不触发击球闪光或击球音效。开始预测前使用首个权威角色快照初始化，避免新选角色最初几帧仍是 Joe。角色/房间/比分/阶段边界清历史及校正偏移；远端插值只混合数值连续字段，保留来自真实快照的离散角色与动作。

两端共用 A/D/←/→ 移动、W/↑ 跳跃、S/↓/Space 击球/发球；Space 改回源击球，同步 UI 和测试。无鼠标目标协议。场内静音和源 M mute 由呈现所有者处理；源 Esc 退出映射已有 leave 命令，清输入并由服务器结算，不能发本地 pause 或修改比分。

## Roster, protocol and authenticated matching

此次状态和消息为不兼容扩展：PROTOCOL=3、`badminton-v3`、状态 `flash-90302-v2`。握手拒绝 v1/v2 时先给 `protocol_mismatch` 再 1008，且不绑定 Guest/socket/seat。HTTP session、hello、network、脚本、测试和文档一起更新；前后端一起发布。

queue 改为严格 `{type:"queue", character:<seven-ID-enum>}`，其他命令保持精确字段。首次 queue 冻结选择；相同选择重复 queue 幂等，不同选择在排队时返回明确 already_queued，改变角色需取消后重排。matched/初始快照包含服务器确定的两侧角色。重连从保留席位恢复角色，忽略浏览器本地选择。未知/Robot/Timmy ID、附加 room/side/score/position 字段依旧拒绝。

keyboard 输入仍保持现有精确字段、move -1/0/1 和 boolean held/edge。burst coalescing 使用最新 held 和一次按下沿，不增加模拟帧。750ms timeout、release、close、reconnect 清理 held/edge。现有 Cookie、Origin、单 socket、第三人席位保护、15s 重连和内存回收保持所有权。

## Presentation events, effects and audio

真实行为生成纯数据 `ClassicPresentationEvent`：match-scoped 单调 id、simulation tick/time、类型、位置/方向、可选 side/character/sound、独立 cosmetic seed。离散事件包含成功启动 swing（whoosh）、真实 serve/contact（spark+hit/pop）、point（ding）、自然 result（cheer）；wall/net/ground 除 point 外没有原声音/SmallSpark，不捏造 impact 事件。

连续 tail 与 Toaster smoke 也由源 60-Hz 创建位置发出 compact emission group：tail 在球更新重算 speed 后、碰撞前判断 speed>50 和 chance(speed*100/1400)，一次成功记录一对粒子的 seed+同一位置；烟雾在源 actor 回调对应位置按25%记录。权威只记录 emission，不更新/碰撞粒子；独立 cosmetic RNG 不消费 gameplay RNG。这比从30Hz插值猜测发射点更准确，不需要向每个快照输送全部活动粒子的逐帧坐标。

初始 journal 上界128组、保留30个 simulation ticks（0.5s），覆盖两侧 Toaster 与一球每帧最多3组连续 emission 及低频 swing/contact/score；运行测试再校验边界/序列化输出。snapshot envelope 携带 recent events/cursor，与 gameplay restore 隔离；超出保留窗口只恢复当前呈现基线，不补播历史音效。不能采用无界队列。浏览器可预测移动/挥拍，但 whoosh 本阶段也由权威 swing 事件播放，避免 reconcile 重播。

`Effects` 消费权威事件并去重，按采样的权威 tick 对齐原图层。重复快照/finished 快照不能反复生成同一 spark 或重播音效；重连以快照 cursor 建立 baseline 并跳过历史瞬态；新房间清空旧 ID、粒子和音频。事件比客户端呈现时间更晚时排队，落后过久的短效果直接过期，不能把旧闪光放到新球的位置。

BigSpark 用原素材及最终 scale0.3、frame22 移除。tail/smoke 从 emission seed 派生 source 随机方向/速度/旋转/衰减；粒子移动 spin 均用30*dt，tail shrink 用每帧 pow(scaleVar,.5)，smoke 用 pow(scaleVar,30*dt)。烟雾方向145..215 在正 y 世界中主要向下，不能凭印象改成向上。粒子独立60-Hz呈现步进、按事件年龄快进或过期，不按浏览器RAF决定密度。停顿/断包不推演新的权威发射/碰撞；reconnecting 清空瞬态并暂停 cosmetics，resumed cursor 重新建基线。

彩屑仅在自然双人七分 result 后以独立客户端60-Hz结果时钟 chance70% 每帧一粒持续，直到退出结果/再匹配。服务器比赛 tick 在终局停止；结果时钟不继续评分或改变球。Toaster 终局 bob/smoke 也仅作源结果呈现，不能修改 frozen gameplay。生存期、画面外移除和最大活粒子数量限制资源；不捏造固定三秒庆祝期。非自然结果只显示明确文字。Cosmetic RNG 分离改变原版全局 Math.random 耦合，需如实说明分布/素材恢复与 native Flash 随机逐粒一致性的区别。

Audio 使用原文件，开始匹配等用户手势解锁播放，提供场内静音按钮及 M。运行 SFX：38whoosh/45birdiehit/40toasterpop/43ding/47cheer，原结果按钮反馈19hover/20press作为本地UI声音；原比赛背景46music受同一静音/场景生命周期管理。允许 source whoosh+hit 通道重叠，短音频数量有限，不用单一 restart-only element；没有源码冷却便不编造额外冷却。Toaster serve 仍有whoosh+spark+pop、没有birdiehit。无42sigh、campaign WinOverlay53第二次cheer或unused39/44。音频所有者统一释放 voices/定时器，autoplay 拒绝不阻塞对战。

原版存在但从未被游戏创建的 SmallSpark 等资源保持完整归档，不发明墙撞火花。无法准确映射的混合/滤镜/音频压缩表现必须在迁移记录中说明。

## Court UI and result presentation

在现有场内菜单加入7角色原素材预览、名字及便于选择的能力说明，保留 native button、可见键盘焦点和中文操作提示；queue/match 时禁用选角，结果/idle 可改角并再匹配。移除 practice DOM/button lookup/事件监听/离线模拟分支及对应提示，产品只展示联机。

原双人 Intro255 展示所选名字/Exhibition，保留2s再3*dt淡出，不人为延迟开赛。自然结果采用 FinishOverlay269.frame1 装饰和4.5*dt淡入，显示服务器胜者/比分，按钮发送重新进入匹配而非本地同房restart；这是联网所需的明确动作适配。保留异常结束原因及可再次匹配按钮。业务倒计时、scores/result 以服务器为准。结果粒子、遮罩不拦截 leave/rematch 菜单，narrow/short 屏幕菜单可达。

## Validation, publication and rollback

先按源数值、角色动作/变换、特效帧/声音触发的独立证据建立测试；检查 FX 关闭/开启不改变 gameplay RNG 或球/分；真实本地 HTTP/WS 验证两身份不同选角、同 tick 球与比分一致、严格输入/重连/旧协议拒绝/房间回收。再运行 lint/typecheck/tests/build 和隔离 HTTP/资源哈希检查，随后做用户已授权的原 SWF compatibility-runtime 与本地 H5 浏览器对照。

保持线上版本到验收完成；最终发布只切本项目的 frontend/backend release，保留先前 release 及 Cookie secret。版本回滚前后端一起恢复，页面需刷新；服务重启丢失内存比赛。原始文件/恢复脚本/研究工具不进 dist/client；其他三个入口及服务不变。physical 双机、移动设备、其他浏览器和弱网手感仍需外部验收，不承诺延迟数值。
