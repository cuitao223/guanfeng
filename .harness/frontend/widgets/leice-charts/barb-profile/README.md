# 单时次风羽廓线

版本 `0.1.0`。Vue 3 风羽廓线，坐标轴使用 D3 7，风羽使用 canvas。`theme` 支持 `dark` 与 `light`。状态是 `approved`。

本包自包含。安装依赖后即可类型检查、构建、运行示例和测试。

## 适用场景

把一个时刻的 `heightArr`、`value`、`dirArr` 画成沿高度排列的风羽。高度轴单位是 m。

## 安装

在本目录执行：

```bash
npm ci
```

## 集成

```vue
<BarbProfileChart :height-arr="heightArr" :value="value" :dir-arr="dirArr" theme="dark" />
```

```ts
import { BarbProfileChart } from "@leice/barb-profile-chart";
```

## 验证

```bash
npm test
npm run typecheck
npm run build
npm run examples
```
