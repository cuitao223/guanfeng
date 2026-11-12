---
name: leice-map-3d-ppi
description: 三维 PPI 扇区。按方位和距离门贴在设备位置，999 不画，信噪比先换算再着色。
---

# PPI 扇区

`PpiSectorLayer` 放在 `LeiceMap3d` 内。`field` 取 `speed` 或 `snr`。

源码：[PpiSectorLayer.vue](../assets/layers/PpiSectorLayer.vue)。缺测和分扇在 [ppi.mjs](../assets/logic/ppi.mjs)。

第一道距离门不画。方位角变小时另起一组。
