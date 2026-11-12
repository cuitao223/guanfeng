---
name: dual-axis-line
description: >-
  左右双轴折线。左轴温度，右轴湿度。缺测断开折线，鼠标悬停同时显示两侧数值。
---

# 双轴折线

`DualAxisLine` 把两条单位不同的序列画在同一时间轴上。页面运行副本是 `src/components/DualAxisLine`。几何计算在 `src/utils/chart/series.js`。本目录是分发副本。

## 输入

- `times`：横轴标签。
- `leftValues`、`leftName`、`leftUnit`、`leftColor`：左轴。不传名称时默认温度，单位默认 °C。
- `rightValues`、`rightName`、`rightUnit`、`rightColor`：右轴。不传名称时默认湿度，单位默认 %。

`999` 与小于等于 `-999` 的样本不连线。两侧都空时显示无数据。悬停按最近时间点同时给出左右数值，缺测显示「缺测」。

示例页是平台路由 `/charts`。
