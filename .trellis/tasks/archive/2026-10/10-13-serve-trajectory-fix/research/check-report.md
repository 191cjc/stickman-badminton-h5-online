# Flash 90302 迁移复核

复核时间：2026-10-13；角色：Trellis check。遵循已批准 PRD/design/implement，不递归分派、不提交、不发布、不重启服务、不占用公网匹配队列。主会话同时负责原 SWF/浏览器运行对照、文档/specs、Git 与发布。

## 已修复

### 各动作 MovieClip 的独立时钟

原 `bobby/§ null§.as:95` 的 `handleStageAdd` 最终把 clock 置为 0；`stop` 和 `gotoAndStop` 则存 `currentFrame / fps`。`§_-h§.setupServe` 明确将三个动作都 `gotoAndStop(1)`。此前迁移只用一个 clock，初值一律 1/fps，且结束低手/发球时直接重置到高点，丢失第一次接球者动作和不可见兄弟动作的时钟。

主会话确认把这两项差异纳入已批准迁移后，新增 `src/shared/classic/animation.ts`，以 `swingClips` 分别保存 serve/underhand/overhead 的 frame、clock、playing。新建 clip 从 0 开始；setupServe 重置三个 clip 为 1/fps；动作切换保留目标 clip 时钟；发球/低手最后一帧切换可见动作之后，原 clip 继续到第 1 帧 stop。现有 active flat fields 继续供渲染/碰撞使用，序列化深拷贝兄弟 clip 状态，预测继续复用同一推进逻辑。

新增 3 项回归测试覆盖初次非发球角色 1→2、已重置/已停止 clip 1→3、所有 clip 的 setupServe 重置、隐藏发球/低手继续完成及再次切换使用自身时钟。恰好 1/60 秒的发球仍在第五个数值 tick 穿过第 7 帧释放。此为冻结恢复代码与数值测试的证据，不是 Flash 原生实机帧日志。

### 球网动画及舞台裁切

原 `§_-24§.§_-3Q§` 在网顶/网侧碰撞后调用 net.play；net 对应 symbol330/`Symbol44hsrthtr.as`，24 帧、frame1 stop。此前虽导出 24 张网动画图，渲染只读静态第一帧。

模拟新增独立 `net` clip 状态，碰撞 play 不倒带，球推进之后按共享时钟推进，回合重置保留该 clip。快照深拷贝 net；客户端加载全部 netFrames 并选择权威帧。资源生成器从冻结 XML 读取 net.frameCount，生成数值数据，避免只修改生成文件。Canvas 明确裁切到 640×426 舞台，符合超出视口的原背景导出边界。

新增 1 项回归覆盖第一次播放、再次碰撞不倒带、循环到 frame1 停止及停止后重播；资产测试独立核对 symbol330、frame1 stop 和 XML 24 帧，快照测试增加 clip/net 深拷贝断言。

## 复核范围及结论

- 正式 shared 适配、server 和练习均依赖 ClassicSimulation；历史 upstream 不参与正式玩法；shared 无 DOM、Node、墙钟或未种子化随机调用。
- 恢复 AS 的移动/跳跃/球速度、重力后拖曳、侧墙、球网四次路径采样、网顶优先、落地单次计分、1.5 秒下一发球及 7 分结果与迁移代码核对。
- Joe 原运行缩放 ±1.25/+1.25、发球点显式不缩放、球拍 hitTestPoint(false) AABB、选择区曲线和单一可见动作与资产数据接口核对。选择区 0.01 局部像素展平近似和 SVG 矩阵四位小数保留既有证据限制。
- 原 AI 最后击球者检查保留；未给原人类玩家碰撞添加同侧最后击球者禁令。双按网格只证明测试轨迹无自身重触，不保证所有人类轨迹都不会出现同侧连续接触。
- 服务端每次 60 Hz 步进只合包采样一次，步进后 ack，30 Hz 快照；收到多个包不加速模拟。客户端只预测自身角色，球/碰撞/分数/结果继续权威；远端插值不会创造动作帧分数或外推碰撞。
- Cookie/Origin/严格输入解析/席位绑定/断线清键与暂停/同游客重连/到期弃权/房间回收/再次匹配边界保留；真实 HTTP/WS 测试覆盖这些行为。v1 仅获 protocol_mismatch+1008，未绑定 Guest.socket 或席位。
- 浏览器原版对照、Canvas 实际效果、外部两台电脑和弱网体验由主会话分别记录。本报告未执行浏览器，不把恢复代码数值测试当作原版运行对照。

## 未在本代理处理的事项

无剩余运行时代码阻塞项。项目 specs 及 core/integration/asset 实施报告中有关单一动作时钟、无网动画、旧社区世界/120 Hz 的叙述需由主会话同步；这些文件属于主会话文档收尾范围，未并发改写。其他角色、鼠标专用角色、闯关、音效/粒子/赞助 UI 不属于首版普通角色对战验收，不宣称整套 Flash 原作完全还原。

## 最终验证

- `npm run lint`：通过。
- `npm run typecheck`：通过。
- `npm test`：6 个测试文件、78 项通过，包含真实本地 HTTP/WS 完整七分比赛（约 21.7 秒全套）。
- `npm run build`：通过；Vite 客户端与独立 Node 服务端构建成功。
- `git diff --check`：通过。
- 本轮仅重新运行数值提取并生成 assets-data；没有重写冻结原 SWF/XML/ActionScript。无需重新导出 SVG，因为增加的是读取既有网时间轴帧数，不改变画面几何或资源。

主会话应在最终构建上重跑已授权的关键浏览器操作，因为本复核修改了动作初次推进和网动画资源加载；完成后再按独立 release 流程发布。

## 文档与发布脚本补充复核

主会话同步文档/specs/来源和发布脚本后，本代理再次核对其最终内容。已机械更正原版不使用 hitMove 选择击球角度、移动采用最新状态、落点预估与实时球路有原源码差别、人工验收中的侧墙反弹与脚下侧别标记，以及 Network/Service 测试证据的准确表述。没有改变游戏运行代码。

HTTP 检查增加 manifest schema/640×426 断言，并对实际取回的背景、球和球网 SVG 字节计算 SHA-256，核对 manifest.files；来源字段表述为来源记录，避免把公开清单值当作下载原 SWF 的字节核验。公共比赛脚本使用初始角色坐标作为移动/跳跃基线，符合 Flash world；发布包保留 GAME_SOURCE.json/UPSTREAM.json，不把 reference 和研究工具放入公网目录。

所有受检本地 Markdown 链接均解析到存在的文件/目录；`git diff --check`、publish/rollback 的 bash 语法与两项 Node 检查脚本语法均通过。此轮只检查文档/脚本，没有重跑未修改的全套运行测试、浏览器或任何公网匹配/发布动作。此前 78 项测试及构建通过结果继续适用；主会话仍需补入实际浏览器与发布结果。
