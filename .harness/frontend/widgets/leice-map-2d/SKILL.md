---
name: leice-map-2d
description: 二维 Leaflet 底图、指北标、设备点、报警点和风力填色，以及互斥的风羽、箭头、粒子。页面需要二维地图时先读本技能，再只打开点名的图层。
---

# 二维地图

本包已通过审核。页面先选定一个图层，再只打开该图层的 `SKILL.md`。不要同时展开多套源码。引擎是 Leaflet。不引入 MapLibre，也不使用 Cesium。

组件接收已经准备好的字段，不请求文件或设备接口。瓦片地址、图片和图标由页面传入。目标运行环境是 Vue 3。页面在 `frontend/` 安装 `leaflet`，并引入 `leaflet/dist/leaflet.css`。依赖写入 `frontend/package.json`。

| 需求 | 读取 | 组件 |
| --- | --- | --- |
| 底图 | [底图](base-map/SKILL.md) | `LeiceMap2d`。传入瓦片地址模板 |
| 指北标 | [指北标](north-marker/SKILL.md) | `NorthMarker` |
| 设备点 | [设备点](device-markers/SKILL.md) | `DeviceMarkers` |
| 报警点 | [报警点](alert-markers/SKILL.md) | `AlertMarkers` |
| 风力填色 | [风力填色](scalar-image/SKILL.md) | `ScalarImageLayer` |
| 风羽 | [风羽](wind-barb/SKILL.md) | `WindSampleLayer`，`form` 为 `barb` |
| 箭头 | [箭头](wind-arrow/SKILL.md) | `WindSampleLayer`，`form` 为 `arrow` |
| 粒子 | [粒子](wind-particle/SKILL.md) | `WindParticleLayer` |

风羽、箭头、粒子同一时刻只保留一种。页面用 `toggleWindForm` 切换。字段和与参考页的差异见 [数据契约](references/data.md)、[行为差异](references/behavior.md)。

## 读取顺序

1. 用上表确定图层。
2. 打开该图层的 `SKILL.md`。
3. 需要字段时打开 [数据契约](references/data.md)。
4. 接入页面时打开 `assets/layers/` 里点名的组件。计算规则在 `assets/logic/`。
5. 检查固定数据时运行 [README](README.md) 里的命令。

未出现在上表中的图层尚未提取。降水、温度、湿度、气压不要补做。时间播放条留在绘图包，不要放进本目录。

版本 0.1.0。状态为 `approved`。
