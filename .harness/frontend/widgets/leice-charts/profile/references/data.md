# 数据契约

`heightArr` 与 `value` 按下标对齐。组件使用两者中较短的长度。

| 字段 | 含义 |
| --- | --- |
| `heightArr` | 高度，单位 m |
| `value` | 与高度对齐的数值 |
| `heightMin` / `heightMax` | 高度轴范围，默认 0 和 10000，单位 m |
| `unit` | 数值的显示单位，例如 m/s |
| `title` | 图题。未包含单位时，组件在标题后补上单位 |
| `color` | 折线颜色，默认 `#4EA8FF` |
| `valueDecimals` | 提示框小数位，默认 2 |
| `xDomain` | 固定横轴范围。数据超出时向外扩展 |
| `theme` | `dark` 或 `light` |
| `palette` | 覆盖主题里的单项颜色 |

缺测不参与折线，也不参与横轴范围。数值 0 参与绘制和横轴范围。


可选heightUnit默认m，GFS位势高度传gpm；纵轴和提示框同步显示该单位。
