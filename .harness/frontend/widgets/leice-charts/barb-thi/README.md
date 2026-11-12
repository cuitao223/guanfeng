# 风羽时高图组件

版本 `0.1.0`。Vue 3 时间-高度风羽图，绘图使用 D3 7。`theme` 支持 `dark` 与 `light`。

本包自包含。安装依赖后即可类型检查、构建、运行示例和测试，不需要工作区里的其他文件，也不需要全局安装 Vue 或 D3。

## 适用场景

把 `times`、`heightArr`、`values` 与 `dirs` 画成一张风羽时高图。高度轴单位是 m。

## 安装

在本目录执行：

```bash
npm ci
```

`vue` 是 peer dependency，本包的 devDependencies 里固定了 Vue 3.4.38，供示例和类型检查使用。业务项目安装时使用自己的 Vue 3.3 及以上版本。

## 集成

```vue
<BarbThiChart
  :times="times"
  :height-arr="heightArr"
  :values="values"
  :dirs="dirs"
  unit="m/s"
  theme="dark"
/>
```

```ts
import { BarbThiChart } from "@leice/barb-thi-chart";
```

组件源码和示例在 `assets/`。缺测与风羽档位检查在 `scripts/`。库构建产物在 `dist/`，不进入交付压缩包。

## 验证

```bash
npm run typecheck
npm run build
npm run examples
npm run test
```

打开示例页面时，在本目录执行：

```bash
npx vite --config vite.example.config.ts --host 127.0.0.1 --port 5186
```

`npm run examples` 只构建静态页，不会启动浏览器。示例读取 `assets/examples/wind.json`，字段是 `timeAxis`、`heightAxis`、`windSpeed`、`windDir`。

## 数据契约

见 [references/data.md](references/data.md)。

## 已知问题

- 状态为 `approved`。历史记录见 `REVIEW.md`。
- 黑暗 / 明亮的具体色值尚未锁定。可用 `palette` 替换。
- 默认色标 `[0, 10]` 只是未传入色标时的回退，不是产品风色标。
- 还没有与生产页面做像素级对照。
- 容器宽或高小于 100 时不绘制。

## 第三方依赖

见 [THIRD-PARTY.md](THIRD-PARTY.md)。
