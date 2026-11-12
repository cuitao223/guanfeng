# 二氧化碳通量色柱

版本 `0.1.0`。Vue 3 总通量色柱，绘图使用 D3 7。`theme` 支持 `dark` 与 `light`。状态是 `approved`。

本包自包含。与普通风图分开。安装依赖后即可类型检查、构建、运行示例和测试。

## 适用场景

把总垂直通量、总东西通量或总南北通量画成围绕零线的色柱。

## 安装

在本目录执行：

```bash
npm ci
```

## 集成

```vue
<FluxCo2Chart :time-arr="timeArr" :values="totalVerticalFlux" direction="vertical" input-unit="mass" unit="mass" theme="dark" />
<FluxCo2Chart :time-arr="timeArr" :values="totalEastFlux" direction="east" unit="mass" theme="dark" />
<FluxCo2Chart :time-arr="timeArr" :values="totalNorthFlux" direction="north" unit="mole" theme="dark" />
```

```ts
import { FluxCo2Chart } from "@leice/flux-co2-chart";
```

## 验证

```bash
npm test
npm run typecheck
npm run build
npm run examples
```
