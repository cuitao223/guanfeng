---
name: wind-map-toolbar
description: 组网三维风场页右下角悬浮工具栏。竖排圆形按钮，切换设备、廓线点、绘图、垂面、全屏和手自动，并提供指北罗盘。
---

# 三维风场工具栏

`WindMapToolbar` 来自组网三维风场页右下角工具条，只保留布局和开关，不绑定地图相机。页面里的运行副本是 `src/components/WindMapToolbar`。本目录是分发副本，状态是 `approved`。

## 输入

- `deviceLayer`、`profileMarker`、`drawEdit`、`verticalSection`、`fullscreen`、`manual`：当前是否按下。
- `showDeviceLayer`、`showProfileMarker`、`showVerticalSection`、`showManual`：为假时隐藏对应按钮。默认都显示。
- `rotation`：罗盘旋转角，单位度。正北为 0。
- `pitch`：俯仰角，单位度。水平为 0。

按下按钮时发出对应的 `update:*`。点击罗盘发出 `reset-view`。指北同时要求旋转角和俯仰角都接近 0。页面只改朝向和俯仰，不改变当前缩放。绘图编辑和垂面点选的地图行为留在页面。界面文案使用平台语言包 `widget.wind3d`。

版本 0.1.0。状态为 `approved`。审核记录见 `REVIEW.md`。
