# 数据契约

`layers` 里的每一层使用源页面数据对象的字段名。`timeArr` 与各要素数组按时间下标对齐。填色和风羽的第二下标是高度门。

| 字段 | 含义 |
| --- | --- |
| `timeStart` / `timeEnd` | 时间窗。支持 `YYYY-MM-DD HH:mm:ss` 和 Unix 秒。都缺省时从各层 `timeArr` 取范围 |
| `heightMin` / `heightMax` | 高度轴范围，默认 0 和 10000，单位 m |
| `key` | 层标识 |
| `drawType` | `fill`、`line` 或 `windBarb` |
| `name` / `unit` / `color` | 提示和描边 |
| `visible` | 为 false 时不画该层 |
| `timeArr` | 时间字符串或 Unix 秒 |
| `heightArr` | 共用高度数组，或按时间分列的二维高度 |
| `value` | 填色值，`value[时间][高度]` |
| `breakpoints` / `colors` / `colorType` | 填色色标。`colorType` 为 `linear` 或 `threshold`。有断点和颜色的可见填色层各显示一条色标 |
| `legendPlacement` | 色标位置，`right` 或 `bottom`，默认 `right`。底部时各条横向排列，单条最宽 420px，超出后水平滚动。双击色标后也可改，并作用于全部色标 |
| `tickSide` | 刻度在色带的 `left` 或 `right`，默认 `right`。每条色标可单独改 |
| `tickGap` | 色带与刻度的间距，默认 8。每条色标可单独改 |
| `opacity` | 填色不透明度，默认 0.7 |
| `tempArr` / `heightValueArr` | 等温线。`heightValueArr[温度序号][时间]` 是高度 |
| `speed` / `dir` | 风羽风速和来向，形状与 `value` 相同 |
| `density` | 风羽抽稀步长。未设置时用组件的 `windDensity`，默认 3 |
| `smooth` | 折线是否平滑，默认平滑 |
| `windBarbScale` / `windBarbLineWidth` | 风羽尺寸和线宽，默认 0.8 和 1 |
| `theme` / `palette` | `dark` 或 `light`，以及单项颜色覆盖 |

时间按本地时间理解，不追加时区后缀。数值 0 参与填色和风羽。
