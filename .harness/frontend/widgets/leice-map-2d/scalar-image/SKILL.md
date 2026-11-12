---
name: leice-map-2d-scalar
description: 二维风力填色。用图片或风速网格盖住地图范围，并按经纬度反查风速和来向。
---

# 风力填色

`ScalarImageLayer` 放在 `LeiceMap2d` 内。传入 `imageUrl` 和 `bounds`，或传入 `header` 与 `speeds`。默认透明度 `0.8`。

源码：[ScalarImageLayer.vue](../assets/layers/ScalarImageLayer.vue)。着色和反查在 [scalar.mjs](../assets/logic/scalar.mjs)、[colorScale.mjs](../assets/logic/colorScale.mjs)。

有 `directions` 时，鼠标移动发出 `sample`。缺测发出 `null`。降水、温度、湿度、气压不要用这个组件另做一套。
