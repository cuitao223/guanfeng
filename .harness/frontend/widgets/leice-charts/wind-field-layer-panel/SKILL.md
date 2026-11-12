---
name: wind-field-layer-panel
description: 组网三维风场页左侧图层控制。切换高度单层或多层，并选择风场形式、报警、填色、垂直维度、直方图和底图。
---

# 三维风场图层控制

`WindFieldLayerPanel` 来自组网三维风场页左侧控制栏。页面里的运行副本是 `src/components/WindFieldLayerPanel`。本目录是分发副本，状态是 `approved`。

## 输入

- `heights`：可选高度，单位米。
- `heightHint`：标题后的灰色说明。
- `disabled`：没有高度数据时整栏不可用。
- `disabledWarn`：当前不能勾选的报警项，取 `shearH`、`shearV`、`gale`。

任一选项变化时发出 `change`。高度多选时 `heights` 是数组；单选时数组只含一项。风场形式里 `barb` 与 `arrow` 互斥。勾选风羽或箭头后显示疏密，勾选风场后显示透明度。报警单选可以再次点选取消。页面可调用 `applyLinkage(height, warn)`：单层改为该高度，多层在未选中时追加该高度，并选中对应报警。界面文案使用平台语言包 `widget.wind3d`。

地图上的填色、粒子和报警面仍用 `leice-map-3d` 的图层。本组件不请求接口，也不创建地图。

版本 0.1.0。状态为 `approved`。审核记录见 `REVIEW.md`。
