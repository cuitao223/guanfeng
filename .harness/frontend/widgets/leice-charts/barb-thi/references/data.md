# 数据契约

| 字段 | 含义 |
| --- | --- |
| `times` | 时间。Unix 秒，或 `YYYY-MM-DD HH:mm:ss`。数值时间按秒，格式化时间按本地时间解析，不追加 Z |
| `heightArr` | 高度，单位 m |
| `values` | 风速，`values[时间下标][高度下标]` |
| `dirs` | 风向，来向，单位度。与 `values` 同形状。0 在正上方，顺时针增大 |
| `heightMin` / `heightMax` | 高度轴范围。不传时用 `heightArr` 的两端 |
| `unit` | 提示和色标单位，默认 `m/s` |
| `breakpoints` / `colors` | 风速色标。默认 `[0, 10]` 与两色只是示例回退，不是产品风色标 |
| `colorMode` | `linear` 或 `threshold` |
| `legendPlacement` | `right` 或 `bottom`，默认右侧 |
| `theme` | `dark` 或 `light` |
| `palette` | 覆盖绘图区颜色。不是公司令牌 |

缺测：有限数 `999`，或小于等于 `-999`（含 `-1000`）。`null`、`undefined`、空串、非有限数视为空，不绘制。风速和风向必须同时有效。

`threshold` 要求断点个数等于颜色个数加 1。`linear` 按断点与颜色等长插值，并钳制到两端。
