---
name: leice-map-3d-particle
description: 三维风场粒子。按格点数量和倍率决定粒子数，缺测处不停留，颜色跟随底图。
---

# 粒子

`WindParticleLayer` 放在 `LeiceMap3d` 内。`multiplier` 默认 2。

源码：[WindParticleLayer.vue](../assets/layers/WindParticleLayer.vue)。数量在 [particles.mjs](../assets/logic/particles.mjs)。

它可以和风场、风羽同时打开。深度测试保持打开，完全不透明的更高风场会挡住更低高度上的粒子。`speeds` 与填色共用同一次图像解码，见 [风场图像到上图](../references/wind-image.md)。


真实GFS业务页参考 `frontend/src/views/operations-wind/`。标准化header可选`pointGrid`（格点端点边界）、`displayCorners`（tl/tr/bl/br显示坐标）、`displayCoordinates`（逐格显示坐标）。风羽另支持`sizeScale`，默认1。缺省参数保持旧图层行为。
