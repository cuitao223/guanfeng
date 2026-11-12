---
name: leice-charts
description: >-
  汇总当前已实现的激光雷达绘图组件，以及地图时间播放条、图层控制、百分比环、双轴折线、风电场控图和组网三维风场界面。在需要选择廓线、风羽、时序、扫描、霍多图、探空、二氧化碳图或这些界面组件，并读取对应组件 Skill 时使用。
---

# 绘图组件

本 Skill 只做选型。先选定组件，再只打开该组件的 `SKILL.md`。不要同时展开多个组件的源码。

当前已实现的组件：

| 需求 | 读取 | 组件 |
| --- | --- | --- |
| 单条高度廓线 | [廓线](profile/SKILL.md) | `ProfileChart`。输入 `heightArr`、`value` |
| 风羽时高图 | [风羽时高图](barb-thi/SKILL.md) | `BarbThiChart`。输入 `times`、`heightArr`、`values`、`dirs` |
| 时高填色 | [时高图](thi/SKILL.md) | `ThiChart`。输入 `times`、`heightArr`、`values` |
| PPI 或 RHI 扫描 | [扫描图](scan/SKILL.md) | `ScanChart`。`mode` 为 `ppi` 或 `rhi`。输入 `angles`、`heightArr`、`values` |
| 多条廓线叠绘 | [多廓线](profile-compare/SKILL.md) | `CompareProfileChart`。输入 `series` |
| 单时次风羽廓线 | [风羽廓线](barb-profile/SKILL.md) | `BarbProfileChart`。输入 `heightArr`、`value`、`dirArr` |
| 多层时序填色、折线、风羽 | [多层时序](thi-sequence/SKILL.md) | `ThiSequenceChart`。输入 `layers` |
| 霍多图 | [霍多图](hodograph/SKILL.md) | `HodographChart`。输入 `layers` |
| 探空风羽 | [探空风羽](sounding-barb/SKILL.md) | `SoundingBarbChart`。输入 `pressure`、`value`、`windDir`、`height` |
| 温度对数压力图 | [Skew-T](skew-t/SKILL.md) | `SkewTChart`。输入 `temperature`、`dewPoint`、`stateCurve` |
| 二氧化碳风玫瑰 | [二氧化碳风玫瑰](wind-rose-co2/SKILL.md) | `WindRoseCo2Chart`。输入 `samples` |
| 二氧化碳通量色柱 | [二氧化碳通量](flux-co2/SKILL.md) | `FluxCo2Chart`。`direction` 为 `vertical`、`east` 或 `north` |
| 二氧化碳通量日历 | [通量日历](flux-calendar-co2/SKILL.md) | `FluxCalendarChart`。输入 `rows`、`years`、`mode`、`field` |
| 地图时间播放条 | [时间播放条](time-player/SKILL.md) | `TimePlayerSlider`。输入 `live`、`playInterval`、分辨率和时间轴跨度 |
| 地图图层控制 | [图层控制](layer-control/SKILL.md) | `LayerControlPanel`。输入 `mapType`、`displaySwitches` |
| 百分比环 | [百分比环](percent-ring/SKILL.md) | `PercentRing`。输入 `percent`、`mode` |
| 左右双轴折线 | [双轴折线](dual-axis-line/SKILL.md) | `DualAxisLine`。左轴温度，右轴湿度 |
| 场站信息概览 | [场站概览](farm-status/SKILL.md) | `FarmStatusBoard`。输入 `items`、`location` |
| 今日功率预测 | [功率预测](power-forecast/SKILL.md) | `PowerForecastChart`。输入 `times`、`series` |
| 气象风层 | [风层廓线](wind-layer/SKILL.md) | `WindLayerChart`。输入 `layers` |
| 功率预测精度 | [预测精度](forecast-accuracy/SKILL.md) | `ForecastAccuracyChart`。左轴柱，右轴折线 |
| 三维风场图层控制 | [图层控制栏](wind-field-layer-panel/SKILL.md) | `WindFieldLayerPanel`。输入 `heights`。状态 `approved` |
| 三维风场工具栏 | [悬浮工具栏](wind-map-toolbar/SKILL.md) | `WindMapToolbar`。右下角圆形按钮和指北。状态 `approved` |
| 三维风场色标 | [色标条](wind-color-bar/SKILL.md) | `WindColorBar`。输入 `colors`、`domainPoints`。状态 `approved` |
| 三维风场色标配置 | [色标配置](wind-color-scale-dialog/SKILL.md) | `WindColorScaleDialog`。双击色标后打开。状态 `approved` |

