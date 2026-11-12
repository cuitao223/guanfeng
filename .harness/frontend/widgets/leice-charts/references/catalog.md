# 组件一览

只登记当前已经实现、并且可以按 Skill 读取的组件。

| id | 版本 | 包名 | 组件 | 先读 | 输入 |
| --- | --- | --- | --- | --- | --- |
| `profile` | 0.1.3 | `@leice/profile-chart` | `ProfileChart` | [廓线 Skill](../profile/SKILL.md) | `heightArr`、`value` |
| `barb-thi` | 0.1.0 | `@leice/barb-thi-chart` | `BarbThiChart` | [风羽时高图 Skill](../barb-thi/SKILL.md) | `times`、`heightArr`、`values`、`dirs` |
| `thi` | 0.1.9 | `@leice/thi-chart` | `ThiChart` | [时高图 Skill](../thi/SKILL.md) | `times`、`heightArr`、`values` |
| `scan` | 0.1.1 | `@leice/scan-chart` | `ScanChart` | [扫描图 Skill](../scan/SKILL.md) | `mode`、`angles`、`heightArr`、`values` |
| `profile-compare` | 0.1.0 | `@leice/profile-compare-chart` | `CompareProfileChart` | [多廓线 Skill](../profile-compare/SKILL.md) | `series` 内的 `heightArr`、`value` |
| `barb-profile` | 0.1.0 | `@leice/barb-profile-chart` | `BarbProfileChart` | [风羽廓线 Skill](../barb-profile/SKILL.md) | `heightArr`、`value`、`dirArr` |
| `thi-sequence` | 0.1.0 | `@leice/thi-sequence-chart` | `ThiSequenceChart` | [多层时序 Skill](../thi-sequence/SKILL.md) | `timeStart`、`timeEnd`、`layers`。多种填色各一条色标 |
| `hodograph` | 0.1.0 | `@leice/hodograph-chart` | `HodographChart` | [霍多图 Skill](../hodograph/SKILL.md) | `layers` 内的 `heightKm`、`windSpeed`、`windDir` |
| `sounding-barb` | 0.1.0 | `@leice/sounding-barb-chart` | `SoundingBarbChart` | [探空风羽 Skill](../sounding-barb/SKILL.md) | `pressure`、`value`、`windDir`、`height` |
| `skew-t` | 0.1.0 | `@leice/skew-t-chart` | `SkewTChart` | [Skew-T Skill](../skew-t/SKILL.md) | `temperature`、`dewPoint`、`stateCurve` |
| `wind-rose-co2` | 0.1.0 | `@leice/wind-rose-co2-chart` | `WindRoseCo2Chart` | [二氧化碳风玫瑰 Skill](../wind-rose-co2/SKILL.md) | `samples` |
| `flux-co2` | 0.1.0 | `@leice/flux-co2-chart` | `FluxCo2Chart` | [二氧化碳通量 Skill](../flux-co2/SKILL.md) | `timeArr`、`values`、`direction`、`inputUnit`、`unit` |
| `flux-calendar-co2` | 0.1.0 | `@leice/flux-calendar-co2-chart` | `FluxCalendarChart` | [通量日历 Skill](../flux-calendar-co2/SKILL.md) | `rows`、`years`、`mode`、`field` |
| `time-player` | 0.1.0 | 平台 `src/components/TimePlayerSlider` | `TimePlayerSlider` | [时间播放条 Skill](../time-player/SKILL.md) | `live`、`playInterval`、分辨率、时间轴跨度 |
| `layer-control` | 0.1.0 | 平台 `src/components/LayerControlPanel` | `LayerControlPanel` | [图层控制 Skill](../layer-control/SKILL.md) | `mapType`、`displaySwitches` |
| `percent-ring` | 0.1.0 | 平台 `src/components/PercentRing` | `PercentRing` | [百分比环 Skill](../percent-ring/SKILL.md) | `percent`、`mode` |
| `dual-axis-line` | 0.1.0 | 平台 `src/components/DualAxisLine` | `DualAxisLine` | [双轴折线 Skill](../dual-axis-line/SKILL.md) | `times`、`leftValues`、`rightValues` |
| `farm-status` | 0.1.0 | 平台 `src/components/FarmStatusBoard` | `FarmStatusBoard` | [场站概览 Skill](../farm-status/SKILL.md) | `items`、`location`、`updated` |
| `power-forecast` | 0.1.0 | 平台 `src/components/PowerForecastChart` | `PowerForecastChart` | [功率预测 Skill](../power-forecast/SKILL.md) | `times`、`series` |
| `wind-layer` | 0.1.0 | 平台 `src/components/WindLayerChart` | `WindLayerChart` | [风层廓线 Skill](../wind-layer/SKILL.md) | `layers` |
| `forecast-accuracy` | 0.1.0 | 平台 `src/components/ForecastAccuracyChart` | `ForecastAccuracyChart` | [预测精度 Skill](../forecast-accuracy/SKILL.md) | `categories`、`bars`、`lines` |
| `wind-field-layer-panel` | 0.1.0 | 平台 `src/components/WindFieldLayerPanel` | `WindFieldLayerPanel` | [图层控制栏 Skill](../wind-field-layer-panel/SKILL.md) | `heights`、`disabledWarn`。告警联动调用 `applyLinkage` |
| `wind-map-toolbar` | 0.1.0 | 平台 `src/components/WindMapToolbar` | `WindMapToolbar` | [悬浮工具栏 Skill](../wind-map-toolbar/SKILL.md) | 设备、廓线、绘图、垂面、全屏、手自动、`rotation`、`pitch` |
| `wind-color-bar` | 0.1.0 | 平台 `src/components/WindColorBar` | `WindColorBar` | [色标条 Skill](../wind-color-bar/SKILL.md) | `valueMin`、`valueMax`、`colors`、`domainPoints`、`colorType` |
| `wind-color-scale-dialog` | 0.1.0 | 平台 `src/components/WindColorScaleDialog` | `WindColorScaleDialog` | [色标配置 Skill](../wind-color-scale-dialog/SKILL.md) | `valueMin`、`valueMax`、`colors`、`domainPoints` |

选定一行之后，按该组件 `SKILL.md` 里的目录继续打开数据契约和源码。安装与示例写在该组件自己的 `README.md`。
