# 数据契约

每条序列的 `heightArr` 与 `value` 按下标对齐。组件使用两者中较短的长度。

| 字段 | 含义 |
| --- | --- |
| `series` | 廓线数组。每项含 `key`、`name`、`color`、`heightArr`、`value` |
| `heightArr` | 高度，单位 m |
| `value` | 与高度对齐的数值 |
| `heightMin` / `heightMax` | 高度轴范围，默认 0 和 10000，单位 m |
| `unit` | 数值的显示单位，例如 m/s |
| `title` | 图题。未包含单位时，组件在标题后补上单位 |
| `empty` | 为 true 时不画序列，显示无数据 |
| `valueDecimals` | 提示框小数位，默认 2 |
| `theme` | `dark` 或 `light` |
| `palette` | 覆盖主题里的单项颜色 |

缺测不参与折线，也不参与横轴范围。数值 0 参与绘制和横轴范围。
