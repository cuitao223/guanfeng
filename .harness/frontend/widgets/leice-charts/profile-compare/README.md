# 多廓线叠绘

版本 `0.1.0`。Vue 3 多条高度廓线，绘图使用 D3 7。`theme` 支持 `dark` 与 `light`。状态是 `approved`。

本包自包含。安装依赖后即可类型检查、构建、运行示例和测试。

## 适用场景

把多条 `heightArr` 与 `value` 叠在同一高度轴上。高度轴单位是 m，默认范围 0 到 10000。

## 安装

在本目录执行：

```bash
npm ci
```

`vue` 是 peer dependency。本包的 devDependencies 里固定了 Vue 3.4.38，供示例和类型检查使用。

## 集成

```vue
<CompareProfileChart :series="series" unit="m/s" theme="dark" />
```

```ts
import { CompareProfileChart } from "@leice/profile-compare-chart";
```

## 验证

```bash
npm test
npm run typecheck
npm run build
npm run examples
```

示例构建产物在 `example-dist/`，库构建产物在 `dist/`。
