---
name: layer-control
description: >-
  地图右侧图层控制折叠卡片。切换卫星、行政、高程底图，并开关雷达图标、风电场图标和地名。
---

# 图层控制

`LayerControlPanel` 是地图页右侧的地图切换和展示开关。页面里的运行副本是 `src/components/LayerControlPanel`。本目录是分发副本。

## 输入

- `mapType`：`img`、`vec` 或 `ter`。
- `displaySwitches`：`radarIcon`、`windfarmIcon`、`placeName`。

选择底图时发出 `update:mapType`。切换图层时发出 `update:displaySwitches`。界面文案使用平台语言包 `widget.layer`。
