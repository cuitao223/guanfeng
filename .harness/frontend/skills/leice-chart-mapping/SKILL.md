---
name: leice-chart-mapping
description: 按业务图名称选择已发布的绘图组件。页面要画垂直风、信噪比、风羽、扫描、廓线、二氧化碳图、统计率或温湿趋势时先读本技能。
---

# 业务图映射

先用下表选定一个组件，再只打开 `.harness/frontend/widgets/leice-charts/<id>/SKILL.md` 和它的 `references/data.md`。一次只打开一个组件。

页面消费接口返回的数组。测量文件如何整理成这些数组，见 `.harness/data/skills/leice-radar-series/SKILL.md`。页面不解析测量文件。组件不读文件。

未发布的组件不要用别的图顶替，也不要在页面里另起一套图表库。

## 组网风和省级设备风

旧页面里的 `deviceData.windspeed`、`winddir`、`windsnr`、`windvertical`、`windheight`、`dates` 先转成组件入参。新页面不再做一套 ECharts 风图。

| 业务图 | 组件 | 入参 |
| --- | --- | --- |
| 水平风羽时高图 | `barb-thi` | `times`、`heightArr`、`values` 为风速、`dirs` 为来向 |
| 垂直风 | `thi` | `values` 为垂直风速，`unit` 为 `m/s` |
| 信噪比时高图 | `thi` | `values` 为已经换成展示值的信噪比 |
| 单条高度廓线 | `profile` | `heightArr`、`value` |
| 相对湿度廓线 | `profile` | 同上，不单列组件 |
| 多条廓线 | `profile-compare` | `series` |
| 单时次风羽廓线 | `barb-profile` | `heightArr`、`value`、`dirArr` |
| 多层时序 | `thi-sequence` | `layers` |
| PPI 径向风、信噪比、谱宽、谱强 | `scan`，`mode` 为 `ppi` | `angles`、`heightArr`、`values`。四类产品由页面选定后传入一层数值 |
| RHI 径向风、信噪比、谱宽、谱强 | `scan`，`mode` 为 `rhi` | 同上 |
| 霍多图 | `hodograph` | `layers` |
| 探空风羽 | `sounding-barb` | `pressure`、`value`、`windDir`、`height` |
| 温度对数压力图 | `skew-t` | `temperature`、`dewPoint`、`stateCurve` |

风向 0° 在正上方，顺时针增大，风羽是来向。高度单位是 m。缺测沿用组件契约：有限数 `999`，或小于等于 `-999`。

## 统计率和气象站趋势

上传率、异常率、完备率、高度获取率共用一个柱状图字段：`name`、`categories`、`values`。四个率不要各画一张图。温湿趋势使用 `dual-axis-line`，左轴温度、右轴湿度，组件在 `.harness/frontend/widgets/leice-charts/dual-axis-line`。不要用 `thi`、`profile` 代替这张双轴折线。

## 二氧化碳

与普通风图分开。柱浓度时间折线不单列组件。

| 业务图 | 组件 |
| --- | --- |
| 小时通量风玫瑰 | `wind-rose-co2` |
| 总垂直、东西、南北通量 | `flux-co2` |
| 通量日历 | `flux-calendar-co2` |

## 不在本表选型

- 风功率预测留在该业务页已有的 `BaseEcharts`。
- 地图底图、风羽、粒子和 PPI 扇区先读 `.harness/frontend/skills/leice-map-packages/SKILL.md`。
- 时间播放条和图层控制仍用绘图包里的 `time-player`、`layer-control`。
