---
name: leice-radar-series-service
description: 把激光雷达测量文件整理成绘图接口的参考实现。需要 DBS 风廓线、垂直风、信噪比、温湿趋势、高度获取率或 PPI 扫描接口时使用。Java 只是示例，其他技术栈按契约实现。
---

# 雷达序列服务

页面只请求接口，不打开测量文件。本组件读 DBS 和 PPI 文件，输出 `barb-thi`、`thi`、`dual-axis-line`、`scan` 和统计柱状图能直接用的数组。

技术栈定位：这里是 Java 17 加 Spring Boot 3.2 的参考实现。工程不是 Java 时，读 `.harness/backend/references/series-api-contract.md`，按同一份契约在自己的框架里实现，不要为了用它把工程换成 Java。

## 目录

- [接口契约](../../references/series-api-contract.md)
- [测量文件说明](../../../data/skills/leice-radar-series/SKILL.md)
- [安装与验证](README.md)
- [源码](src/main/java/com/leice/radar)
- [样例文件](samples)
- [单元测试](src/test/java/com/leice/radar)

## 接口

| 接口 | 输出 |
| --- | --- |
| `GET /radar/series/dbs/wind-profile` | `times`、`heightArr`、`values`、`dirs`、`unit` |
| `GET /radar/series/dbs/vertical-wind` | `times`、`heightArr`、`values`、`unit` |
| `GET /radar/series/dbs/snr` | 同上，原始 `dB` 值 |
| `GET /radar/series/dbs/temperature-humidity` | `times`、`temperature`、`humidity` |
| `GET /radar/series/dbs/height-obtain-rate` | `name`、`categories`、`values` |
| `GET /radar/series/ppi/scan` | `mode`、`angles`、`heightArr`、`values`、`pitch`、`unit` |

## 运行

```bash
cd .harness/backend/code/leice-radar-series-service
mvn spring-boot:run
```

默认端口 `8080`，数据目录 `samples`。两个值都用环境变量覆盖：

```bash
RADAR_DEMO_PORT=18080 RADAR_DATA_DIR=./samples mvn spring-boot:run
```

## 接入业务工程

依赖普通 jar。业务工程按包扫描，不要直接扫描 `com.leice.radar`，否则演示启动类也会被当成配置。只扫描这三个包：

```java
@SpringBootApplication(scanBasePackages = {
        "com.your.company",
        "com.leice.radar.config",
        "com.leice.radar.series",
        "com.leice.radar.web"
})
```

```xml
<dependency>
    <groupId>com.leice</groupId>
    <artifactId>leice-radar-series</artifactId>
    <version>0.1.0</version>
</dependency>
```

配置至少给 `radar.data-dir`。路径按部署环境给，不写进仓库。

## 验证

```bash
mvn -q test
```

## 已知限制

- 只实现 PPI。RHI 的俯仰角口径未确认，不提供接口。
- 信噪比、谱宽、谱强返回原始值，不做展示换算。
- 不计算上传率、异常率、完备率。文件里没有这三个公式。
- 不提供文件列表和分页，文件路径来自平台的资料接口。
- 每次请求重新解析整个文件，没有缓存和索引。接入真实部署时按数据量补缓存。
- 样例文件是合成的，不含真实设备和站点数据。

版本 `0.1.0`。
