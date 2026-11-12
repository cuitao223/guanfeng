---
name: leice-map-3d-field
description: 三维风场从色斑图像解码到填色上图。按高度铺网格，平滑或等值线二选一，缺测不画。
---

# 风场填色

`WindFieldLayer` 放在 `LeiceMap3d` 内。`levels` 含 `height`、`header`、`speeds`。

源码：[WindFieldLayer.vue](../assets/layers/WindFieldLayer.vue)。着色在 [legend.mjs](../assets/logic/legend.mjs)。

`colorStyle` 取 `smooth` 或 `contour`。`9999` 透明。`opacity` 为 1 时写入深度。多层同时打开时，更高的不透明风场挡住更低高度上的粒子、风羽、箭头和报警。同一高度的粒子、风羽和箭头仍画在该层填色之上。

页面准备图像时阅读 [风场图像到上图](../references/wind-image.md)，并用 [windImage.mjs](../assets/logic/windImage.mjs) 的 `decodeWindFieldImage` 把像素解码成 `header`、`speeds`、`dirs`。组件不加载图像。


真实GFS业务页参考 `frontend/src/views/operations-wind/`。标准化header可选`pointGrid`（格点端点边界）、`displayCorners`（tl/tr/bl/br显示坐标）、`displayCoordinates`（逐格显示坐标）。风羽另支持`sizeScale`，默认1。缺省参数保持旧图层行为。


可选domainPoints支持与colors等长的非均匀节点或多一个节点的区间边界，用于色标配置；默认仍均分。
