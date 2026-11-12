---
name: leice-map-2d-alerts
description: 二维地图报警点。按报警类型组合选择图标，悬停和双击都交给页面。
---

# 报警点

`AlertMarkers` 放在 `LeiceMap2d` 内。已知图标键是 `1`、`2`、`3`、`4`、`14`、`24`、`34`。

源码：[AlertMarkers.vue](../assets/layers/AlertMarkers.vue)。整理函数在 [alerts.mjs](../assets/logic/alerts.mjs)。

`hover` 携带站点编号、风速文本、高度层和鼠标位置。`activate` 只携带站点编号。页面决定是否跳转。
