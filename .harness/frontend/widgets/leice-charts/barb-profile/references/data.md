# 数据契约

`heightArr`、`value`、`dirArr` 按下标对齐。组件使用三者中较短的长度。

| 字段 | 含义 |
| --- | --- |
| `heightArr` | 高度，单位 m |
| `value` | 风速，单位 m/s |
| `dirArr` | 来向角度。0 度在正上方，顺时针增大 |
| `heightMin` / `heightMax` | 高度轴范围，默认 0 和 10000，单位 m |
| `title` | 图题，默认「风羽」 |
| `color` | 风羽颜色。未传入时跟随主题 |
| `theme` | `dark` 或 `light` |
| `palette` | 覆盖主题里的单项颜色 |

风速、风向、高度任一缺测，该层不画。数值 0 是静风，要画杆。
