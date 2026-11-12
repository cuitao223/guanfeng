# 多层时序

版本 `0.1.0`。Vue 3 多层时序，坐标轴和折线使用 D3 7，填色与风羽使用 canvas。`theme` 支持 `dark` 与 `light`。状态是 `approved`。

本包自包含。安装依赖后即可类型检查、构建、运行示例和测试。

## 适用场景

在同一时间轴和高度轴上叠填色、折线和风羽。高度单位是 m。多种填色会在图旁各显示一条色标。

## 安装

在本目录执行：

```bash
npm ci
```

## 集成

```vue
<ThiSequenceChart
  time-start="2026-01-01 00:00:00"
  time-end="2026-01-01 01:00:00"
  :layers="layers"
  theme="dark"
/>
```

```ts
import { ThiSequenceChart } from "@leice/thi-sequence-chart";
```

## 验证

```bash
npm test
npm run typecheck
npm run build
npm run examples
```
