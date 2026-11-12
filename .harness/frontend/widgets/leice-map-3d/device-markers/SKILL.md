---
name: leice-map-3d-devices
description: 三维设备点。圆点半径随缩放变化，图标点使用页面传入的地址，悬停交回设备编号。
---

# 设备点

`DeviceMarkers` 放在 `LeiceMap3d` 内。`variant` 取 `circle` 或 `icon`。

源码：[DeviceMarkers.vue](../assets/layers/DeviceMarkers.vue)。半径在 [ppi.mjs](../assets/logic/ppi.mjs) 的 `deviceRadius`。

`hover` 携带 `deviceNo`、经度和纬度。
