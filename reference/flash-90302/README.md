# Flash 原版 90302 参考

来源：https://www.4399.com/flash/90302.htm 。原游戏版权标识为 Effing Games，原发布程序还包括第三方库。未核实原作开放源码许可证，不赋予 MIT 或其他许可。

original.swf 是未修改的发布文件；scripts/ 是 JPEXS 26.3.0 从字节码恢复的 112 个 ActionScript 脚本，含混淆标识符，不是作者原始工程。original.xml.gz 是同一 SWF 的完整时间轴/形状/矩阵导出，gzip 固定 mtime=0；SOURCE.json 保存 URL、大小与 SHA-256。

该目录只用于可复查的移植、资源生成和行为对照，不属于 public/ 或运行时 import。派生 Canvas 资源与共享 TypeScript 内核分别生成，不执行原发布程序里的广告、赞助链接或统计模块。

从 XML 重建数据无需修改或重新编译原 SWF。重新导出时可使用 JPEXS 26.3.0 的 -export script 和 -swf2xml；原始文件保持冻结。
