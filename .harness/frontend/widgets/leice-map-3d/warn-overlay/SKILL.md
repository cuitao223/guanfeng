---
name: leice-map-3d-warn
description: 三维报警面。水平切变和垂直切变来自切变图，大风来自风速。只叠一种，按三档填色并画等级边界。
---

# 报警面

`WarnOverlayLayer` 放在 `LeiceMap3d` 内。`warnType` 取 `horizontal`、`vertical` 或 `gale`。空字符串不画。

源码：[WarnOverlayLayer.vue](../assets/layers/WarnOverlayLayer.vue)。分级、边界和数值格式在 [warn.mjs](../assets/logic/warn.mjs)。切变图解码是 [windImage.mjs](../assets/logic/windImage.mjs) 的 `decodeShearImage`，行列说明见 [风场图像到上图](../references/wind-image.md)。

它不使用风场色标，也不做平滑或等值线插值。每个格点先分成缺测、轻度、中度、重度。只有达到下限的格点填色，颜色固定为 `#ffbb00`、`#ff5100`、`#ff0000`。相邻格点等级不同时，在交界处画一条线。卫星底图用白色，矢量底图用黑色。

`values` 与网格等长，由页面准备。水平切变读切变图红色通道，垂直切变读绿色通道，两项都不是由风速差分得到。大风直接使用同一高度的风速。阈值使用告警列表给出的 `min,medium,max`。页面没有给出完整三档时不画。`9999` 和低于 `min` 的格点不画。

同一高度画在风场之上、粒子和风羽之下，并且不写入深度。更高高度的风场在完全不透明时会挡住这一层。

页面在同一格点悬停时，除高度、风速、风向外，再显示报警类型、报警等级和报警值。大风保留 2 位小数，切变保留 4 位小数。没有达到下限时不显示这三项。
