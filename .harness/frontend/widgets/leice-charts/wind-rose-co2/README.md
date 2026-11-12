# 二氧化碳风玫瑰

版本 `0.1.0`。Vue 3 二氧化碳小时通量风玫瑰，绘图使用 D3 7。`theme` 支持 `dark` 与 `light`。状态是 `approved`。

本包自包含。与普通风羽、普通风玫瑰分开。安装依赖后即可类型检查、构建、运行示例和测试。

## 适用场景

把方向和通量画成 16 方位风玫瑰。

## 安装

在本目录执行：

```bash
npm ci
```

## 集成

```vue
<WindRoseCo2Chart :samples="samples" :max-value="1000" :height-m="100" theme="dark" />
```

```ts
import { WindRoseCo2Chart } from "@leice/wind-rose-co2-chart";
```

## 验证

```bash
npm test
npm run typecheck
npm run build
npm run examples
```
