# 雷达序列接口契约

版本 `0.1.0`。本文件与语言无关。Java 17 加 Spring Boot 3.2 的参考实现在 `.harness/backend/code/leice-radar-series-service/`，其他技术栈按本文档实现同一套接口即可。

字段名来自前端绘图组件的入参，不按实现语言命名。组件选型见 `.harness/frontend/skills/leice-chart-mapping/SKILL.md`，测量文件的门面和列名见 `.harness/data/skills/leice-radar-series/SKILL.md`。

## 通用约定

| 项 | 约定 |
| --- | --- |
| 基础路径 | `/radar/series`。网关前缀由部署决定，页面用 `VITE_APP_BASE_API` 拼，不写死主机 |
| 方法 | 取数用 GET 和查询参数 |
| 鉴权 | 沿用平台的 `Authorization: Bearer <token>`，本组件不实现登录 |
| 语言 | 请求头 `X-Lang`。`Cn` 返回中文，其他或缺省返回英文 |
| 响应信封 | `code`、`msg`、`data`。成功 `code` 为 `200` |
| 失败 | HTTP 状态保持 `200`，业务码写在 `code`，`data` 为 `null` |
| 时间 | `YYYY-MM-DD HH:mm:ss`，本地时间，不加 `Z`。也接受 Unix 秒 |
| 缺测 | 有限数 `999` 或小于等于 `-999`。`null`、空串、非有限数等同于缺测，服务端统一成 `999` |
| 网格 | `values[行][列]`。行是时间或角度，列是高度或距离 |
| 高度与距离 | 从列名读取，例如 `127m WindSpeed`，单位 m。不把分辨率写死 |
| 文件参数 | `file` 是数据目录内的相对路径。目录外路径返回 `400` |

成功响应示例：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

本文档没有列表接口，因此不涉及 `rows` 和 `total`。新增列表接口时按平台约定补这两个字段。

## 接口总览

| 接口 | 用途 | 前端组件 |
| --- | --- | --- |
| `GET /dbs/wind-profile` | 水平风羽时高图 | `barb-thi` |
| `GET /dbs/vertical-wind` | 垂直风时高图 | `thi` |
| `GET /dbs/snr` | 信噪比时高图 | `thi` |
| `GET /dbs/temperature-humidity` | 温湿双轴折线 | `dual-axis-line` |
| `GET /dbs/height-obtain-rate` | 高度获取率 | 统计柱状图 |
| `GET /ppi/scan` | PPI 径向风、信噪比、谱宽、谱强 | `scan`，`mode` 为 `ppi` |

## DBS 风廓线

### `GET /dbs/wind-profile`

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `file` | 是 | DBS 测量文件相对路径，文件名形如 `lidarWind`、`DBS5`，但以表头为准 |

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "times": ["2026-07-01 00:00:00", "2026-07-01 00:01:00"],
    "heightArr": [100.0, 200.0],
    "values": [[5.2, 6.8], [5.6, 999.0]],
    "dirs": [[180.0, 190.0], [185.0, 999.0]],
    "unit": "m/s"
  }
}
```

`values` 是风速，`dirs` 是来向，0° 在正上方，顺时针增大。风速和风向必须同时有效：任一侧缺测时两边都写 `999`。

### `GET /dbs/vertical-wind`

`file` 同上。`values` 取 `ZWind`，`unit` 为 `m/s`。

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "times": ["2026-07-01 00:00:00", "2026-07-01 00:01:00"],
    "heightArr": [100.0, 200.0],
    "values": [[0.12, 0.08], [0.1, 0.06]],
    "unit": "m/s"
  }
}
```

### `GET /dbs/snr`

`file` 同上。`values` 取 `MeanSNR(dB)`，`unit` 为 `dB`。展示换算口径未确认前返回原始值，不做缩放。

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "times": ["2026-07-01 00:00:00"],
    "heightArr": [100.0, 200.0],
    "values": [[28.5, 27.1]],
    "unit": "dB"
  }
}
```

### `GET /dbs/temperature-humidity`

`file` 同上。每行输出一个温度和一个湿度，不区分高度。

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "times": ["2026-07-01 00:00:00", "2026-07-01 00:01:00"],
    "temperature": [12.5, 12.6],
    "humidity": [62.0, 61.4]
  }
}
```

### `GET /dbs/height-obtain-rate`

