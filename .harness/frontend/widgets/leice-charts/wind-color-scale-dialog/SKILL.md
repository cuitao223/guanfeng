---
name: wind-color-scale-dialog
description: 组网三维风场页色标配置弹窗。调整数值范围、断档和预设色条，确认后把结果交回页面。
---

# 三维风场色标配置

`WindColorScaleDialog` 来自组网三维风场页双击色标后的配置弹窗。页面里的运行副本是 `src/components/WindColorScaleDialog`。本目录是分发副本，状态是 `approved`。

## 输入

- `modelValue`：是否打开。
- `valueMin`、`valueMax`：当前数值范围。
- `colors`：当前颜色。
- `domainPoints`：当前断点。
- `unit`：单位文字，默认 `m/s`。

预设色条第一项使用三维地图包里的默认蓝-绿-黄-橙-红。确认后发出 `confirm`，字段为 `valueMin`、`valueMax`、`colors`、`domainPoints`。均分断档按颜色个数均分；手动断档要求后一个断点大于前一个。界面文案使用平台语言包 `widget.wind3d.legend`。

组件不请求接口，也不改地图图层。色标条本身见 [色标条](../wind-color-bar/SKILL.md)。

版本 0.1.0。状态为 `approved`。审核记录见 `REVIEW.md`。
