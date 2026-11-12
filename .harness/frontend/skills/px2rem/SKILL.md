---
name: px2rem
description: 用 postcss-pxtorem 和 html rem 适配 Vue 3 微服务界面。编写或审查 Vue/SCSS 样式、行内样式、媒体查询、clamp/vw/vh、Element Plus 宽度或视口布局时使用。
---

# px 转 rem

## 先查看

1. `vite.config.js` 中的 postcss-pxtorem：`rootValue` 为 80，`propList` 为 `['*']`，`minPixelValue` 为 2。Element Plus 的 CSS 会转换，其他 `node_modules` 保持 px。
2. `src/utils/lib-flexible.js`：html 字号为 `clientWidth / 24`（1920 宽对应 80px）。

行内样式里的 px，以及 Element Plus 直接写到 DOM 上的 px，不会被转换。

## 完成样式前核对

- [ ] 尺寸写在 CSS/SCSS 里，使用设计稿 px，不写行内样式
- [ ] 没有再用 `@media` 去改已经由 rem 缩放的字号、内边距、宽高
- [ ] 没有对同一批尺寸再写 `clamp(px, vw/vh, px)`
- [ ] 平台顶栏保持一套布局（导航文字完整显示），不按视口隐藏文字或改成汉堡菜单
- [ ] ECharts、D3、canvas 使用 `designPx()`（`src/utils/chart/designPx.js`），不写死 fontSize 或 grid 的 px
- [ ] Element Plus 尺寸用类名、CSS、`:deep()` 或 `--el-*` 覆盖，不用 `style` 或 `:size`
- [ ] 新注释是英文 ASCII

## 允许保留的行内或脚本像素

- 动态颜色：`:style="{ color: statusColor(row) }"`
- Leaflet 坐标：标记的 `iconSize`、弹窗的 left/top
- 百分比：`width: 100%`
- 图表尺寸：`src/utils/chart/designPx.js` 的 `designPx()` / `designPxCss()`（rootValue 80）

## Element Plus

`node_modules/element-plus` 下的主题 CSS 会参与转换，控件尺寸跟随 html rem。Leaflet 和其他依赖保持排除。

这些属性仍会输出物理像素，不会被转换：`width="500px"`、`label-width="120px"`、图标 `:size`。优先用 CSS、`:deep()` 或 `--el-*`。新弹窗和表单能用类名设置宽度时，不要再写 `width="920px"` 或 `label-width="140px"`。

不要在运行时改写 DOM 像素。`el-config-provider` 的尺寸只有小、中、大，不跟随 rem。

## Leaflet 标注和弹窗

Leaflet 1.9 的 `.leaflet-container` 先写 `font-size: 12px`，下一行又写成 `0.75rem`。`.leaflet-popup-content` 使用 `1.08333em`。本平台 1rem 等于 `clientWidth / 24`，1920 宽是 80px，所以地图文字大约是 60px，不是 12px。`node_modules` 里的 leaflet.css 不会被 pxtorem 改写，不能指望那条 12px 生效。

`L.divIcon` 默认 12×12。字被放大后，中文会在这个盒子里一字一行竖排。

二维地图包已经在 `LeiceMap2d` 里用更高优先级覆盖容器、弹窗和 tooltip 的字号，设备标签不换行并放在图标外侧。新增 Leaflet 文字时继续写设计稿 px，让 rootValue 80 去转换。不要再写 `0.75rem`，也不要继承 `body` 上 `16 * devicePixelRatio` 的行内字号。`iconSize`、`iconAnchor` 仍放在脚本里。

规则文件：`.harness/frontend/rules/px2rem.mdc`。
