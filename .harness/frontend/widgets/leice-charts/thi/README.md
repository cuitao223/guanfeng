# 时高图

版本 `0.1.9`。Vue 3 时高填色，绘图使用 D3 7。设置和色标弹窗使用 Element Plus。`theme` 支持 `dark` 与 `light`。

## 安装

在本目录执行 `npm ci`。业务项目使用自己的 Vue 3.3 及以上。本包 devDependencies 固定 Vue 3.4.38，供示例和类型检查使用。

## 集成

```vue
<ThiChart
  :times="times"
  :height-arr="heightArr"
  :values="values"
  :windpara="windpara"
  unit="m/s"
  :breakpoints="[0, 4, 8]"
  :colors="['#1d4e89', '#7eb6d9', '#f2e6c2']"
  color-mode="linear"
  theme="dark"
/>
```

`values[时间下标][高度下标]`。`windpara[i][2]` 是该列覆盖秒数，缺省按 600 秒。

## 验证

```bash
npm run typecheck
npm run build
npm run examples
npm run test
```

## 已知问题

- 尚未与生产页面做像素级对照。本版已打包，供下游连通性测试。
- 不包含风羽叠加。风羽仍是单独组件。
- 色标默认值只是示例回退，不是产品色标。
- 黑暗 / 明亮的具体色值尚未锁定。
- 未做与生产页面的像素级对照。
- 容器小于 100 像素时不绘制。
- 超过绘图区的网格会先采样到不超过 480×320 的位图再放大，细部以屏幕分辨率为限。

见 [references/data.md](references/data.md) 和 [THIRD-PARTY.md](THIRD-PARTY.md)。
