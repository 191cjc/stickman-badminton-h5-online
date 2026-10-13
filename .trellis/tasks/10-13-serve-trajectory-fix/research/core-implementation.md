# Flash 90302 数值内核移植记录

实现位置：`src/shared/classic/{types,player,birdie,ai,simulation}.ts`。本记录依据冻结的 `reference/flash-90302/scripts/` 恢复代码和从 SWF XML 生成的 `assets-data.ts`，不是原 Flash 运行对照报告。普通角色 Joe 是首版唯一角色；不依赖社区的球路、移动或挥拍内核。

## 方法映射

| 冻结 ActionScript | TypeScript | 迁移内容 |
| --- | --- | --- |
| `§_-0V§/§_-18§.as` 构造函数 | `player.createClassicPlayer` | Joe 移动、跳跃、力量倍率均为 1，初始脚点 left150/right500、y400 |
| `§_-0V§/§_-h§.as` `setupServe` | `player.setupClassicServe` | 发球锁、动作选择、距网 145、AI 发球位置与跳发概率 |
| 同文件 `setupOverhead`/`setupUnderhand`/`swingMe`/`swingBack` | `player.startClassicSwing`/`advanceClassicAnimation` | 原碰撞区选择高低手，按键锁存，帧锁；frame15/10 关闭接触，frame27/19/23 恢复 |
| 同文件 `humanControlHandler`/`jumpMe`/`handleEnterFrame` | `player.stepClassicPlayer` | 225 直接移动；跳跃 -400；重力1200；墙/网/发球边界；运动与动画共享给预测 |
| 同文件 `serveBirdie` | `simulation.releaseServe` | 1485、±40°；第7帧释放，显式原版发球点 |
| 同文件 `§_-48§` | `simulation.tryContact` | 恢复球拍 hitbox2 AABB；高点1575及帧旋转角+30，低手1638/1449及固定±40°；每挥拍一次接触 |
| 同文件 `§_-2p§` | `ai.classicAiIntent` | 原右侧 AI 追球/返家/延时发球/击球/跳跃；明确拒绝自己的最后一球 |
| `§_-2g§/§_-24§.as` `§_-5z§` | `birdie.launchClassicBirdie`/`predictClassicLanding` | 角度写入、落点预估；预估使用原侧墙与网侧规则，不加入原预估中没有的网顶反弹 |
| 同文件 `§_-3Q§`/`handleEnterFrame` | `birdie.stepClassicBirdie` | 先重力后拖曳、墙反弹、路径4次采样、网顶优先、网侧、落地反弹 |
| `§_-2s§/§_-u§.as` `§_-3F§`/`§_-43§`/`handleEnterFrame` | `simulation.setupRally`/`awardPoint`/`step` | 左→右→球推进；pointActive 单次计分；得分者下一次发球，间隔1.5秒，7分结束 |
| `bobby/§_-3e§.as` `§_-12§`/`§_-2m§`/`§_-7§` | `birdie.classicShotVelocity`/`stepClassicBirdie` | 原角度0向上、+90向右；速度/朝向换算 |
| `bobby/§ null§.as` `play`/`stop`/`§_-4e§` | `player.advanceClassicAnimation` | 原自定义 MovieClip 时钟、循环及帧事件，替代环境 callback |
| `bobby/§_-0v§.as` callback loop/`getTimer` | `simulation.update`/`elapsed` | 显式60Hz步长、可暂停计时，输入边沿仅首个推进消费 |
| `bobby/§_-3e§.as` 随机函数 | `simulation.random` | 采用可记录 xorshift32，传入 AI/网顶数值判定；不使用浏览器/Node 墙钟或 Math.random |

## 必须保留的原数值细节

- SWF 场地 640×426，脚/地面 y400，球墙 x33/607，玩家墙 x48/592。实际网对象 x317.25，不能用画面中点320代替。
- Joe 显示/球拍碰撞采用 ±1.25/+1.25。原 `serveBirdie` 却明确将未乘1.25的 `servePoint` 直接加在角色位置上；球创建点保存这一规则（±28.45,−22.25），没有用更漂亮的手部位置代替。
- underhand 选择读取网顶实例原点 y323.75，而不是生成 AABB 顶 y319.0378；近网选择读取网侧实例原点 x316.3。几何 API 提供二者。
- 运行中的球仅 `abs(dy)>0` 才加重力，随后速度乘 `pow(.96,60dt)`；预估落点则始终加重力，按原代码保留差别。侧墙反弹系数−.8、反弹后最低水平速度200；网侧−.1/.1；网顶 dy−100、低水平速±150；地面dy−.4。
- 没有社区的挥拍取消、移动加速、连按排队或持键自动补击。按住只挥一次；动作未归位时新按压被丢弃。玩家接触判定没有新增“最后击球者相同”过滤，不预先宣称所有玩家连续触球不可能。
- AI“normal”使用原首关移动倍率1.1、错误阈值100；“boss”使用原最后一关倍率1.15、阈值35。角色均限制为 Joe；不迁移原闯关其他角色。随机消费不包含垃圾话/烟花/粒子等装饰，所以不能保证与未种子化 Flash 完全相同的随机序列。

