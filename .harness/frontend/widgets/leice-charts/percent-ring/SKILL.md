---
name: percent-ring
description: >-
  百分比圆环。用中间数字表示一个百分比，彩色弧表示进度或已使用比例，并按低、中、高三档变色。
---

# 百分比环

`PercentRing` 来自单机磁盘余量圆盘，用作通用百分比进度。页面里的运行副本是 `src/components/PercentRing`。本目录是分发副本。

## 输入

- `percent`：0 到 100，显示在圆环中央。
- `mode`：`remaining` 时彩色弧是 `100 - percent`，中央数字是剩余比例。`progress` 时弧长与中央数字一致。
- `filledLabel`、`trackLabel`：图例文案。不传时使用平台语言包 `widget.percentRing`。
- `caption`：圆环内数字下方的说明。`remaining` 默认是「剩余空间」。

颜色按中央数字分档：不超过 20 为红，不超过 50 为橙，更高为蓝。
