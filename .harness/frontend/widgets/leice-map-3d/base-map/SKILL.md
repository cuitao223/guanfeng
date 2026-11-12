---
name: leice-map-3d-base
description: 三维离线高德底图。切换卫星和矢量瓦片，并用透明画布对齐三维相机。
---

# 底图

`LeiceMap3d` 创建三维地图，并把场景提供给内部图层。图层必须写在这个组件里面。

源码：[LeiceMap3d.vue](../assets/layers/LeiceMap3d.vue)。

`satelliteTiles.base` 与 `vectorTiles.base` 必填。需要注记时再传 `label`。`base` 可以是瓦片函数，也可以是带 `{z}`、`{x}`、`{y}` 的模板，组件会把它交给三维底图。气象图层画在组件内的透明画布上，每帧用底图的 `customCoords.getCameraParams()` 对齐相机。场景对象保持浅响应，避免把 Three 对象做成深层代理。地图就绪时发出 `ready`。技能不写瓦片主机。页面必须先挂上离线三维脚本，组件不改用二维地图库。
