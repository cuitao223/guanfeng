---
name: wind-color-bar
description: 组网三维风场页底部风速色标条。按断点或数值范围画色带和刻度，双击交给页面打开色标配置。
---

# 三维风场色标条

`WindColorBar` 来自组网三维风场页底部色标。页面里的运行副本是 `src/components/WindColorBar`。本目录是分发副本，状态是 `approved`。

## 输入

- `valueMin`、`valueMax`：色带数值范围。
- `colors`：颜色数组，可以是十六进制或 RGB。
- `domainPoints`：与颜色对应的断点。
- `scaleMode`：`ordinal` 按断点个数均分，`linear` 按数值比例。
- `colorType`：`smooth` 渐变，`contour` 分段。
- `unit`：单位文字，例如 `m/s`。
- `tickCount`：没有断点时的刻度个数，限制在 2 到 8。

双击发出 `open-settings`。配置弹窗使用 [色标配置](../wind-color-scale-dialog/SKILL.md)。组件不请求接口。界面文案使用平台语言包 `widget.wind3d`。

版本 0.1.0。状态为 `approved`。审核记录见 `REVIEW.md`。
