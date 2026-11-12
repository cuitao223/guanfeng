# 雷达序列服务（Java 参考实现）

版本 `0.1.0`。JDK 17，Spring Boot 3.2，Maven。

把 DBS 和 PPI 测量文件整理成绘图接口。接口契约与语言无关，见 [`../../references/series-api-contract.md`](../../references/series-api-contract.md)。本目录只是一种实现，换语言时不需要照搬类名和包名。

## 构建

```bash
mvn -q package
```

产物：

- `target/leice-radar-series-0.1.0.jar`：普通 jar，供业务工程依赖。
- `target/leice-radar-series-0.1.0-demo.jar`：带 `demo` 分类器的可执行 jar。

## 运行

```bash
mvn spring-boot:run
```

或：

```bash
java -jar target/leice-radar-series-0.1.0-demo.jar
```

默认数据目录是 `samples`，默认端口 `8080`。用环境变量覆盖：

| 变量 | 作用 | 缺省 |
| --- | --- | --- |
| `RADAR_DATA_DIR` | 测量文件根目录 | `samples` |
| `RADAR_DEMO_PORT` | 演示服务端口 | `8080` |

也可以写 `application.yml` 里的 `radar.data-dir` 和 `radar.max-file-size-mb`。不要把真实存储路径提交进仓库。

## 验证

```bash
mvn -q test
```

测试覆盖 DBS 和 PPI 解析、缺测换算、风羽成对缺测、高度获取率平均、扫描角度排序，以及接口响应信封、中文文案和目录外路径拦截。

## 目录

```text
src/main/java/com/leice/radar/
├── config/     配置与消息源
├── demo/       可运行演示启动类
├── error/      业务异常
├── parse/      CSV 读取、列名解析、DBS 和 PPI 布局
├── series/     绘图数组组装
└── web/        控制器、响应信封、异常处理、路径校验
```

`parse` 和 `series` 不引用 Spring，Web 层只做参数、本地化和响应包装。

## 样例

`samples/dbs-sample.csv` 和 `samples/ppi-sample.csv` 是合成的两行高度、三行时间，用来说明表头形状和缺测写法。不要把它们当成真实观测。

## 已知限制

- 只实现 PPI，不实现 RHI。
- 不做信噪比、谱宽、谱强的展示换算。
- 不计算上传率、异常率、完备率。
- 没有文件列表、分页和缓存。
- 没有鉴权实现，沿用业务工程的令牌和权限。
