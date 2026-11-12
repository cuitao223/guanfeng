---
name: flux-calendar-co2
description: >-
  绘制二氧化碳通量日历热力图。日、周、月三种格子。在需要按日期查看垂直、东西或南北通量时使用。
---

# 二氧化碳通量日历热力图

`FluxCalendarChart` 用 D3 画日、周、月热力格子。色带与参考页一致，DBS 默认断点从 -5000 到 5000。

## 输入

- `rows`：每日一行。`date` 为 `YYYYMMDD` 或 `YYYY-MM-DD`。通量字段默认 `verticalAvg`，也可为 `eastAvg`、`northAvg`。
- `years`：要画的年份。
- `mode`：`day`、`week` 或 `month`。
- `field`：取值字段名。
- `domain`：色标断点。不传时使用 DBS 的 -5000 到 5000。
- `unit`：提示文字中的单位。DBS 为 `µg/m²/s`。

`999`、`-999`、空值和非有限数不填色。比 `-999` 更小的通量仍是有效值。日格子上的 `0` 仍上色，提示为测量无效值。周、月按有效日求平均。没有任何有效值时显示无数据。

## 目录

- `assets/src/FluxCalendarChart.vue`：绘图组件
- `assets/src/fluxCalendar.ts`：聚合与填色
- `references/data.md`：字段
- `references/behavior.md`：格子规则
