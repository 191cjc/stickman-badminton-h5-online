# 球速场次与手动挥拍设计

## 边界与结构

沿用现有 TypeScript/Vite/Canvas 前端、Node/WebSocket 权威后端及内存队列，不引入依赖。新增 `src/shared/match-settings.ts` 作为唯一档位定义：只读数值数组 `[1, 1.25, 1.5, 2]`、派生 `ShuttleSpeed`、严格数值校验。中文 UI 标签使用 `1x` 等格式。

`ClassicSimulation` 接受 `shuttleSpeed?: ShuttleSpeed`，省略时为1，显式非法值抛错；构造后只读。只有服务器为在线房间建立模拟，客户端既不能提交位置/球路，也不能通过输入改变比赛速度。模拟快照增加 `shuttleSpeed`，状态版本升至 `flash-90302-v3`。

手动挥拍复用原有overhead/underhand及其动画、恢复锁、hitbox与出球规则。用户已确认A映射：W+J=overhead，S+J=underhand，J=auto，K=jump。绑定可修改，实际组合依动作绑定而非写死字符。两项改动共享协议5和角色/模拟所有者，按顺序里程碑在同一任务完成，避免拆成互相覆盖的协议发布。

## 数据流与协议

1. 菜单选择角色与球速 → `queue` → 共享严格解析器。
2. 队列冻结 `character + shuttleSpeed` → 同档两人匹配 → 构造带档位的模拟。
3. `queued` 回显档位；`matched` 带档位及双方角色；后续 `snapshot.state.shuttleSpeed` 为比赛配置真源。
4. 本地只预测自己的角色；球/碰撞/比分继续从权威快照插值。重连从 retained room 恢复同档。
5. 挥拍按下沿捕获auto/overhead/underhand → 严格逻辑输入 → 服务采样与自身预测使用同一挥拍模式 → 共享玩家步进 → 原有权威接触/球路。既有player.swingKind足以向两端绘制实际动作，无需客户端声明接触或球位置。

新 queue 精确为 `{type:"queue", character: CharacterId, shuttleSpeed: ShuttleSpeed}`；不接受缺失、字符串、任意倍率或多余字段。`queued` 与 `matched` 增加同名必需字段。`result` 无需重复配置：前端保存已确认的本场速度直到退出结果场景。

InputFrame在现有精确键集合中增加必需的 `swing: "auto" | "overhead" | "underhand"`。只允许hitPressed=true的帧携带强制模式；hitPressed=false时必须为auto。短按已释放而hitPressed=true/hitHeld=false是合法输入。拒绝缺失、非法类型/枚举、无按下沿的强制模式及room/side/position/contact等额外字段。

协议统一升为5 / `badminton-v5`。HTTP session/health、WS hello、前后端类型、所有当前检查脚本同步更新。服务器把v4加入已有legacy协商分支，先发protocol_mismatch并1008关闭，再进行席位/连接绑定；当前客户端已有刷新提示。seq/ack/ackTick语义、60Hz输入/模拟、30Hz快照、断线15s、结果30s保持既有合同。此次只做一次完整前后端升级，包含速度和挥拍两类新字段。

## 匹配与生命周期

保留一个有界 `Guest[]` 和现有清理路径。匹配扫描FIFO列表，用最多四项的Map记各档首位；扫描到首个已出现档位就取该档前两人。移除两人后继续，直到无同档对或达到房间容量。这样每档内FIFO，已成对的档位按完成等待顺序处理，单独等待的其它档不会阻塞。

- Guest新增待匹配档位；角色与档位都在入队时冻结。
- 重复相同请求幂等；角色或档位变更返回already_queued，须先取消。
- removeQueue、断线、120s过期和成功配对都清空两项待匹配字段。
- 房间从已验证的配置构造Simulation，不读取之后的菜单选择。
- 已完成比赛可脱离旧房并选择另一档再次排队；旧房消息不得泄漏到新房。
- 重连matched从原模拟读取速度，不受前端默认值影响；第三人仍不能指定room/side。
- health/stats继续报告队列总人数。无跨档自动降级或自动调整。

## 手动挥拍输入与动作

### 绑定与默认值

Controls新增两个可绑定修饰动作overhead/underhand，与原有left/right/jump/hit构成六项互斥物理按键绑定。默认left=A/←，right=D/→，jump=K/↑，hit=J/空格/↓，overhead=W，underhand=S。每项仍最多3个code，可清空，不使用系统Shift/Ctrl等修饰键语义。设置标签明确“高位挥拍修饰”“低位挑球修饰”，说明按住修饰后按挥拍键。W/S本身不触发跳跃或挥拍；两种修饰均按住或均未按住时auto。

