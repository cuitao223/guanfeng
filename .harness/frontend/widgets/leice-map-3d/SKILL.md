---
name: leice-map-3d
description: 三维离线高德底图、风场填色、风羽、粒子、报警面、设备点和 PPI 扇区。页面需要三维气象地图时先读本技能，再只打开点名的图层。
---

# 三维气象地图

本包已通过审核。页面先选定一个图层，再只打开该图层的 `SKILL.md`。引擎是页面自带的离线高德脚本与 Three.js。底图使用脚本的三维视图。气象图层画在对齐该视图相机的透明画布上，因为脚本给出的自定义图层上下文是 WebGL 1，当前 `three` 只接受 WebGL 2。不要引入 MapLibre、Cesium 或二维地图库，也不要把它用于普通二维页。

组件接收已经准备好的字段，不请求接口。瓦片地址由页面传入。页面加载离线高德脚本，并在 `frontend/` 安装 `three`。依赖写入 `frontend/package.json`。

| 需求 | 读取 | 组件 |
| --- | --- | --- |
| 底图 | [底图](base-map/SKILL.md) | `LeiceMap3d`。传入卫星和矢量瓦片地址 |
| 风场填色 | [风场](wind-field/SKILL.md) | `WindFieldLayer` |
| 风羽 | [风羽](wind-barb/SKILL.md) | `WindBarbLayer`。`kind` 为 `arrow` 时画箭头 |
| 空间标尺 | [空间标尺](volume-scale/SKILL.md) | `VolumeScaleLayer` |
| 粒子 | [粒子](wind-particle/SKILL.md) | `WindParticleLayer` |
| 报警面 | [报警](warn-overlay/SKILL.md) | `WarnOverlayLayer` |
| 设备点 | [设备点](device-markers/SKILL.md) | `DeviceMarkers` |
| PPI 扇区 | [PPI](ppi-sector/SKILL.md) | `PpiSectorLayer` |

风场、风羽、粒子可以同时打开。填色样式和报警类型由页面单选。字段和差异见 [数据契约](references/data.md)、[行为差异](references/behavior.md)。

## 读取顺序

1. 用上表确定图层。
2. 打开该图层的 `SKILL.md`。
3. 需要字段时打开 [数据契约](references/data.md)。风场图像解码见 [风场图像到上图](references/wind-image.md)。
4. 接入页面时打开 `assets/layers/` 里点名的组件。计算规则在 `assets/logic/`。
5. 检查固定数据时运行 [README](README.md) 里的命令。

未出现在上表中的地图绘制尚未提取。组网三维风页的时间播放用绘图汇总里的 `time-player`。左侧控制、右下角工具栏和色标条是 `wind-field-layer-panel`、`wind-map-toolbar`、`wind-color-bar`，状态为 `approved`，不在本包的图层表里。绘图编辑、垂面点选、空间标尺网格、告警列表、直方图取数和接口留在页面。

版本 0.1.0。状态为 `approved`。
