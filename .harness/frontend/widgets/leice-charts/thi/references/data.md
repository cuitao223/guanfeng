# 数据契约

| 字段 | 含义 |
| --- | --- |
| `times` | Unix 秒，或 `YYYY-MM-DD HH:mm:ss` |
| `heightArr` | 高度，单位 m，与 `values` 的列对齐 |
| `values` | `values[时间下标][高度下标]` |
| `windpara` | 可选。`windpara[i][2]` 为该时刻覆盖时长，单位秒 |
| `breakpoints` / `colors` | 色标断点与颜色，由调用方传入 |
| `colorMode` | `linear` 或 `threshold` |
| `heightMin` / `heightMax` | 高度轴范围。不传时用高度数组两端 |
| `unit` | 数值单位，只用于轴旁文字 |
| `theme` / `palette` | `dark` 或 `light`，以及单项颜色覆盖 |

缺测格子不参与填色和双线性采样。数值 0 参与。

大量数据仍使用上面的二维数组。组件内部打包成类型化数组，并按屏幕像素采样，位图宽不超过 480、高不超过 320。替换 `times`、`heightArr` 或 `values` 的数组引用后才会重新打包；就地改格子不会触发重绘。
