# 开发、发布、日志与回滚

## 独立资源

- 入口 `/badminton-h5-online/`；同源 `/badminton-h5-online/api/` 和 `/badminton-h5-online/ws`。
- Node 监听 `127.0.0.1:8794`；systemd 名 `badminton-h5-online.service`。
- 版本目录 `/opt/stickman-badminton-h5-online/releases/`，`current` 原子符号链接指向当前版本，`previous` 记录前一版本。
- 配置 `/etc/badminton-h5-online.env`（root 0600），服务 `/etc/systemd/system/badminton-h5-online.service`。
- Nginx snippet `/etc/nginx/snippets/badminton-h5-online.conf`，仅在 www.firesoul.cn 的现有 HTTPS server 中新增 include。不改社区试玩、原版验证、云游戏代码/服务/路由。现有 HTTPS 由 TCP443 转发到 Nginx 8443 的设置继续沿用。

## 启动与构建

本地 `npm ci && npm run dev`，访问 `http://127.0.0.1:5184/badminton-h5-online/`。生产 `npm run build` 输出 `dist/client` 和 `dist/server/index.js`。运行时仅依赖 ws；Nginx 提供静态文件，Node 不提供前端页面。

生产 env 示例见 `ops/production.env.example`。Cookie 密钥生成一次并跨版本保留；生产没有有效密钥则拒绝启动。重启清空房间/队列；已签名 Cookie 可经 session 接口继续识别游客。游客无需新建账号。

## 发布

```bash
cd /home/ubuntu/stickman-badminton-h5-online
bash scripts/publish.sh
# 或 bash scripts/publish.sh release-20261012-a
```

脚本先完成安装、类型检查、lint、测试、构建，再准备新版本目录和生产依赖，安装独立 unit/snippet；仅在 env 不存在时生成密钥，仅在 include 缺失时新增本项目 include。`nginx -t` 通过后才切换 current、更新 previous，随后刷新 systemd 配置、启用并重启本服务、检查本地健康、reload Nginx，最后进行公网 HTTP 与 WebSocket 检查。发布会清空本项目内存比赛；现有云游戏不重启。

已完成本地质量门并验证过构建、且 unit/snippet/env 均无需变更时，也可只将已验证的 `dist`、package/lock 与来源JSON安装到新release，安装生产依赖，更新previous并原子切换current，再重启本站服务。无需重写共享配置或reload Nginx；保存前后审计、loopback及公网HTTP/WS结果，失败立即切回旧完整release。该路径不跳过构建／代码／隔离HTTP与已授权浏览器检查。具体执行版本记录见[验证记录](validation.md)。

首次共享 Nginx 文件的副本保存在 `/etc/nginx/sites-available/flash-global-data.before-badminton-h5-online`。若配置校验失败，Nginx 不 reload，先检查新 snippet/include；不要直接恢复旧备份覆盖他人后续配置。只撤销本次新增 include，重新 `sudo nginx -t`。

## 日志和健康

```bash
sudo systemctl status badminton-h5-online.service --no-pager
sudo journalctl -u badminton-h5-online.service -n 100 --no-pager
sudo journalctl -u badminton-h5-online.service -f
curl -fsS http://127.0.0.1:8794/badminton-h5-online/api/health
node scripts/http-check.mjs https://www.firesoul.cn
# 需要完整协议对战检查时，确认没有真实玩家排队后执行：
node scripts/public-match-check.mjs https://www.firesoul.cn
sudo nginx -t
```

日志记录房间创建、断线、结束和回收，不输出游客 Cookie/密钥。HTTP 检查验证网页、构建资源、Secure/HttpOnly/SameSite Cookie、WS 同源握手，并检查三条现有游戏入口返回 200；没有浏览器自动化。

## 回滚

```bash
bash scripts/rollback.sh
# 或 bash scripts/rollback.sh 20261022T072020Z-speed-manual-controls
curl -fsS https://www.firesoul.cn/badminton-h5-online/api/health
```

回滚只切换本项目 current 并重启本服务，前后端同步回退，不改变 Cookie 密钥，内存房间重置。当前Pixi版的 `previous` 为 `20261022T072020Z-speed-manual-controls`，仍为协议5，保留原Canvas绘制和球速／手动挥拍功能；回滚后双方刷新页面，并运行公网HTTP检查。更早的球速／手动挥拍升级曾以 `20261019T083234Z-controls-gamepad`（协议4）为回滚目标，跨协议时须使用目标版本检查器，旧v1按键偏好仍保留。首次发布没有 previous；如需撤下入口，停止本服务、从 HTTPS server 中删除本项目新增 include，`nginx -t` 后 reload Nginx。本项目目录保留供恢复；不要移除已有游戏 snippets。

## 玩法版本与来源

当前七角色双人内核使用协议 v5（`badminton-v5`、`flash-90302-v3`，快照含 `ackTick` 和本场 `shuttleSpeed`）。发布时前后端和 `GAME_SOURCE.json`、历史 `UPSTREAM.json` 一起保存到 release；冻结 SWF、恢复脚本和研究工具不进入公网目录。旧 v1/v2/v3/v4 页面会在绑定席位前被拒绝并要求刷新；回滚至旧社区版本后也应刷新，两种状态不能混用。准确release及检查结果见验证记录；版本切换后须刷新以使用对应前端。

本项目 CSP 保留 `img-src 'self' blob:` 和 `script-src 'self'`；当前Pixi版彩屑使用构建阶段烘焙的双纹理及shader着色，不再运行时生成着色SVG。发布不放宽CSP，不更改其他游戏的策略。

