# 验证记录与外部验收

## 代码与协议验收

执行 `npm run typecheck`、`npm run lint`、`npm test`、`npm run build`。测试复用上游的 math/flight/AI 用例，新增原模拟对照、预测重放、回合校正、插值断包、严格输入校验，以及真实 Node HTTP/WebSocket 服务测试。完整比赛测试通过两名不同 Cookie 的客户端发送操作，核对两端七分结算相同。

通过脚本 HTTP 检查公网 HTML、JS/CSS、健康、游客 Cookie 与 WebSocket 同源握手；三条已有游戏入口需继续返回 200。没有自动启动浏览器。

## 2026-10-12 实际执行结果

- 发布版本 `20261012T063353Z`，独立入口 https://www.firesoul.cn/badminton-h5-online/ 。systemd 服务 active/running，后端仅监听 127.0.0.1:8794，`nginx -t` 通过。
- 类型检查、lint、生产构建通过；6 个测试文件共 20 项通过。新增积压输入合并测试证明最新方向及时生效，跳跃按下沿和挥拍方向组合保留；不通过更多物理步加速角色。
- 公网 HTTP 检查：页面 200，JS/CSS 两个构建资源 200，健康正常，生产 Cookie Secure/HttpOnly/SameSite 正确，WebSocket 成功接收协议 v1 hello。
- 公网协议完整比赛：两名独立 Cookie 客户端匹配，验证移动/跳跃，发球至自然七分结算（7:0），双方 548 组权威状态一致，再匹配和主动结束均通过。测试后 rooms=0、queued=0。这个测试由脚本执行，没有打开浏览器，不构成画面或手感验收。
- 原社区试玩 `/badminton/`、原版验证 `/badminton-original/`、云游戏 `/badminton-cloud/` 均保持 HTTP 200；三份旧 Nginx snippets 与原社区核心源码 SHA256 检查通过。共享 HTTPS server 仅增加本项目 include。云游戏 MainPID 仍为 1311812，启动时间仍为 2026-10-10 15:31:12 CST，未重启。
- 有上一版本 `20261012T063027Z` 可供回滚；回滚脚本通过 shell 语法检查，未额外重启线上服务执行回滚演练。

复验命令：

```bash
npm run typecheck && npm run lint && npm test && npm run build
node scripts/http-check.mjs https://www.firesoul.cn
node scripts/public-match-check.mjs https://www.firesoul.cn
```

`public-match-check.mjs` 会建立两个测试游客并匹配比赛，建议在队列为空时运行，避免与真实等候玩家配对。HTTP 检查只做握手，不加入匹配。原始结果保存在 `artifacts/public-http-check.json` 与 `artifacts/public-match-check.json`，本地 artifacts 不进入版本控制。

## 已实现与效果边界

实现的协议流程：游客、开始/取消匹配、双人权威模拟、发球/移动/跳跃/击球/计分、结束/再匹配、失焦清键、断线暂停/重连/回收、席位保护与输入校验。客户端已经加入角色预测、按 ack 重放和小幅平滑校正、对手与羽毛球快照插值，以及 AI 练习。

代码/HTTP 验证不等于真人双机验收。画面、操作节奏、跨网络手感、触屏、浏览器兼容性与实际弱网表现待下面的人工检查；不提前承诺任何按键延迟数值。

## 人工双机检查（不自动运行）

1. 两台电脑不同浏览器 Cookie，打开公网入口，各点击开始，确认自动匹配、各自颜色/左右席位、同样按键只控制自己。
2. 双方轮流发球；移动跳跃挥拍，确认球路连续，观察球网、落地、出界、得分；完成 7 分比赛，核对双方比分/赢家与再次匹配。
3. 比较按键后的本地动作、服务器校正时的位置变化、对手/球画面；记录浏览器、网络、页面 RTT。RTT 不是动作延迟，需视频或按键事件/绘制时间测量才能给出延迟结论。
4. 按住移动时切出窗口/隐藏页面，返回确认没有卡键；比赛中关闭一个页面，另一端应显示暂停；15 秒内原浏览器重开应恢复原席位，超时则结算并可再匹配。
5. 同 Cookie 开第二标签页，确认不能夺取活动连接；独立第三名游客只能等待新的匹配。
6. 通过系统网络限速/丢包测试输入积压、插值卡顿与断线反馈。首版延迟明显时优先调整快照缓冲/输入处理；不要增加客户端球路判定造成双方比分分歧。
7. 手工确认 Chrome/Edge/Firefox 及手机横屏的 Canvas 缩放、触屏取消、按钮与失焦反馈；检查三个既有入口仍可进入。
