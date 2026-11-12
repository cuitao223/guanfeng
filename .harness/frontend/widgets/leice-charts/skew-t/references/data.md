# 字段

对应温度对数压力图聚合结果里的三段，组件不发请求。

| 属性 | 形状 |
| --- | --- |
| `temperature` | `{ pressure: number[], value: number[] }` |
| `dewPoint` | `{ pressure: number[], value: number[] }` |
| `stateCurve` | `{ pressure: number[], temperature: number[] }` |

`999` 与 `-999` 缺测。温度 `0` 是有效值。示例廓线是按该形状造的演示数据，不是实况样本。
