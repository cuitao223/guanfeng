---
name: thi
description: >-
  绘制激光雷达时高填色图。在需要把时间、heightArr 和 values 网格画成 THI，并跳过 999 缺测或显示无数据遮罩时使用。
---

# 时高图

适用于一张时高填色图。时间可以是 Unix 秒，或 `YYYY-MM-DD HH:mm:ss`。`values` 按时间行、高度列对齐。高度单位是 m。组件不请求文件或设备接口，也不绘制风羽。

目标运行环境是 Vue 3。绘图引擎是 D3。容器宽或高小于 100 时不绘制。

## 业务规则

- `999`、小于等于 `-999`、空串、`null`、`undefined`、非有限数都不画。`-1000` 同样跳过。数值 `0` 要画。
- 整段没有可画格子时显示「无数据」，不把空序列画成 0。
- 时间空档和整列缺测盖上灰色空档，不把两侧格子拉过空档。空档阈值是 600 秒。
- 数值时间按 Unix 秒乘 1000。格式化时间按本地年月日时分解析，不追加 Z。
- `colorMode` 为 `linear` 时按平滑色标插值；为 `threshold` 时按等值线分档，不在档间插值。
- 绘制按屏幕采样，位图不超过 480×320，再放大到绘图区。格子数增加时，绘制耗时不按格子数线性增长。调用方仍传入 `values[时间下标][高度下标]`。
- 鼠标悬停显示时间、高度和数值。落在时间空档上时显示缺测起止。缺测格不显示邻格数值。
- 右上角有框选缩放、还原缩放、图片下载和设置。设置可改高度范围、间隔和平滑 / 等值线。
- 图右侧默认带数值色标，刻度在色带外侧。可改到底部。双击色标打开配置。色标颜色由调用方的 `breakpoints` 和 `colors` 决定。
- `theme` 使用 `dark` 或 `light`。绘图区颜色来自现有页面。色标、工具按钮、提示框和设置弹窗跟随同一主题。调用方用 `breakpoints`、`colors` 和 `palette` 覆盖绘图区。这些不是已锁定令牌。

## 目录

- [组件源码](assets/src/ThiChart.vue)
- [固定样例](assets/examples/fixtures.ts)
- [大量样例](assets/examples/largeFixture.ts)
- [数据契约](references/data.md)
- [来源与差异](references/behavior.md)
- [检查脚本](scripts/thi.test.mjs)
- [安装与验证](README.md)

版本 0.1.9。`theme` 支持 `dark` 与 `light`。遗留问题见 `REVIEW.md`。
