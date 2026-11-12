# 廓线组件

版本 `0.1.3`。Vue 3 单条高度廓线，绘图使用 D3 7。`theme` 支持 `dark` 与 `light`。

本包自包含。安装依赖后即可类型检查、构建、运行示例和测试，不需要工作区里的其他文件，也不需要全局安装 Vue 或 D3。

## 适用场景

把等长的 `heightArr` 与 `value` 画成一条高度廓线。高度轴单位是 m，默认范围 0 到 10000。

## 安装

在本目录执行：

```bash
npm ci
```

`vue` 是 peer dependency，本包的 devDependencies 里固定了 Vue 3.4.38，供示例和类型检查使用。业务项目安装时使用自己的 Vue 3.3 及以上版本。

## 集成

```vue
<ProfileChart
  :height-arr="heightArr"
  :value="value"
  unit="m/s"
  theme="dark"
/>
```

```ts
import { ProfileChart } from "@leice/profile-chart";
```

组件源码和固定样例在 `assets/`。缺测与空数据检查在 `scripts/`。库构建产物在 `dist/`，不进入交付压缩包。

## 验证

```bash
npm run typecheck
npm run build
npm run examples
npm run test
```

`typecheck` 使用 vue-tsc。`build` 产出组件库。`examples` 产出示例页面。`test` 检查缺测、数值 0、断线和空序列。

## 数据契约

见 [references/data.md](references/data.md)。

## 已知问题

- 黑暗 / 明亮的具体色值尚未锁定。`dark` 与 `light` 可用 `palette` 替换。
- 旧页面用采样补间把空数组画成 0。本组件去掉了这段动画，缺测处折线断开。
- 还没有与生产页面做像素级对照。
- 容器宽或高小于 40 时不绘制。
- 绘图行为在 0.1.0 审核通过。0.1.1 只调整交付目录。0.1.2 调整圆点规则后打包，供下游连通性测试。记录见 `REVIEW.md`。主题色和组件仓库框架划分仍未锁定。

## 第三方依赖

见 [THIRD-PARTY.md](THIRD-PARTY.md)。
