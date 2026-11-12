---
name: profile
description: >-
  绘制激光雷达单条高度廓线。在需要用 heightArr 与 value 画 D3 折线、跳过 999 缺测，或在整段为空时显示无数据遮罩时使用。
---

# 廓线

适用于一条高度廓线。输入字段是 `heightArr` 与 `value`，高度轴单位是 m。组件只接收已经准备好的数组，不请求文件或设备接口。

目标运行环境是 Vue 3。绘图引擎是 D3。Node 16 及以上可以完成本包的安装、类型检查、构建和测试。

## 业务规则

- `999`、小于等于 `-999`、空串、`null`、`undefined`、非有限数都不画。`-1000` 同样跳过。
- 数值 `0` 是有效值，要画出来。
- 整段没有可画点时显示「无数据」，不绘制零线。
- 序列中间的缺测把折线断开，不把空位画成 0，也不穿过空位连线。
- `theme` 使用 `dark` 或 `light`。未传入 `color` 时，折线用当前主题色。调用方用 `palette` 或 `color` 覆盖。这些不是已锁定的设计令牌。
- 本图不把高度换算成千米。

## 目录

- [组件源码](assets/src/ProfileChart.vue)
- [固定样例](assets/examples/fixtures.ts)
- [数据契约](references/data.md)
- [与旧实现的差异](references/behavior.md)
- [缺测与空数据检查](scripts/profile.test.mjs)
- [安装、集成和验证](README.md)

版本 0.1.3。`theme` 支持 `dark` 与 `light`。审核记录见 `REVIEW.md`。


业务数据使用位势高度时可传heightUnit="gpm"，不将其冒充离地高度；默认m保持兼容。
