# 数据契约

页面准备好字段后再传入。组件不请求接口。

## 底图

| 字段 | 含义 |
| --- | --- |
| `mapStyle` | `satellite` 或 `vector` |
| `satelliteTiles` / `vectorTiles` | `{ base, label }`。`base` 和 `label` 是页面配置的瓦片地址模板 |
| `center` | `[经度, 纬度]` |
| `zoom` / `zooms` | 当前缩放和允许范围 |

未传入视图时使用参考页的初始视图，数值在 `assets/logic/view.mjs`。

## 高度

`heightMode` 为 `single` 或 `multi`。单层的场景高度是 0。多层是 `高度 * heightSize * exaggeration`。`levels` 的每一项含 `height` 和 `header`。

网格头含 `nx`、`ny`、`lo1`、`la1`、`lo2`、`la2`、`dx`、`dy`。点序从北向南、从西向东。`9999` 是缺测。色斑图像的行布局、u/v 解码和步长公式见 [风场图像到上图](wind-image.md)。

## 风场、风羽、粒子

`speeds` 与网格等长。风羽还要 `dirs`，0 度为正北，顺时针增大。

`colorStyle` 为 `smooth` 或 `contour`。`opacity` 默认 0.8，并限制在 0.1 到 1。色标默认 0 到 10，11 档，颜色在 `legend.mjs`。

`density` 是风羽疏密，限制在 0.25 到 1.5。`zoom` 决定抽稀步长。

粒子 `multiplier` 默认 2，限制在 0.1 到 5。`mapStyle` 决定风羽和粒子用黑色还是白色。

## 报警

`warnType` 为 `horizontal`、`vertical`、`gale`，空字符串表示不画。`values` 与网格等长，由页面准备。水平、垂直切变来自切变图解码，大风来自风速。`thresholds` 按类型给出 `min`、`medium`、`max`，来自告警列表；缺任一项则不画。`mapStyle` 决定边界线用白色还是黑色。

## 设备点

`longitude`、`latitude`、`deviceNo`。`variant` 为 `circle` 或 `icon`。图标变体还要 `iconUrl`。悬停发出 `hover`。

## PPI

`angles` 与 `values` 按行对齐。`ranges` 是各行共用的距离门，单位 m。`field` 为 `speed` 或 `snr`。`999` 不画。`renderHeight` 与 `renderMaxHeight` 是停止绘制的距离。`metersToScene` 由页面按地图坐标换算。


## 规则格点与显示投影扩展

header.pointGrid为true时，边界跨度使用(nx-1)*dx和(ny-1)*dy；默认仍为旧色斑单元约定。header.displayCorners可提供tl/tr/bl/br的地图坐标，用于切片和粒子平面；header.displayCoordinates可提供与网格等长的坐标数组，用于风羽落点。原始经纬度头保留用于数据取值。WindBarbLayer.sizeScale仅放大绘制符号，默认1，不改变风速。
