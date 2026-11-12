---
name: leice-map-2d-barb
description: 二维风羽图层。按来向绘制白色风羽，并按缩放抽稀。与箭头、粒子互斥。
---

# 风羽

`WindSampleLayer` 的 `form` 取 `barb`。放在 `LeiceMap2d` 内。传入 `grid` 和 `density`，或传入已经算好的 `rows`。

源码：[WindSampleLayer.vue](../assets/layers/WindSampleLayer.vue)。采样在 [windSamples.mjs](../assets/logic/windSamples.mjs)，形状在 [marks.mjs](../assets/logic/marks.mjs)。

风速为 `0` 或空值不画。颜色保持白色。页面不要同时挂上箭头或粒子。
