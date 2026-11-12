---
name: forecast-accuracy
description: >-
  功率预测精度图。左轴是考核电量柱，右轴是上报率折线。悬停同时显示柱和折线数值。
---

# 功率预测精度

`ForecastAccuracyChart` 对应风功率预测预览页的精度混合图，使用平台 SVG，不另建 ECharts 生命周期。页面运行副本是 `src/components/ForecastAccuracyChart`。几何计算在 `src/utils/chart/series.js`。本目录是分发副本。

## 输入

- `categories`：横轴日期标签。
- `bars`：左轴柱序列。每项含 `key`、`name`、`color`、`values`。单位由 `barUnit` 指定，默认 MWh。
- `lines`：右轴折线序列。字段与柱相同。单位由 `lineUnit` 指定，默认 %。
- `summary`：图上方的汇总文字，每项含 `label`、`value`。
- `title`：默认来自 `widget.farm.accuracy`。

`999` 与小于等于 `-999` 不画。柱和折线都空时显示无数据。悬停按最近类别列出全部序列。

集控、主调和日期窗口留在页面。示例页是平台路由 `/charts`。
