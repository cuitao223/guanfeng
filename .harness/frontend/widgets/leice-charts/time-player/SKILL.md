---
name: time-player
description: >-
  地图时间播放条。选择开始时间、分辨率和播放间隔，并在日时间轴上播放或回到当前时刻。
---

# 时间播放条

`TimePlayerSlider` 来自组网三维风页的时间播放滑条。页面里的运行副本是 `src/components/TimePlayerSlider`。本目录是分发副本。

## 输入

- `live`：是否处于实时模式。
- `playInterval`：播放间隔，毫秒。
- `resolutionOptions`：时间步长选项。
- `forecastSpanDays`、`liveDaysBefore`、`liveDaysAfter`：时间轴跨度。

当前时刻变化时发出 `change`，值为 `YYYY-MM-DD HH:mm:ss`。界面文案使用平台语言包 `widget.timePlayer`。