`file` 同上。口径是各高度层 `DataObtainRate` 在时间上的算术平均，保留两位小数，缺测不参与平均。

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "name": "高度获取率",
    "categories": ["100m", "200m"],
    "values": [99.67, 98.0]
  }
}
```

上传率、异常率、完备率与 `height-obtain-rate` 共用 `name`、`categories`、`values` 形状，但测量文件没有给出公式。口径确认前不提供这三个接口，也不要用高度获取率顶替。

## PPI 扫描

### `GET /ppi/scan`

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `file` | 是 | PPI 测量文件相对路径，文件名形如 `3D_scan`、`PPI`、`LOSWind`，但以表头为准 |
| `product` | 否 | `wind`、`snr`、`spectralWidth`、`spectralIntensity`，缺省 `wind` |

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "mode": "ppi",
    "angles": [0.0, 30.0, 60.0],
    "heightArr": [100.0, 200.0],
    "values": [[15.8, 15.1], [15.5, 999.0], [15.2, 14.8]],
    "pitch": [2.0, 2.2, 2.5],
    "unit": "dB"
  }
}
```

- `angles` 是方位角，升序。`heightArr` 是距离门。
- `pitch` 与 `angles` 一一对应，单独返回，不放进 `values`。
- 单位按产品：`wind` 为 `m/s`，`snr` 为 `dB`，`spectralWidth` 为 `MHz`，`spectralIntensity` 为 `dB`。

RHI 尚未实现。不要用 PPI 的 `azimuth` 冒充 RHI 的俯仰角。

## 字段来源

| 接口字段 | DBS 列 | PPI 列 |
| --- | --- | --- |
| `times` | `Date_time` | `Date_time` |
| `heightArr` | 列名前缀高度 | 列名前缀距离 |
| `values` 风速 | `WindSpeed` | —— |
| `dirs` | `WindDirection` | —— |
| `values` 垂直风 | `ZWind` | —— |
| `values` 信噪比 | `MeanSNR(dB)` | `SNR` |
| `temperature` | `Temperature` | —— |
| `humidity` | `Humidity` | —— |
| `values` 高度获取率 | `DataObtainRate` | —— |
| `values` 径向风 | —— | `RadialWind(m/s)` |
| `values` 谱宽 | —— | `SpectralWidth` |
| `values` 谱强 | —— | `SpectralIntensity` |
| `angles` | —— | `Azimuth` |
| `pitch` | —— | `Pitch` |

`StdDev`、`Max WindSpeed`、`Min WindSpeed`、`ZWind StdDev` 已经读入样例模型，但当前接口不输出。

## 错误码

| 业务码 | 场景 | 文案键 |
| --- | --- | --- |
| `400` | 缺少 `file` | `radar.error.fileRequired` |
| `400` | 文件不存在 | `radar.error.fileNotFound` |
| `400` | 路径在数据目录外 | `radar.error.pathOutsideDataDir` |
| `400` | 文件超过大小上限 | `radar.error.fileTooLarge` |
| `400` | 不支持的 `product` | `radar.error.product` |
| `500` | 文件无法解析，列缺失或时间格式错误 | `radar.error.parse` |
| `500` | 未预期异常 | `radar.error.internal` |

前端 `src/utils/errorCode.js` 已经给 `401`、`403`、`404` 配了固定文案，拦截器会优先使用，服务端 `msg` 会被替换。所以这里的业务失败放在 `400` 和 `500`，保留具体原因。

失败响应示例：

```json
{
  "code": 400,
  "msg": "测量文件不存在：dbs-sample.csv",
  "data": null
}
```

## 实现说明

- Java 参考实现：`code/leice-radar-series-service`，包 `com.leice.radar`。
- 布局按表头判断：有 `Azimuth` 列就是 PPI，否则有高度前缀列就是 DBS。文件名只作提示。
- 同一时刻或同一方位角的重复行保留首次出现，输出按时间或方位角升序。
- 字段名和形状以本文档为准。换语言实现时不需要保留 Java 的类名、包名和注解。
- 本契约不含文件列表接口。文件由平台的资料或设备管理接口提供，页面把相对路径传给 `file`。

## 版本记录

| 版本 | 变更 |
| --- | --- |
| `0.1.0` | 首个版本。DBS 风羽、垂直风、信噪比、温湿、高度获取率，PPI 扫描四类产品 |
