# Flash 90302 原版素材与碰撞数据实现

实现日期：2026-10-13。归属：assets implementer。没有提交、发布、重启服务，未运行浏览器或公网比赛。

## 已实现文件

- `tools/flash-assets/extract.py`：读取冻结 `reference/flash-90302/original.xml.gz`，解析 `PlaceObject`/`RemoveObject` 持续属性、嵌套矩阵、Joe 标签、球拍碰撞及场景命中框，生成数值数据与仅含所选画面依赖的无脚本派生 SWF XML。
- `tools/flash-assets/build.py`：校验冻结 SWF/XML 哈希与 JPEXS26.3.0，调用隔离 Java/JPEXS 导出。中间产物及日志只写到 `artifacts/flash-asset-build/`。
- `tools/flash-assets/finalize.py`：校验无脚本、事件处理、远程链接的 SVG，记录原注册点、恢复原 JPEG bitstream 以避免转成巨大 PNG、生成资源哈希。
- `tools/flash-assets/README.md`：重建依赖、完整命令、数据与图层接口、证据限制。
- `src/shared/classic/assets.ts`、`assets-data.ts`：浏览器与权威模拟共用原版数值，服务器不依赖 DOM/Java/SVG。
- `public/classic/manifest.json` 与129个 SVG：共1,583,660原始图像字节；画面为原版 Joe、动作、羽毛球、比赛背景及网。
- `tests/classic/assets.test.ts`：7项必要资产/来源/行为数据测试。

## 精确数值接口

与 core/integration implementer 已协调：

`classicGeometry` 包含 Joe 局部 `servePoint`、`underhandZone`、`computerZone`，以及场景 `net.x/side/top/sideOrigin/topOrigin`。

- Joe 注册点为脚底；局部数值与画面均不预乘原版运行时 ±1.25/+1.25 角色缩放。
- 发球实例点为 `{x:28.45,y:-22.25}`。
- 实际网实例 x 为317.25，非逻辑画面中央320。
- 网侧命中框 `{x:300.04499515,y:319.6801945,width:32.5100097,height:114.739611}`，其对象原点 `{x:316.3,y:377.05}`。
- 网顶命中框 `{x:299.64124705,y:319.037849375,width:33.3175059,height:9.42430125}`，其对象原点 `{x:316.3,y:323.75}`。
- 原代码使用对象原点判断高/低手选择；不能用碰撞矩形左上角替代。

`racketPose('serve'|'underhand'|'overhead', frame)` 按1开始索引，返回 currentSwing 局部 `racket.rotation` 度数及所有 Joe→动作→球拍→body→hitbox2→shape109 嵌套变换后的舞台轴向 AABB，对应原 `hitTestPoint(..., false)`。末帧钳制。Joe 所有父标签的动作挂载及选择区矩阵已验证不变。

`classicAnimation` 为fps60、serve23/release7、overhead27/contactEnd15、underhand19/contactEnd10，独立测试对照恢复帧脚本中的0基事件位置。

## 画面接口与可见性

manifest schema1，DrawFrame为 `{path,x,y,width,height}`，相对于 `classic/` 的 URL。普通身体/跳跃各1个静态图；前进/后退各16个嵌套帧，八个腿姿态各保持2帧。core提供 `bodyFrameIndex`，切换身体标签时复位。动作分别23/19/27帧。

按原Joe深度顺序先绘制当前动作，再绘制身体；身体不含三个挥拍兄弟实例或透明AI/低手选择区。发球动画自身前6帧含附着球，第7帧移除；移动球从原发球事件生成。背景仅包含scene344深度1/3/6/8/10；网为单独世界坐标图层，有可选24帧原反弹动画。原UI、赞助按钮、触发区、玩家占位及所有脚本均排除。JPEXS显示图的边界可能超出640×426；Canvas按原视口裁切。

原PNG栅格转换被替换为冻结XML里的原JPEG比特流，未二次重压缩，图像体积由3,075,006降至1,583,660字节。

## 验证及限制

- `npx vitest run tests/classic/assets.test.ts`：7项通过。
- 针对assets.ts/assets-data.ts/assets.test.ts的ESLint通过。
- 全项目 `npx tsc --noEmit --pretty false` 在同伴内核接入完成后通过。
- `python3 -m py_compile tools/flash-assets/*.py` 通过；临时pycache已移除。
- 使用完整build.py两次重导出，131个图像/manifest/数值输出 SHA-256逐项一致；随后缩减派生SWF为实际素材依赖闭包，再次重导出仍逐项一致。
- 冻结SWF/XML从不改写，来源未发现开放许可，不标MIT。

明确精度与证据边界：曲线选择区为原二次贝塞尔轮廓，按≤0.01Joe局部像素误差展平，共248/326个点；这是对Flash精确shapeHit边界的小量近似。球拍/网框使用原SWF矩阵和ShapeBounds完整精度。JPEXS的SVG矩阵字符串保留四位小数，渲染误差独立于服务器的完整数值精度。当前资产测试不证明Flash实机事件顺序或浏览器绘制效果，原运行器/浏览器/双机/弱网手感由主任务分别验证。
