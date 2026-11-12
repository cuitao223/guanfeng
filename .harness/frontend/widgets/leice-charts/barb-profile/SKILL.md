---
name: barb-profile
description: >-
  绘制单时次风羽廓线。在需要用 heightArr、value、dirArr 沿高度画风羽，跳过 999 缺测，或全部为空时显示无数据时使用。
---

# 单时次风羽廓线

适用于一个时刻的风羽廓线。输入是按高度对齐的 `heightArr`、`value`（风速）和 `dirArr`（来向）。高度轴单位是 m。组件不请求文件或设备接口。

目标运行环境是 Vue 3。坐标轴使用 D3，风羽画在 canvas 上。Node 16 及以上可以完成本包的安装、类型检查、构建和测试。

## 业务规则

- `999`、小于等于 `-999`、空串、`null`、`undefined`、非有限数都不画。`-1000` 同样跳过。
- 风速 `0` 是静风，要画杆，不画羽。
- 三个数组按下标对齐，长度取最短的一段。风向缺失时不把该层画成 0 度。
- 来向 0 度在正上方，顺时针增大。
- 每 20 一面旗，每 4 一笔长划，余数大于 0 再画一笔短划。
- 整段没有可画风羽时显示「无数据」。
- 屏幕上相邻风羽至少间隔 26 像素。
- `theme` 使用 `dark` 或 `light`。未传入 `color` 时，暗色用白色杆，亮色用深色杆。

## 目录

- [组件源码](assets/src/BarbProfileChart.vue)
- [固定样例](assets/examples/fixtures.ts)
- [数据契约](references/data.md)
- [与旧实现的差异](references/behavior.md)
- [缺测与空数据检查](scripts/cases.test.mjs)
- [安装、集成和验证](README.md)

版本 0.1.0，状态是 `approved`。审核记录见 `REVIEW.md`。
