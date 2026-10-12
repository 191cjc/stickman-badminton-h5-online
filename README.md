# 火柴人羽毛球 H5 在线对战

独立项目目录 `/home/ubuntu/stickman-badminton-h5-online/`，公网入口 https://www.firesoul.cn/badminton-h5-online/ 。浏览器本地 Canvas 2D 绘制，Node.js 服务器权威模拟，通过同源 WebSocket 联机。

点击开始匹配，两名游客进入同一房间；无需账号、密码或昵称。左右双方都用 A/D 移动、W/空格跳跃、S 挥拍/发球，也支持方向键。先到 7 分获胜，结束后可再次匹配。右侧向球网前进的按键是 A。提供离线 AI 练习与触屏按钮。

## 来源

社区源码：https://github.com/LoveSeele-max/stickman_badminton_h5 ，提交 `1a8799e65a39f7dafab2075c9297d8e4965f1ecb`。`upstream/` 保留下载副本，`UPSTREAM.json` 记录逐文件 Git blob 核验以及已知 Vite 部署改动。复用运动、跳跃、挥拍、发球、球路、碰撞、计分、AI 和 Canvas 画风。

核对该提交根目录没有许可证文件，README 没有授权声明。不自行添加或声称上游采用 MIT。首版保留社区程序绘制的画面，原版素材替换留待后续评估。

## 本地开发

需要 Node.js 24+。依赖与 lockfile 独立，`.npmrc` 仅为本项目设置 npm 官方 registry。

```bash
cd /home/ubuntu/stickman-badminton-h5-online
npm ci
npm run dev
# 打开 http://127.0.0.1:5184/badminton-h5-online/
```

前端端口 5184，后端只绑定 127.0.0.1:8794。Vite 代理本项目 API/WS。两名游客需不同浏览器配置或独立 Cookie；同一浏览器多个标签页属于同一游客，一个活动连接限制会拒绝第二个标签页。

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

测试包含原始社区模拟对照、预测重放、远端插值、输入范围与真实 HTTP/WebSocket 的完整七分比赛、身份校验、重连、房间回收。不会自动启动浏览器。

## 结构与网络

`src/shared`：无 DOM 模拟、实体、物理、逻辑协议和共享角色步进。`src/server`：游客 Cookie、内存匹配、房间、权威循环。`src/client`：输入、角色预测/校正、远端插值与绘制。`upstream` 不参与生产构建。

物理沿用 120 Hz，输入发送/采样 60 Hz，快照 30 Hz。每次采样使用最新的按键状态；积压帧合并跳跃/挥拍按下沿，并保留挥拍时的方向组合，避免网络短暂积压继续拖延后续操作，也不通过多跑物理步加速角色。客户端根据 ack 恢复权威角色并重放未确认操作，平滑小误差；羽毛球与比分不参与本地预测。对手和球缓冲约 66.7 ms 插值，断包时保持最后状态。RTT 是通信往返时间，不等于按键到动作延迟。

详细评估与实施计划：[docs/design.md](docs/design.md)。发布和回滚：[docs/deployment.md](docs/deployment.md)。验证范围与双机清单：[docs/validation.md](docs/validation.md)。
