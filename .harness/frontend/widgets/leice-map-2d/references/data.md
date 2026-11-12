# 数据契约

页面准备好字段后再传入。组件不请求接口。

## 底图

| 字段 | 含义 |
| --- | --- |
| `tileUrl` | 瓦片地址模板，由页面配置，本包不提供默认值 |
| `center` | `[纬度, 经度]` |
| `zoom` / `minZoom` / `maxZoom` / `zoomSnap` | 缩放 |
| `maxBounds` | 两个角点，`[[纬度, 经度], [纬度, 经度]]` |

未传入视图时使用参考页的初始视图，数值在 `assets/logic/view.mjs` 的 `REFERENCE_VIEW`。

## 指北标

`iconUrl`、`latitude`、`longitude`。参考位置在 `REFERENCE_NORTH`。

## 设备点

| 字段 | 含义 |
| --- | --- |
| `latitude` / `longitude` | 纬度、经度。非有限数不画 |
| `type` | 设备类型。允许列表非空时只保留列表中的类型 |
| `status` | `0` 维护，`1` 标定，`2` 运行，`3` 待机，`4` 故障，`5` 离线。未知按运行 |
| `stationNo` | 站点编号 |
| `regionInfo` | 区域名 |
| `iconUrl` | 页面按类型和状态解析后的图标地址 |
| `markerTypes` | 默认 `['1']`。空数组不画。含 `1` 显示区域名，含 `3` 不显示标签，其他非空值显示站点编号 |
| `typeAllowList` | 类型允许列表，空数组表示不过滤 |
| `activeIds` | 当前选中的站点编号 |

双击发出 `toggle`。

## 报警点

可传数组，或传以站点编号为键的对象。

| 字段 | 含义 |
| --- | --- |
| `stationNo` | 站点编号 |
| `latitude` / `longitude` | 纬度、经度 |
| `alarmType` | 数字数组。升序拼接后的键只接受 `1`、`2`、`3`、`4`、`14`、`24`、`34` |
| `maxWindSpeed` | 悬停用风速。`0`、空串和空值显示为 `-` |
| `windHeightLayer` / `lljheightLayer` | 悬停用高度层 |
| `iconMap` | 键到图标地址 |
| `show` | 为假时不画 |

悬停发出 `hover`，移开发出 `leave`，双击发出 `activate`。

## 风网格

`header` 含 `nx`、`ny`、`lo1`、`la1`、`lo2`、`la2`、`dx`、`dy`。`u`、`v` 与网格等长，行序从北向南、从西向东。u 向东为正，v 向北为正。`null` 和非有限数是缺测。

来向是 `270 - atan2(v, u)`，折回 0 到 360，单位度，0 为正北，顺时针增大。箭头使用来向加 180，可以大于 360。

从图片解码时，通道 `0` 是缺测。其余按 `min + channel / 255 * (max - min)` 映到物理量。红通道是 u，绿通道是 v。

## 风力填色

`imageUrl` 加 `bounds`，或 `header` 加 `speeds`。`directions` 与 `speeds` 对齐时才发出悬停样本。`opacity` 默认 `0.8`。缺测透明。风速断点是 0、2、4、6、8、10、12、14、16、18、20、24、27、29，单位 m/s。

## 风羽、箭头、粒子

`grid` 为 `{ header, u, v }`。`density` 取 1 到 5。风羽和箭头也可以直接传 `rows`，每行是 `[纬度, 经度, 风速, 风向]`。`form` 只能是 `barb` 或 `arrow`。

粒子倍率：1 为 `1/300`，2 为 `1/400`，3 为 `1/600`，4 为 `1/800`，5 为 `1/1000`。未识别的密度按 1。粒子色标最大风速是 15 m/s。`displayValues` 为真时，鼠标移动发出 `sample`：`{ u, v, speed }`，缺测为 `null`。
