# 霍多图

版本 `0.1.0`。Vue 3 霍多图，绘图使用 D3 7。`theme` 支持 `dark` 与 `light`。状态是 `approved`。

本包自包含。安装依赖后即可类型检查、构建、运行示例和测试。

## 适用场景

把各高度层的风速和来向画成极坐标轨迹。高度字段 `heightKm` 的单位是 km。

## 安装

在本目录执行：

```bash
npm ci
```

## 集成

```vue
<HodographChart :layers="layers" theme="dark" />
```

```ts
import { HodographChart } from "@leice/hodograph-chart";
```

## 验证

```bash
npm test
npm run typecheck
npm run build
npm run examples
```
