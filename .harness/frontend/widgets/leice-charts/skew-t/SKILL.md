---
name: skew-t
description: >-
  绘制温度对数压力图。温度、露点、状态曲线以及干绝热线、湿绝热线和等比湿线。在单时次探空热力图页使用。
---

# 温度对数压力图

`SkewTChart` 复刻温度对数压力图中的 Skew-T。纵轴是对数气压，横轴是温度，不另加斜切。

## 输入

- `temperature`：`{ pressure, value }`，温度为摄氏度，气压为 hPa。
- `dewPoint`：同样是 `{ pressure, value }`。
- `stateCurve`：`{ pressure, temperature }`。`pressure[0]` 是气块起点，`pressure[1]` 是抬升凝结高度，`temperature[0]` 是起点温度。
- `theme`：`dark` 或 `light`。

`999`、小于等于 `-999`、空值、非有限数和小于等于 0 的气压不画。三条观测曲线都不足两个点时，底图仍在，中央显示无数据。

气块比环境暖的区域为 CAPE，其下方气块偏冷为 CIN，其上方气块偏冷为上层面积。

## 目录

- `assets/src/SkewTChart.vue`：绘图组件
- `assets/src/skewTThermo.ts`：干湿绝热与状态曲线
- `assets/src/skewTProfile.ts`：缺测与面积
- `references/data.md`：字段
- `references/behavior.md`：曲线规则
