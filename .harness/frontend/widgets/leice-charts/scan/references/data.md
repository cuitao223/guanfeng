# 数据契约

| 字段 | 含义 |
| --- | --- |
| `mode` | `ppi` 或 `rhi` |
| `angles` | PPI 为方位角，RHI 为俯仰角，单位度 |
| `heightArr` | 距离门，单位 m，各角度共用 |
| `values` | `values[角度下标][距离门下标]` |
| `maxRange` | 半径对应的最大距离，默认 15000 |
| `unit` | 色标和提示单位 |
| `breakpoints` / `colors` | 色标。默认 `[0, 10]` 与两色只是示例回退 |
| `colorMode` | `linear` 或 `threshold` |
| `legendPlacement` | `right` 或 `bottom` |
| `theme` | `dark` 或 `light` |
| `palette` | 覆盖绘图区颜色。不是公司令牌 |

无锡平台四类扫描产品仍由调用方选择传入哪一层数值：

| id | 名称 | 单位 |
| --- | --- | --- |
| `wind` | 径向风 | m/s |
| `snr` | 信噪比 | dB |
| `spectralWidth` | 谱宽 | MHz |
| `spectralIntensity` | 谱强 | dB |

缺测：有限数 `999`，或小于等于 `-999`。空值和非有限数不绘制。
