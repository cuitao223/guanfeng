---
name: leice-map-2d-arrow
description: 二维箭头图层。用来向加 180 度绘制白色箭头，并按缩放抽稀。与风羽、粒子互斥。
---

# 箭头

`WindSampleLayer` 的 `form` 取 `arrow`。放在 `LeiceMap2d` 内。传入 `grid` 和 `density`，或传入 `rows`。

源码与风羽相同：[WindSampleLayer.vue](../assets/layers/WindSampleLayer.vue)。方向在采样时加上 180 度。

数值为 `0` 或空值不画。页面不要同时挂上风羽或粒子。
