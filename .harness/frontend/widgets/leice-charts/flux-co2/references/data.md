# 数据契约

| 字段 | 含义 |
| --- | --- |
| `timeArr` | Unix 秒或毫秒。小于 `1e12` 的数字按秒换成毫秒 |
| `values` | 与时间对齐的通量。垂直通量、东向通量或北向通量由 `direction` 区分 |
| `direction` | `vertical`、`east` 或 `north` |
| `inputUnit` | 原始值单位。`mass` 时显示摩尔除以 44.01；`mole` 时显示质量乘以 44.01。默认 `mass` |
| `unit` | 当前显示单位，`mass` 或 `mole`。图上切换会发出 `update:unit` |
| `theme` | `dark` 或 `light` |
| `palette` | 覆盖主题里的单项颜色 |

通量为 999、小于等于 -999、空串、`null` 或非有限数时不画。没有任何有效柱时显示「无数据」。双击色标可配置颜色、断点和位置。切换显示单位不改色标断点。
