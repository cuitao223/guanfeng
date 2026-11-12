---
name: leice-map-packages
description: 在本平台选择二维地图图层或三维气象地图图层。页面需要地图时使用，先读本技能，再只打开点名的一套组件。
---

# 地图组件入口

二维和三维分开。一次只打开一套。

| 任务 | 位置 |
| --- | --- |
| 二维底图和图层 | `.harness/frontend/widgets/leice-map-2d` |
| 三维气象地图和图层 | `.harness/frontend/widgets/leice-map-3d` |

先读所选目录的 `SKILL.md`，再只打开其中点名的图层。二维使用 Leaflet。页面在 `frontend/` 安装 `leaflet`，并引入 `leaflet/dist/leaflet.css`。三维使用页面自带的离线高德脚本、`GLCustomLayer` 与 Three.js。页面在 `frontend/` 安装 `three`。依赖写入 `frontend/package.json`。可以在 `.harness/frontend/widgets` 按现有图层补充组件。不引入 MapLibre，也不使用 Cesium。技能和示例不写主机、地图密钥或账号。
