---
name: power-forecast
description: >-
  今日功率预测折线。实际功率、可用功率和预测序列画在同一纵轴上，可勾选显示，悬停给出各序列数值。
---

# 今日功率预测

`PowerForecastChart` 对应风功率预测预览页的今日功率曲线，使用平台 SVG，不另建 ECharts 生命周期。页面运行副本是 `src/components/PowerForecastChart`。几何计算在 `src/utils/chart/series.js`。本目录是分发副本。

## 输入

- `times`：横轴时间标签。
- `series`：每项含 `key`、`name`、`color`、`values`。
- `unit`：纵轴单位，默认 MW。
- `updated`、`title`：标题栏。标题默认来自 `widget.farm.todayPower`。

`999` 与小于等于 `-999` 的样本不连线。全部为空或序列都被取消勾选时显示无数据。悬停按最近时间点列出当前可见序列。

示例页是平台路由 `/charts`。
