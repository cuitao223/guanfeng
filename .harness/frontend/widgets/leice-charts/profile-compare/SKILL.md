---
name: profile-compare
description: >-
  把多条高度廓线叠在同一张图上。在需要用 series 里的 heightArr 与 value 对比多条廓线、缺测处断开，或全部为空时显示无数据时使用。
---

# 多廓线叠绘

适用于同一高度轴上的多条廓线。每条序列带 `key`、`name`、`color`、`heightArr`、`value`。高度轴单位是 m。组件只接收已经准备好的数组，不请求文件或设备接口。

目标运行环境是 Vue 3。绘图引擎是 D3。Node 16 及以上可以完成本包的安装、类型检查、构建和测试。

## 业务规则

- `999`、小于等于 `-999`、空串、`null`、`undefined`、非有限数都不画。`-1000` 同样跳过。
- 数值 `0` 是有效值，要画出来。
- 整段没有可画点，或传入 `empty` 时，显示「无数据」，不绘制零线。
- 同一条序列中间的缺测把折线断开，不把空位画成 0，也不穿过空位连线或插值。断开后只剩一个点时，画成圆点。
- 高度超出 `heightMin` 与 `heightMax` 时，只在连续有效段的边界上线性插值。
- `theme` 使用 `dark` 或 `light`。未传入 `color` 时按序列顺序使用固定色。调用方用 `palette` 或序列 `color` 覆盖。这些不是已锁定的设计令牌。

## 目录

- [组件源码](assets/src/CompareProfileChart.vue)
- [固定样例](assets/examples/fixtures.ts)
- [数据契约](references/data.md)
- [与旧实现的差异](references/behavior.md)
- [缺测与空数据检查](scripts/cases.test.mjs)
- [安装、集成和验证](README.md)

版本 0.1.0，状态是 `approved`。审核记录见 `REVIEW.md`。
