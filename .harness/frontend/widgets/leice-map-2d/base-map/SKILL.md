---
name: leice-map-2d-base
description: 二维 Leaflet 底图。传入瓦片地址模板、中心、缩放和范围，不显示缩放按钮，显示数据源署名。
---

# 底图

`LeiceMap2d` 创建地图，并把地图实例提供给内部的图层组件。图层必须写在这个组件里面。

源码：[LeiceMap2d.vue](../assets/layers/LeiceMap2d.vue)。视图常量在 [view.mjs](../assets/logic/view.mjs)。

`tileUrl` 必填。地图就绪时发出 `ready`。不要把主机或密钥写进组件。

Leaflet 1.9 在 `.leaflet-container` 上把字号写成 `0.75rem`，弹窗内容再乘 `1.08333em`。本平台根字号是 `clientWidth / 24`，1920 宽时 1rem 为 80px，这个 `0.75rem` 会变成 60px。底图组件用更高优先级把容器、弹窗和 tooltip 改回设计稿字号。不要删掉这段覆盖，也不要在页面里再给 `.leaflet-container` 写 `rem` 字号。

支持可选 `labelUrl` 和 `attribution`，发出 `tile-status`（loading/ready/error），并暴露 `retryTiles()`；中心与缩放支持动态更新。在线数据源由业务层 `frontend/src/utils/maps/basemaps.js` 配置，页面通过 `RealMap` 复用加载状态和重试。
