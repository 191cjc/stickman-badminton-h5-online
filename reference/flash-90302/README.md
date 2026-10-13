# Flash 原版 90302 参考

来源：https://www.4399.com/flash/90302.htm 。原游戏版权标识为 Effing Games，原发布程序还包括第三方库。未核实原作开放源码许可证，不赋予 MIT 或其他许可。

original.swf 是未修改的发布文件；scripts/ 是 JPEXS 26.3.0 从字节码恢复的 112 个 ActionScript 脚本，含混淆标识符，不是作者原始工程。original.xml.gz 是同一 SWF 的完整时间轴/形状/矩阵导出，gzip 固定 mtime=0；SOURCE.json 保存 URL、大小与 SHA-256。

该目录只用于可复查的移植、资源生成和行为对照，不属于 public/ 或运行时 import。派生 Canvas 资源与共享 TypeScript 内核分别生成，不执行原发布程序里的广告、赞助链接或统计模块。

从 XML 重建数据无需修改或重新编译原 SWF。重新导出时可使用 JPEXS 26.3.0 的 -export script 和 -swf2xml；原始文件保持冻结。

## 2026-10-13 全量恢复归档

用户确认的游戏页面标题为《火柴人打羽毛球2》，路径为 `/upload_swf/ftp8/caoxinxin/20120530/3.swf`。本次重新下载的原文件与冻结 SWF 字节一致：3,388,558 bytes，SHA-256 `cab8a824c54af3a0b9454ef30fcbcabc532931f2a96717239fabd58f57e59912`；声明与实际解压后长度均为 3,567,799 bytes。重新恢复的 XML 与现有 XML 完全相同，全部 112 个 AS 文件也与现有 scripts/ 字节相同。

`full-export.tar.xz` 保存不筛选角色、类别或帧的全量恢复输出；`ARCHIVE.json` 保存归档及逐文件 hash、按资源 ID 和帧对账的覆盖清单。生产用 `public/classic/` 是此前选择的素材子集，不能代表原作全部资源。

| 发布文件中的内容 | 全量恢复范围 |
| --- | --- |
| ActionScript | 全部 112 个 AS 脚本、112 个 P-code/hex 输出、2 个原始 ABC，867 个方法体保留在原字节码/XML |
| 动画时间轴 | 主时间轴 104 帧、191 个 sprite 共 1,363 帧，总计 1,467 帧；每帧独立 SVG 和完整 XML/raw 标签 |
| 形状 | 169 个 shape、2 个 morphshape，保留每个 ID 的独立 SVG |
| 图片/字体 | 16 张位图、7 个内嵌字体 |
| 文字/按钮 | 93 个静态文字、12 个编辑文字、31 个按钮的 124 个状态 |
| 音频 | 全部 12 个 DefineSound 音频，以及 AS Embed 使用的音频副本 |
| 内嵌引用 | `export/scripts/_assets/assets.swf` 与全部 12 个音频引用；逐项核验 Embed 的 source/symbol 可解析 |
| 全部标签 | 原 SWF、完整 XML、原始标签头与数据，包括未知 tag255，不依赖 SVG/XFL 能否表达运行行为 |

归档内主要路径：`original.swf`、`original.xml`、`raw/`、`export/`、`pcodehex/`、`reconstructed-xfl/`、`COVERAGE.json`、`download.json`、`source-page.html`、`source-page.json`、`recovery.json`、`abc-url-constants.json`、`external/`、`EXTERNAL.md` 与导出日志。Java 配置和临时 profile 不入归档。XFL 是反编译重建工程，不是作者原始 FLA 工程。

全部角色选择脚本 `sliders/Slider{Joe,Harry,Champ,Robot,TopHat,Pirate,Nadia,Timmy}.as` 均在归档内。击球闪光 `fx/BigSpark.as`（symbol278）、羽毛球尾迹 `fx/ParticleBirdie.as`（symbol245）及其他粒子也在其中，并包含对应元件的全部帧。这次完整保存不表示这些功能已经接入 H5；当前上线版本仍需后续逐项移植与视觉对照。

## 校验与解包

```bash
python3 tools/flash-archive/archive.py verify \
  --archive reference/flash-90302/full-export.tar.xz \
  --manifest reference/flash-90302/ARCHIVE.json

# 按需解到研究目录，不要解到 public/ 或部署目录
mkdir -p artifacts/flash-full-unpacked
tar -xJf reference/flash-90302/full-export.tar.xz -C artifacts/flash-full-unpacked
```

恢复及打包命令见 [tools/flash-archive](../../tools/flash-archive/README.md)。校验工具核对每个文件的长度/hash，并从原 SWF/XML 重新推导资源 ID、帧、脚本身份和 Embed 引用覆盖，遗漏会失败。原作者未公开的 editable 工程无法从公开发布文件取得；本归档不宣称取得它。

## 外部依赖

原游戏的角色、特效、场景、菜单和音效均嵌入 SWF，没有额外 gameplay 素材下载。代码里的 Kongregate SDK 和 CPMStar 广告 Loader 已下载当前公开 SWF，并保存全部可恢复脚本/资源/XML/P-code。下载证据覆盖广告调用实际使用的 `poolid=12941`、`subpoolid=7/8`，它们不是缺失的游戏角色或尾迹。

补充下载的广告 watermark 中字体 ID2/6 是零字形的设备字体占位符，没有内嵌数据可导出为 TTF；原外部 SWF/XML 完整保留，并在 `external/RECOVERY.json` 逐项记录。主游戏的 7 个字体均已导出，该限制属于外部组件。

Playtomic 服务域名目前 DNS 解析失败，两种协议的失败证据已保存；调用代码完整保留。广告服务的变化内容、排行榜/统计服务器实现和作者未公开工程不能当作已下载游戏源码。详情与外部/间接静态依赖下载证据在归档 `EXTERNAL.md`、`external/requests.json`、`external/transitive-requests.json` 中。外部 SWF 均未执行，当前下载也不证明其与 2012 年版本相同。
