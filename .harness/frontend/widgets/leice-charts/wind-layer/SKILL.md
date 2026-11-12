---
name: wind-layer
description: >-
  风电场气象资源风层图。按高度绘制水平风速和水平风向，并可切换为数值表。缺测不连线。
---

# 风层廓线

`WindLayerChart` 对应风功率预测预览页的气象资源区。页面运行副本是 `src/components/WindLayerChart`。几何计算在 `src/utils/chart/series.js`。本目录是分发副本。

## 输入

- `layers`：每层含 `height`、`speed`、`direction`。高度从低到高排在纵轴上。
- `temperature`、`humidity`、`pressure`：环境读数。
- `location`、`title`：位置和标题。标题默认来自 `widget.farm.resource`。

廓线与数值表用组件内开关切换。`999` 与小于等于 `-999` 的风速或风向不连线，表内和悬停显示「缺测」。两层都空时显示无数据。

示例页是平台路由 `/charts`。
