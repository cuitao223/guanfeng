# 后端工程

本目录是可运行的后端示例工程，依赖 `.harness/backend/code/leice-radar-series-service` 里的雷达序列组件。业务代码也写在这里。

## 启动

先把组件安装到本地仓库，再启动示例：

```bash
mvn -q -f .harness/backend/code/leice-radar-series-service/pom.xml install
mvn -q -f backend/pom.xml spring-boot:run
```

默认端口 `8080`，数据目录指向组件的 `samples`。换目录或端口时用环境变量：

```bash
RADAR_DEMO_PORT=18080 RADAR_DATA_DIR=/absolute/path/to/measurements mvn -q -f backend/pom.xml spring-boot:run
```

接口说明见 `.harness/backend/references/series-api-contract.md`，请求示例见 `.harness/backend/examples/request-examples.md`。

## 目录

```text
backend/
├── pom.xml                       依赖雷达序列组件
└── src/main/
    ├── java/com/leice/radar/demo/RadarSeriesDemoApplication.java
    └── resources/application.yml
```

规则和技能在 `.harness/backend/`。组件源码、样例和测试在 `.harness/backend/code/leice-radar-series-service/`。