标准手柄/触屏保持原有逻辑jump/hit，不增加新按钮映射或菜单。它们触发aggregate hit时若键盘修饰已按住则采用同一选择，否则auto。横向镜像只处理move，不能交换overhead/underhand或绑定；W/K等含义在左右席位一致。

### 按下沿、来源与事务

Input继续按keyboard-code、pointer-ID、gamepad分别保存动作集合；只有aggregate hit从false变true才产生一次边沿。此刻读取键盘来源的修饰并捕获swing；后续松开修饰、重复keydown、加入另一个同样按住hit的来源，都不能篡改该边沿或制造新边沿。正在播放的挥拍也不会因修饰改变而换动画。

将pending.hit从SourceKind集合扩展为最多3项的插入有序Map<SourceKind,SwingChoice>；同一来源类的新聚合边沿delete+set替换其旧记录，读取最后一个存活项。多次未发送的按下沿按现有合并语义折叠至最新，避免无界按键队列/计数器。无pending hit的帧swing=auto；保持hitHeld原有语义。gamepad清除只移除该来源的hold/pending mode，其它来源的未发送边沿与选择继续存在；全release清空所有修饰、hold与pending。logicalKey包含pending swing，确保新选择进入既有单一InputScheduler，而非新发送循环。

peek只读，Network.send同步成功后才commit、seq推进与Prediction.accept；失败保留mode及边沿。单次短按即便所有键已抬起，也能发送hitPressed=true与捕获的mode。连续发包、gamepad polling、触屏清理不重算已有pending mode。

### 采样、共享步进与预测

Server与Prediction均保留现有“最新held状态+最新hitPressed边沿”的合并模式。出现边沿时，`intent.swing`必须来自那个hit帧，与既有 `hitJump=hit.jump`取自同一帧；不能被后发的auto held帧覆盖。无hit时与held重用时置swing=auto；clear/discard路径也清空。跳跃仍是现有packet-time jump/jumpPressed/hitJump语义，不新增物理按下时间字段或伪造jumpPressed。

共享PlayerIntent可选swing（内部旧调用省略即auto），空intent明确auto。ClassicSimulation.setIntents若在尚未消耗边沿前收到后续无hit意图，必须保留未消费边沿的swing与既有hitJump负载；新的hitPressed边沿将这两者一起替换。clearEdges在消费后复位auto并清除hitJump。

startClassicSwing接受选择参数，先保留pointActive、swinging与swingFrame恢复检查，选择时serve优先，然后强制模式，否则执行原chooseClassicSwing。强制模式绕过自动球位置/球网邻近选型，但不绕过原版击球范围/接触窗口/一挥拍一次命中、也不重启现有clip。stepClassicPlayer仅在新hitPressed的有效启动中使用手动选择；held-only启动仍为auto。权威和自身预测共用此函数，预测只显示角色动作，不击球、不计分、不发权威效果。

### 旧偏好迁移

新schema/key为 `version:2` / `fiso-online:controls:v2`，精确六项绑定与gamepadEnabled，沿用4096字符/单项3键/跨动作唯一/安全存储边界。旧v1解析仍按原四项schema严格校验，仅在v2 key不存在时用于迁移；无效v2使用安全新默认，不偷偷复活旧配置。访问存储失败同样回退可用的新默认。

旧四项绑定集合等于原默认时（不依赖数组顺序），换成新六项默认并保留gamepadEnabled。真正自定义时深拷贝原四项含空绑定；仅在W/S尚未被任何动作使用时加入对应修饰，否则该新修饰为空数组。设置显示未设置并提示可自行分配；不静默覆盖其它绑定。迁移可在内存完成，之后编辑/恢复默认只写v2。保留v1存储不删除，旧完整release回滚仍能读原设置。动态help/serveHint与六项设置一起更新；“恢复默认”恢复新J/K/W/S布局。

## 只加快羽毛球

### 方案

选择羽毛球虚拟时间加速；不单独乘发球/击球初速度，也不放大整个Simulation.update的dt。源码试算表明，单独增加初速度会显著抬高球弧并延长飞行时间，偏离球速场次目标。

倍率s下每个原版60Hz权威步，玩家移动/跳跃/输入边沿、角色和网的动画、elapsed、tick、回合等待均只推进一次原始dt。1x单次球步保持原样；高档羽毛球单独执行两步，每步 `h = dt * s / 2`，每步不超过原版1/60球秒。球保持原版虚拟时间中的vx/vy/speed，真实每秒位移由倍率产生；不要将这些数值再乘倍率。