## 动画时钟和执行顺序

原作的 `§ null§` 覆盖 MovieClip play/stop，自行注册到 `§_-0v§` callback 列表，不是直接依赖 Flash 原生自动推进。PlayState callback 在 stage 加入/角色动画 callback 之前注册，因此保留“左人物→右人物→球→动作时间轴”的数值顺序。发球帧事件在这个更新末尾创建球；新球下一次推进才受重力/阻力。

`stop` / `gotoAndStop` 将 clock 置为 `currentFrame / fps`；`§_-4e§` 计算 `floor(clock / period)+1`。在 setupServe 已对三个动作 gotoAndStop(1) 重置后，**恰好1/60秒**的第一次 play callback 会经过 frame2 到 frame3；未经重置的 stage 初始 clip 时钟为 0，首次只推进到 frame2。重置后的发球第7帧在第5个数值 tick（0.0833秒）发生。移植保留此计算，并只对浮点边界加入1e−9稳定量。此项尚需原 Flash 运行日志核对；恢复代码/本实现测试自身不能代替运行证据。原运行 dt 16/17ms 交替也可能改变第一步采样。

## 为浏览器/权威服务采用的明确边界

- `update` 固定60Hz，单次只接受最多0.25秒、15步的 catch-up；暂停不推进动画、AI 或分间计时。避免原 getTimer clamp 的单位混用，不把长停顿转为数十秒同步推进。
- 游戏停止于7分 `matchEnd`；分间保留落地后的球反弹，pointActive 保证不重复加分。停止之后不再判定接触/新发球。分间开始新挥拍被抑制，不把无效动画变成有效碰撞。
- 游客断线暂停由房间层控制，本内核不读取 socket / Cookie / timeouts。预测与权威共享 `stepClassicPlayer`；客户端只读取球位置作动作选择，不改球或比分。
- Snapshot 深拷贝角色 AI、球、比分；全部可 JSON 序列化。它包含 RNG 和动作/锁存/计时数据，但不是完整恢复 checkpoint（私有 accumulator、待消费输入、诊断记录不在传输快照中）。
- AI 延时200/300/1000ms 改为 elapsed 截止时刻；暂停期间不偷偷触发。仍采用源代码右侧 AI，首版不承诺任意侧 AI/其他角色。

## 验证证据

`npx vitest run tests/classic/core.test.ts`：20 tests passed。测试预期由冻结 AS 数值/公式及独立选定场景给出，没有通过调用另一个复制移植方法作为 oracle。覆盖：左右发球过网、初速度/坐标/帧事件，225/−400/1200运动、双方边界、重力后拖曳、墙/网顶/网侧/4次路径采样、地面单次计分/1.5秒/七分、持键/动作锁、合法高点回球、原区低手选择、normal/boss种子AI完整比赛及无己方出球接触、双侧双按+单跳/推进轨迹网格、预测共享/深拷贝/确定性/小步边沿/长dt/暂停/分后接触。

双按轨迹网格覆盖两侧 second press 0.2～1.2秒、跳跃0.1～0.4秒或不跳、发球后向网移动；这批场景没有再次打中自己的发球。它只证明这些输入，不排除其他球路下玩家同侧重复接触。

实际 Flash 执行、动画事件日志、完整跨浏览器和双公网电脑手感由主任务独立研究/验收记录；此报告不宣称这些已验证。本轮核心 agent 未发布、重启服务或修改旧入口。


## 最终复核更正

首次未重置角色动作的 handleStageAdd 时钟为 0，精确 60Hz 首次播放 1→2；setupServe 对三个 clip 的 gotoAndStop(1) 将各时钟重置为 1/fps，随后 1→3，发球第 7 帧在第五个固定 tick 释放。最终实现保留各动作独立 clip 帧、时钟与播放状态，隐藏的原动作继续到 frame1 stop；上述实现早期描述中的统一初始 1→3 不再代表全部动作。球网也已按原版 play 不倒带规则接入 24 帧权威动画，跨回合保留。最终复核见 check-report.md；这些数值是恢复源码依据，原生 Flash 时间日志仍未取得。
