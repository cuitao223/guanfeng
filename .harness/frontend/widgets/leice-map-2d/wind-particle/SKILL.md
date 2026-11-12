---
name: leice-map-2d-particle
description: 二维风场粒子。用 u、v 网格做双线性动画，密度 1 到 5 改变粒子数量。与风羽、箭头互斥。
---

# 粒子

`WindParticleLayer` 放在 `LeiceMap2d` 内。传入 `grid` 和 `density`。

源码：[WindParticleLayer.vue](../assets/layers/WindParticleLayer.vue)。场和粒子步进在 [field.mjs](../assets/logic/field.mjs)，密度倍率在 [windForm.mjs](../assets/logic/windForm.mjs)。

画布不接收指针。`displayValues` 为真时，地图上的鼠标移动发出 `sample`。页面不要同时挂上风羽或箭头。
