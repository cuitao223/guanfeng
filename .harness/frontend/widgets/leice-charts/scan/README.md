# 扫描图组件

版本 `0.1.1`。Vue 3 的 PPI / RHI 扫描图，绘图使用 D3 7。`theme` 支持 `dark` 与 `light`。

本包自包含。安装依赖后即可类型检查、构建、运行示例和测试。

## 适用场景

用 `angles`、`heightArr` 和 `values` 画一张极坐标扫描图。`mode="ppi"` 画平面扫描，`mode="rhi"` 画距离高度扫描。

## 安装

在本目录执行：

```bash
npm ci
```

## 集成

```vue
<ScanChart
  mode="ppi"
  :angles="angles"
  :height-arr="heightArr"
  :values="values"
  unit="m/s"
  theme="dark"
/>
```

```ts
import { ScanChart } from "@leice/scan-chart";
```

## 验证

```bash
npm run typecheck
npm run build
npm run examples
npm run test
```

打开示例页面时，在本目录执行：

```bash
npx vite --config vite.example.config.ts --host 127.0.0.1 --port 5187
```

`npm run examples` 只构建静态页，不会启动浏览器。示例数据是组件内生成的扇区，用来切换 PPI 和 RHI。

## 已知问题

- 状态为 `approved`。历史记录见 `REVIEW.md`。
- 黑暗 / 明亮的具体色值尚未锁定。
- 默认色标只是未传入色标时的回退，不是产品扫描色标。
- 还没有与生产页面做像素级对照。

## 第三方依赖

见 [THIRD-PARTY.md](THIRD-PARTY.md)。
