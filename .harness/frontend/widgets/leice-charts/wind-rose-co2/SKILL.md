---
name: wind-rose-co2
description: >-
  绘制二氧化碳小时通量风玫瑰。在需要按方向画扇区，跳过 999 与 -999，或没有有效值时显示无数据时使用。文件名带 co2，不用于普通风羽。
---

# 二氧化碳风玫瑰

适用于二氧化碳小时通量的方向分布。16 个方位，扇区张角正负 5 度。半径按数值相对 `maxValue` 的比例计算。组件不请求文件或设备接口。

目标运行环境是 Vue 3。绘图引擎是 D3。Node 16 及以上可以完成本包的安装、类型检查、构建和测试。

## 业务规则

- 方向或数值为 `999`、小于等于 `-999`、空串、`null`、非有限数时，该扇区不画。
- 数值 `0` 留在圆心，是有效值。
- 半径为 `clamp(value / maxValue) * 最大半径`。`maxValue` 默认 1000，画在最外圈。
- 没有任何有效扇区时显示「无数据」。
- 单位文字是 `μg m-2 s-1`。标题含高度米数。

## 目录

- [组件源码](assets/src/WindRoseCo2Chart.vue)
- [固定样例](assets/examples/fixtures.ts)
- [数据契约](references/data.md)
- [与旧实现的差异](references/behavior.md)
- [缺测与空数据检查](scripts/cases.test.mjs)
- [安装、集成和验证](README.md)

版本 0.1.0，状态是 `approved`。审核记录见 `REVIEW.md`。
