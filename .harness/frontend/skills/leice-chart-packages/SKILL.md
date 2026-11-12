---
name: leice-chart-packages
description: 在本平台内选择已实现的绘图、时间播放条和地图图层控制组件。需要这些组件时使用，先读 .harness/frontend/widgets/leice-charts/SKILL.md，再只打开点名的组件目录。
---

# 绘图组件入口

组件都在 `.harness/frontend/widgets/leice-charts/`。业务图先读 `.harness/frontend/skills/leice-chart-mapping/SKILL.md`，再读 `.harness/frontend/widgets/leice-charts/SKILL.md`，只打开点名的一个组件目录。

组件能否使用以该组件目录里的 `deliverable.json` 为准。`status` 为 `approved` 时可以使用。变更记录里的草稿字样是历史，不阻止使用。不要同时展开多个组件，也不要到本包以外查找绘图实现。时间播放条和图层控制的页面运行副本分别在项目根目录的 `src/components/TimePlayerSlider` 与 `src/components/LayerControlPanel`。
