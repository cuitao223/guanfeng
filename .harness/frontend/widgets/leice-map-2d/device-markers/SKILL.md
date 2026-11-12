---
name: leice-map-2d-devices
description: 二维地图设备点。按类型过滤，按标记种类显示区域名或站点编号，双击切换选中。
---

# 设备点

`DeviceMarkers` 放在 `LeiceMap2d` 内。字段见 [数据契约](../references/data.md)。

源码：[DeviceMarkers.vue](../assets/layers/DeviceMarkers.vue)。过滤和缩放规则在 [devices.mjs](../assets/logic/devices.mjs)。

双击发出 `toggle`。页面自己维护 `activeIds`，并按 `deviceStatusName` 准备 `iconUrl`。

`divIcon` 的默认尺寸是 12×12。标签必须 `white-space: nowrap`，并放在图标外侧。字号写在组件样式里的设计稿 px，让 postcss-pxtorem 按 rootValue 80 转换。不要依赖 Leaflet 的 `0.75rem`，否则中文会按一字一行竖排，并且大到盖住底图。`iconSize` 和 `iconAnchor` 留在脚本里，单位是地图像素。