字段、缺测、源码和示例都以所选组件的 Skill 为准。组件对照见 [组件一览](references/catalog.md)。

## 读取顺序

1. 用上表确定组件 id。
2. 打开 `<id>/SKILL.md`，只遵守其中的业务规则。组件能否使用以该目录 `deliverable.json` 的 `status` 为准。当前汇总包内各组件均为 `approved`。`REVIEW.md` 与 `CHANGELOG.md` 里更早的草稿字样是历史记录。
3. 需要字段时打开 `<id>/references/data.md`。
4. 需要改组件或接入页面时打开 `<id>/assets/src/` 中的源码。
5. 需要安装、构建或运行示例时打开 `<id>/README.md`。

未出现在上表中的图尚未实现。不要在本目录里查找，也不要用已有组件代替。业务图与组件的对应见技能 `leice-chart-mapping`：水平风羽用 `barb-thi`，垂直风和信噪比时高图用 `thi`，PPI 与 RHI 用 `scan`。相对湿度廓线就是单条廓线，使用 `profile`，不单列。特征高度时序图已删除；温度对数压力图页上的 0℃ 与 −20℃ 高度是指数数字，不是绘图组件。风电场控图使用上表的 `dual-axis-line`、`farm-status`、`power-forecast`、`wind-layer` 和 `forecast-accuracy`。它们是平台 SVG 组件，不另建 ECharts 生命周期。

## 目录

- `profile/`：廓线 Skill，版本 0.1.3
- `barb-thi/`：风羽时高图 Skill，版本 0.1.0
- `thi/`：时高图 Skill，版本 0.1.9
- `scan/`：扫描图 Skill，版本 0.1.1
- `profile-compare/`：多廓线 Skill，版本 0.1.0
- `barb-profile/`：单时次风羽廓线 Skill，版本 0.1.0
- `thi-sequence/`：多层时序 Skill，版本 0.1.0
- `hodograph/`：霍多图 Skill，版本 0.1.0
- `sounding-barb/`：探空风羽 Skill，版本 0.1.0
- `skew-t/`：温度对数压力图 Skill，版本 0.1.0
- `wind-rose-co2/`：二氧化碳风玫瑰 Skill，版本 0.1.0
- `flux-co2/`：二氧化碳通量色柱 Skill，版本 0.1.0
- `flux-calendar-co2/`：二氧化碳通量日历 Skill，版本 0.1.0
- `time-player/`：地图时间播放条，版本 0.1.0。页面运行副本在平台 `src/components/TimePlayerSlider`
- `layer-control/`：地图图层控制，版本 0.1.0。页面运行副本在平台 `src/components/LayerControlPanel`
- `percent-ring/`：百分比环，版本 0.1.0。页面运行副本在平台 `src/components/PercentRing`
- `dual-axis-line/`：双轴折线，版本 0.1.0。页面运行副本在平台 `src/components/DualAxisLine`
- `farm-status/`：场站信息概览，版本 0.1.0。页面运行副本在平台 `src/components/FarmStatusBoard`
- `power-forecast/`：今日功率预测，版本 0.1.0。页面运行副本在平台 `src/components/PowerForecastChart`
- `wind-layer/`：风层廓线，版本 0.1.0。页面运行副本在平台 `src/components/WindLayerChart`
- `forecast-accuracy/`：功率预测精度，版本 0.1.0。页面运行副本在平台 `src/components/ForecastAccuracyChart`
- `wind-field-layer-panel/`：三维风场左侧图层控制，版本 0.1.0，状态 `approved`。页面运行副本在平台 `src/components/WindFieldLayerPanel`
- `wind-map-toolbar/`：三维风场右下角工具栏，版本 0.1.0，状态 `approved`。页面运行副本在平台 `src/components/WindMapToolbar`
- `wind-color-bar/`：三维风场色标条，版本 0.1.0，状态 `approved`。页面运行副本在平台 `src/components/WindColorBar`
- `wind-color-scale-dialog/`：三维风场色标配置，版本 0.1.0，状态 `approved`。页面运行副本在平台 `src/components/WindColorScaleDialog`

绘图组件子目录自带 `assets/`、`references/`、`scripts/` 和 `package.json`。依赖安装在对应子目录进行。`time-player/`、`layer-control/`、`percent-ring/`、`dual-axis-line/`、`farm-status/`、`power-forecast/`、`wind-layer/`、`forecast-accuracy/`、`wind-field-layer-panel/`、`wind-map-toolbar/`、`wind-color-bar/` 与 `wind-color-scale-dialog/` 是界面分发副本，不单独安装依赖。风电场控示例页是平台路由 `/charts`。三维风场界面在总览页。
