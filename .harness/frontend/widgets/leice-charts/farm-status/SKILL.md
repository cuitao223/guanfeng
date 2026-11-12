---
name: farm-status
description: >-
  风电场站信息概览。展示并网功率、风机台数、装机与计划容量、日预测发电量和日实际发电量。
---

# 场站信息概览

`FarmStatusBoard` 对应风功率预测预览页左侧的场站卡片。页面运行副本是 `src/components/FarmStatusBoard`。本目录是分发副本。

## 输入

- `items`：每项含 `label`、`value`、`tone`（`purple` 或 `blue`）。`alarm` 有内容时在卡片角上给出提示。
- `location`：经纬度或场站位置文本。
- `updated`：更新时间文本。
- `title`：标题。不传时使用平台语言包 `widget.farm.overview`。

组件不请求接口。示例页是平台路由 `/charts`。