常规发布/HTTP 脚本不自动运行浏览器。用户已授权的本地浏览器验证使用隔离后端和独立 Cookie，不与线上等待游客匹配。

## 断线与资源规则

- 活动 Cookie 只绑定一个 WS 连接；重复标签页拒绝（HTTP 409），不能抢占席位。
- 失焦、隐藏或 pagehide 清空按键并发送 release。即使 release 丢失，750 ms 没有新输入也会清键；关闭 WS 清双方输入并暂停比赛。
- 断线席位保留 15 秒，原 Cookie 重连后恢复；超时判对方胜，双方都离线则无获胜方，并释放房间。心跳每 5 秒检查，静默网络故障通常需要一个至两个心跳周期才被识别；断线保留计时从服务器确认断开开始。
- 正常结束的结算保留 30 秒，可提前再次匹配释放旧席位；主动结束视为弃权。队列 120 秒未匹配移除；单场最长 20 分钟。
- 会话最多 5000，房间最多 100；HTTP 初始化按真实 IP 每分钟 120 次；WS 最多 1024 字节、每秒 180 消息，输入积压最多 120 帧。序号必须连续，移动仅 -1/0/1，挥拍模式仅 auto/overhead/underhand（非按下沿必须 auto），状态/席位字段禁止。匹配档位仅数值1/1.25/1.5/2，同档配对且角色／档位在排队和比赛内冻结。以上是资源限制，不代表已完成 100 房间并发压测。
- Cookie 为 30 天、HttpOnly、SameSite=Lax、生产 Secure、Path 限定本入口。空闲内存会话 24 小时回收，下一次 HTTP 初始化可用签名 Cookie 重新建立会话。没有数据库或 Redis。

## 联网卡顿诊断

正常入口默认关闭诊断。需要本地测量时打开`https://www.firesoul.cn/badminton-h5-online/?debug=1`，在浏览器控制台执行：

```javascript
window.badmintonDiagnostics.snapshot();
```

只导出当前页面的有界统计，无上报：`frame`（帧间隔、CPU、长任务）、`network`（快照间隔/字节、RTT）、`predictionSamples`（位置校正/待确认输入年龄）、`input`（接受/拒绝数和节奏）、`scheduler`（提前发送、跳过周期）、`prediction`（固定步、锚点对齐、近似回退/过期/暂停）、`renderer`（WebGL上下文、图集页/解码/上传）、`interpolation`（缓冲/停顿/回跳）。每个滚动摘要为`{samples,mean,p95,max}`，最多240样本；未进房时prediction缺失、未采样时renderTick为null。计数可累计，图集rgbaBytesEstimate为页宽×高×4的RGBA估算。

`quality`记录原生/有效DPR、世界缩放、世界密度上限、阶段和降低次数，以及有界观察计数、宽限和冷却剩余时间。stage/cap为0表示原生档，实际下降可跳过无用的较高档。此自适应功能在默认关闭诊断时同样运行，只降低内部Pixi画布分辨率，窗口大小和原版效果保持；页内再次匹配保留，刷新重新评估。`interpolation`同时提供实际最新权威与呈现的差距`availableMs`、恢复次数及上次恢复跨度；不要只看目标`delayMs`。

帧间隔/长任务需一起判断；RAF中的CPU时长不包含所有浏览器延迟栅格工作。RTT和插值delayMs均不等于按键到画面延迟。计时器独立于RAF但仍运行在主线程；真实弱网停顿无法靠客户端虚构球路消除。每次实际发布的版本和回滚目标见[验证记录](validation.md)，前后端一起切回并刷新页面。

## Pixi 构建与发布

2026-10-23 已发布 `20261023T031945Z-pixijs-webgl`，当前渲染为PixiJS WebGL。使用通过typecheck、lint、24文件458项测试及构建的产物，按上述保留基础设施路径安装；只重启本站服务，未reload Nginx。发布记录及回退目标见[验证文档](validation.md#2026-10-23-pixijs-公网发布)。后续部署前运行 `npm ci`、`npm run assets:verify` 和通常的质量/构建命令，完整复制 `dist/client/classic-atlas`（PNG MIME应为image/png）及源清单/音频。构建校验不自动烘焙；重新生成素材先按 [素材说明](../tools/flash-assets/README.md) 安装固定Chromium并执行 `npm run assets:atlas`。不要部署 tools/render-validation 或 artifacts。

继续使用原CSP；Pixi的官方免eval适配已包含在包内。公网实测JS/CSS等Vite哈希资源为immutable，源/图集manifest、index及图集PNG当前为no-cache；内容哈希PNG具备长期缓存条件，但本次未更改Nginx缓存配置，不能声称PNG已使用immutable。两个清单必须同一发布；旧页面换版后须刷新，新release不承诺提供旧版全部资源。当前本地A/B服务器刻意无Cache-Control以匹配基线，不能当作生产缓存策略验证。版本不配套会显示可重试资源不兼容，不允许部分画面继续比赛。

本地验收使用独立127.0.0.1端口18925/18926和fixture18927，见 [验证工具](../tools/render-validation/README.md)。源码基线回退点为 `pre-pixijs-20261022`（fb87796），完整历史bundle在本地 artifacts/pixi-migration/backups；生产回退使用上述完整旧release。仓库未配置remote，迁移前推送尚未完成。公网浏览器已检查冷启动、选角、速度选择与设置，未开启公网匹配；实体设备和物理双机仍待外部验收。
