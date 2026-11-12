---
name: leice-map-3d-barb
description: 三维风羽。按缩放和疏密抽点，风速为 0 或 9999 时不画，颜色跟随底图。
---

# 风羽

`WindBarbLayer` 放在 `LeiceMap3d` 内。`levels` 还要 `dirs`。`density` 默认 1，`zoom` 默认 13。

源码：[WindBarbLayer.vue](../assets/layers/WindBarbLayer.vue)。抽稀和羽数在 [barbs.mjs](../assets/logic/barbs.mjs)。

矢量底图用黑色，卫星底图用白色。`kind` 为 `arrow` 时改画沿风向的箭头，长度随风速变化。深度测试保持打开，完全不透明的更高风场会挡住更低高度上的风羽和箭头。`dirs` 与填色共用同一次图像解码，见 [风场图像到上图](../references/wind-image.md)。


真实GFS业务页参考 `frontend/src/views/operations-wind/`。标准化header可选`pointGrid`（格点端点边界）、`displayCorners`（tl/tr/bl/br显示坐标）、`displayCoordinates`（逐格显示坐标）。风羽另支持`sizeScale`，默认1。缺省参数保持旧图层行为。
