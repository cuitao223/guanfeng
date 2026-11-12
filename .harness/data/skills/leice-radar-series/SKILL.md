---
name: leice-radar-series
description: 把激光雷达测量文件整理成绘图接口。垂直风、信噪比、风羽、扫描、统计率和温湿趋势要对接数据时使用。页面不解析测量文件。
---

# 雷达测量数据到绘图接口

本技能给后端服务使用。服务读取测量文件，整理成接口。页面只请求接口，再按 `leice-chart-mapping` 把字段交给组件。

不要在 `.harness/frontend` 里解析这些文件。不要把服务代码写进 `.harness/`。Java 工程以后单独放置，本技能只规定文件和接口。

文件里没有经纬度。这些接口不提供地图风羽、填色或粒子要的网格。

## 文件

编码 UTF-8，逗号分隔。高度和距离单位是 m，风速单位是 m/s。

两类文件：

| 类型 | 文件名特征 | 一行的含义 |
| --- | --- | --- |
| DBS 风廓线 | `lidarWind`、`DBS5` | 一个观测时刻的整条廓线 |
| PPI 平面扫描 | `3D_scan`、`PPI`、`LOSWind` | 一个方位角的径向扫描 |

两类都有 `Date_time`、`Temperature`、`Humidity`、`Pressure`。温度单位是 °C，湿度是百分数，气压是 hPa。

DBS 在公共字段之后，按高度重复 9 列。高度写在列名前缀，例如 `127m WindSpeed`。服务从列名读取高度，不把分辨率写死。

| 列名后缀 | 含义 |
| --- | --- |
| `WindSpeed` | 水平风速 |
| `WindDirection` | 风向，0° 为北，顺时针 |
| `MeanSNR(dB)` | 平均信噪比 |
| `DataObtainRate` | 该层数据获取率 |
| `StdDev` | 风速标准差 |
| `Max WindSpeed` | 最大风速 |
| `Min WindSpeed` | 最小风速 |
| `ZWind` | 垂直风速 |
| `ZWind StdDev` | 垂直风速标准差 |

PPI 在公共字段之后还有 `Azimuth`、`Pitch`，再按距离重复 4 列。距离同样写在列名前缀。

| 列名后缀 | 含义 |
| --- | --- |
| `RadialWind(m/s)` | 径向风速 |
| `SNR` | 信噪比 |
| `SpectralWidth` | 谱宽 |
| `SpectralIntensity` | 谱强度 |

文件中的时间形如 `YYYYMMDD HH:mm:ss`，秒的小数可有可无。接口改成 `YYYY-MM-DD HH:mm:ss` 或 Unix 秒。按本地时间理解，不追加 `Z`。

缺测保持有限数 `999`，或小于等于 `-999`。空字段和 `NaN` 在服务里改成 `999`。组件据此跳过格子。

列名上的单位只描述原始列。接口中的 `unit` 是页面传给组件的展示单位。信噪比、谱宽、谱强需要换成展示值时，在服务内完成。组件不再换算。

## 接口

字段名与 `leice-chart-mapping` 的入参一致。`values` 的形状是 `[时间或角度下标][高度或距离下标]`。

DBS 风廓线：

| 接口字段 | 来源 | 组件 |
| --- | --- | --- |
| `times`、`heightArr`、`values`、`dirs` | `WindSpeed`、`WindDirection` | `barb-thi`。`values` 为风速，`dirs` 为来向 |
| `times`、`heightArr`、`values` | `ZWind` | `thi`。`unit` 为 `m/s` |
| `times`、`heightArr`、`values` | `MeanSNR(dB)` 的展示值 | `thi` |

气象站温湿，每个时刻各一个数，不是高度层：

| 接口字段 | 来源 | 组件 |
| --- | --- | --- |
| `times`、`temperature`、`humidity` | `Temperature`、`Humidity` | `dual-axis-line`。左轴温度，右轴湿度 |

上传率、异常率、完备率、高度获取率共用一个形状：`name`、`categories`、`values`。四个率不要各定义一种响应。

高度获取率可以从各层 `DataObtainRate` 汇总。上传率、异常率、完备率不是原始列。测量文件没有写明公式时，服务不要自造公式，先保留字段，等口径确认后再计算。

PPI 只返回页面选定的一层产品：

| 接口字段 | 来源 | 组件 |
| --- | --- | --- |
| `angles`、`heightArr`、`values`、`unit` | `Azimuth`，以及径向风、信噪比、谱宽、谱强中的一层 | `scan`，`mode` 为 `ppi` |

`angles` 是方位角。`heightArr` 是距离门。俯仰角单独返回，不放进 `values`。

## 页面

页面请求上述接口，不打开测量文件。绘图组件 id 以 `.harness/frontend/skills/leice-chart-mapping/SKILL.md` 为准。
