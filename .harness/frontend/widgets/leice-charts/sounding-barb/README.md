# 探空风羽

版本 `0.1.0`。Vue 3 探空风羽，绘图使用 D3 7 与画布。`theme` 支持 `dark` 与 `light`。状态是 `approved`。

本包自包含。安装依赖后即可类型检查、构建、运行示例和测试。

## 适用场景

把探空气压层上的风画成标准层风羽。与单时次高度风羽 `barb-profile` 的字段不同。

## 安装

在本目录执行：

```bash
npm ci
```

## 集成

```vue
<SoundingBarbChart :pressure="pressure" :value="value" :wind-dir="windDir" :height="height" theme="dark" />
```

```ts
import { SoundingBarbChart } from "@leice/sounding-barb-chart";
```

## 验证

```bash
npm test
npm run typecheck
npm run build
npm run examples
```
