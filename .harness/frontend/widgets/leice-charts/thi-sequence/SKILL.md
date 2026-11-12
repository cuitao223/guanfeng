---
name: thi-sequence
description: >-
  在同一张时间-高度图上叠填色、折线和风羽。在需要用 timeArr 与各要素数组画多层时序、跳过 999 缺测，或没有可画层时显示无数据时使用。
---

# 多层时序

适用于同一时间轴和高度轴上的多层要素。每一层用 `drawType` 声明画法：`fill`、`line` 或 `windBarb`。时间用 `YYYY-MM-DD HH:mm:ss` 或 Unix 秒，按本地时间理解。高度单位是 m。组件不请求文件或设备接口。每个带断点和颜色的可见填色层各画一条色标。

目标运行环境是 Vue 3。坐标轴和折线使用 D3，填色与风羽画在 canvas 上。Node 16 及以上可以完成本包的安装、类型检查、构建和测试。

## 业务规则

- `999`、小于等于 `-999`、空串、`null`、`undefined`、非有限数都不画。`-1000` 同样跳过。
- 数值 `0` 是有效值。风速 `0` 只画杆。
- 折线在缺测高度处断开，不把空位画成 0。
- 填色只涂有值的最近样本，缺测格保持空白。
- 风羽来向 0 度在正上方，顺时针增大。抽稀步长默认 3，可按层覆盖。
- 可见层都没有可画数据时显示「无数据」。
- `theme` 使用 `dark` 或 `light`。色标由层内的 `breakpoints` 与 `colors` 提供，不是已锁定的设计令牌。
- 多种填色叠在一起时，每种填色对应一条色标。默认放在图右侧，也可放到图下方。放在底部时各条横向排列，单条最宽 420px，放不下时水平滚动。刻度收在色带旁边，不盖住色标名称。
- 双击某一条色标可配置该层的填色方式、断点、颜色、透明度和刻度。色标位置对全部色标生效。`colorType` 为 `threshold` 且断点比颜色多 1 时，色带按色块分段。否则按断点位置做线性过渡。

## 目录

- [组件源码](assets/src/ThiSequenceChart.vue)
- [单条色标](assets/src/SequenceColorBar.vue)
- [多条色标](assets/src/SequenceColorLegend.vue)
- [色标配置](assets/src/SequenceLegendDialog.vue)
- [固定样例](assets/examples/fixtures.ts)
- [数据契约](references/data.md)
- [与旧实现的差异](references/behavior.md)
- [缺测与空数据检查](scripts/cases.test.mjs)
- [安装、集成和验证](README.md)

版本 0.1.0，状态是 `approved`。审核记录见 `REVIEW.md`。
