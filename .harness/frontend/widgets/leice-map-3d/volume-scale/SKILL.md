---
name: leice-map-3d-volume-scale
description: 三维风场空间标尺。按风场范围画高度框、水平刻度和屏幕恒定大小的标签。
---

# 空间标尺

`VolumeScaleLayer` 放在 `LeiceMap3d` 内。`levels` 使用风场图层同一组高度数据，至少要有 `height` 和 `header`。

源码：[VolumeScaleLayer.vue](../assets/layers/VolumeScaleLayer.vue)。距离和角点在 [volumeScale.mjs](../assets/logic/volumeScale.mjs)。

多层时各高度按 `exaggeration` 抬升，单层贴在地面。底面、每个选中高度的矩形和四角竖线一起画出。东西、南北刻度用大圆距离，步长取约五等分的整档。标签随相机距离缩放，屏幕上保持接近固定字号。矢量底图用黑字，卫星底图用白字。文案由页面传入。


可选heightUnit默认m，GFS页面传gpm；volumeCorners复用pointGrid和displayCorners，与切片边界保持一致。
