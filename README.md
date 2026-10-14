# 火柴人羽毛球 H5 在线对战

独立项目目录 `/home/ubuntu/stickman-badminton-h5-online/`，公网入口 https://www.firesoul.cn/badminton-h5-online/ 。浏览器本地 Canvas 2D 绘制，Node.js 服务器权威模拟，通过同源 WebSocket 联机。

在游戏内选择角色并点击开始匹配，两名游客进入同一房间，无需账号、密码或昵称。双方都用 A/D 或 ←/→ 移动，W/↑ 跳跃，S/↓/空格挥拍与发球。先到 7 分获胜，结束后可换角色再次匹配。右侧按 A 向球网前进。匹配、选角、取消、结束和静音控件位于放大的游戏区域内，也提供触屏操作。

## 当前玩法来源

当前内核迁移自 4399 Flash《火柴人打羽毛球2》：https://www.4399.com/flash/90302.htm 。已保存原发布 SWF、112 个恢复脚本、完整时间轴/形状 XML 及完整恢复归档。共享 TypeScript 迁移原版人类双人动作、球路、碰撞和计分，Canvas 绘制原版派生素材，恢复击球闪光、星形球尾、Toaster 烟雾、自然胜利彩屑及原音效。

原双人模式的七个角色全部直接开放：Average Joe、Naughty Nadia、Hairy Harry、Flying Toaster、Pirate Pete、Top Hat Sam、The Red Dude；双方可选相同角色。正式产品只保留在线双人，不提供 AI 对练、闯关、解锁和存档。原始单人代码仍完整归档。

[GAME_SOURCE.json](GAME_SOURCE.json) 记录当前来源与范围，[reference/flash-90302/](reference/flash-90302/) 保存未修改 SWF、恢复脚本、压缩 XML 和逐文件哈希。这是编译文件的恢复输出，不是作者原始开放源码工程。保留原作 Effing Games 等版权标识，未核实开放源码授权，不添加或宣称 MIT。

此前社区仓库 https://github.com/LoveSeele-max/stickman_badminton_h5 、提交 `1a8799e65a39f7dafab2075c9297d8e4965f1ecb` 已停止用于正式玩法。`upstream/` 和 `UPSTREAM.json` 保留历史副本及版本核验，不参与生产构建；该提交也未发现许可证声明。已有游客联机与部署能力从本项目保留。

## 本地开发

需要 Node.js 24+。依赖与 lockfile 独立，`.npmrc` 仅为本项目设置 npm 官方 registry。

```bash
cd /home/ubuntu/stickman-badminton-h5-online
npm ci
npm run dev
# http://127.0.0.1:5184/badminton-h5-online/
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

前端端口 5184，后端只绑定 127.0.0.1:8794；Vite 代理本项目 API/WS。生产服务运行期间，本地验证应使用其他端口及独立代理，避免进入线上队列。两名游客需不同浏览器配置或独立 Cookie；同一浏览器多个标签页属于同一游客，只允许一个活动连接。

测试覆盖原版来源/七角色几何、动作事件、球路/碰撞、计分、预测、效果/音频生命周期、协议、身份校验与真实 HTTP/WebSocket 七分比赛。常规命令不会自动启动浏览器。素材重建方法见 [tools/flash-assets/README.md](tools/flash-assets/README.md)。

## 结构与网络

`src/shared/classic/` 是无 DOM 的原版模拟及动作数据，`src/shared/` 提供协议和适配；`src/server/` 负责游客 Cookie、内存匹配、房间和权威循环；`src/client/` 负责输入、预测/校正、插值与 Canvas；`public/classic/` 是原版可见图层。`reference/` 和 `upstream/` 不进入公网静态目录。

模拟与输入为 60 Hz，快照为 30 Hz，按原版 60 fps 动作时间轴推进。积压输入合并为最新持有状态和按下沿，不额外运行模拟帧。客户端只预测自己的角色，按 ack 恢复权威状态并重放未确认操作；羽毛球、比分和结果由服务器裁决。对手和球按单调自适应时间轴插值，断档保持最新权威状态；输入独立于RAF按60Hz采样，发送成功后才消费边沿。原SVG滤镜通过有界栅格缓存复用，效果使用去重事件和独立呈现时钟。RTT 不等于按键动作延迟，实体双机与弱网手感须另行验收。

协议为 v3（`badminton-v3`），旧页面须刷新。角色选择在排队和房间内锁定；断线清键并暂停，原 Cookie 的席位保留 15 秒。重连建立效果事件基线，不重播旧声音；服务重启会清空内存比赛。

设计：[docs/design.md](docs/design.md)。发布、日志和回滚：[docs/deployment.md](docs/deployment.md)。实际验证与外部双机验收：[docs/validation.md](docs/validation.md)。

卡顿诊断可显式使用`?debug=1`和`window.badmintonDiagnostics.snapshot()`；默认关闭且不上报。实际测量与限制见[验证记录](docs/validation.md)，诊断字段见[部署文档](docs/deployment.md)。