落点预估仍接收原生速度，高档采用与实际飞行一致的子步dt；两个launch入口都传本场配置。1x保留原有预估计算路径，避免运算重排导致漂移。保留原版预估忽略网顶反弹、预估重力条件不同于实际等既有差别；不把它宣称为精确碰撞预言器。目前无玩法/绘制消费者，但序列化数值仍须合理。

**1x且auto模式必须保留原先的操作顺序、单次flight及接触路径**，仅序列化多一个配置。手动挥拍是经用户要求的动作选型扩展；高速档是本项目新增玩法。分数倍率的半隐式积分会带来少量轨迹差异，不宣称与原版逐帧重合。2x每子步仍为原生1/60球秒。

### 高速接触与碰撞顺序

玩家每个真实tick只更新一次；保留各自stepClassicPlayer返回的contactOrigin（尤其Toaster的pre-bob原点）。第一次飞行前保持现有左→右的接触顺序；后续子步开始前，用当前权威球位置、同一tick的角色姿态/接触原点再检查左→右接触。沿用原版racketPose/AABB、contactEnabled和一挥拍一次接触的锁，不扩大判定框、不补发命中。

每个球子步仍按现有重力、阻尼、飞行、墙、四次球网采样、地面顺序执行。即时处理子步地面事件并awardPoint，先关掉双方接触再执行后续子步；聚合球事件供diagnostics/net动画使用。后续接触只看碰撞解决后的球位置，不跨网、墙或落地反弹连一条直线扫描。角色/发球动画回调仍在本tick球飞行之后执行，因此发球释放时机及新球下一tick开始飞行的规则不变。

两次球采样间最大原生飞行距离不超过1x；当前没有证据要求新增连续扫掠碰撞。边角擦过仍可能受原版离散采样限制，加入具体高速回球和网/地优先级夹具验证，不以扩大击球范围掩盖问题。

### 效果与预测

1x保持原版tail回调不变；高档只在最后一个球子步提供飞行后、碰撞前的tail回调，维持最多一次/真实tick的原生发射机会及native-speed概率。粒子生命周期及声音/角色效果保持真实60Hz时钟。这样高速场不因物理细分增加粒子负担，代价是高速球尾点间距更大；原版闪光与尾粒子继续存在。现有128组/30tick事件和768粒子预算仍生效，化妆随机源不得影响游戏随机源。保留原版光效/素材，不新增资源预热。

Prediction不模拟球，只接收原生球位置/速度上下文；不以档位修改角色步长。插值继续在权威快照内采样，配置变更作为语义边界清理旧段（正常同房不会变更）。球插值除state/lastTouchedBy一致外还要求rallyHits一致，避免原版允许的同侧连续击球被当成平滑飞行；不能因此增加last-toucher禁令或把每次击球变成整个插值时钟的重置。检查所有消费球速度的代码，避免重复倍率。状态版本/档位边界需与预测和插值测试一致。

## UI与焦点

在游戏内匹配操作旁加入四个原生按钮，组名“球速场次”，aria-pressed表达唯一选中值。默认1x，页面内保留最近选择用于再次匹配，不新增localStorage合同。加载期间禁用；排队及比赛期间锁定；取消和结果后允许选择。

区分“下一场菜单选择”与“当前已确认场次”，queued/matched用服务器回显更新，HUD显示例如“1.5x 场 · 轮到你发球”。结果保留本场速度，即使旧房已回收或用户选了下一场档位。重连提示继续展示本场档位。选择控件遵循既有交互元素焦点释放输入规则，不能触发挥拍。

窄屏/低高度沿用可滚动menu-panel，四档尽量一行；确保开始、取消、角色、设置可达，不遮挡比分和角落按钮。原版rematch artwork及按键/手柄/镜像逻辑保持既有所有权。

## 发布与回滚

本次无需变更路径、端口、Nginx配置、素材或生产secret。完成代码检查、构建、隔离HTTP及浏览器验证后，以已验证构建原子切换本站frontend/backend并只重启 `badminton-h5-online.service`，随后检查公开页面字节、health/hello及其它入口200。发布会清空内存房间，旧页面需刷新。保留当前v4 release作为回滚；回滚也一起切换前后端并使用该版本检查器。

## 相关证据

- `research/matching-ui-protocol.md`
- `research/physics.md`
- `research/manual-swing-controls.md`
- `.trellis/spec/{shared,frontend,backend,deployment}/` 中上下文清单所列约束。
