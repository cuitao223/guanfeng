---
name: backend-feature-development
description: 新增或修改一个后端接口的流程。要加接口、改响应字段或接测量文件时使用。技术栈按工程现状，Java 只是参考实现。
---

# 后端接口开发

## 读取顺序

1. `.harness/backend/rules/backend-common.mdc`
2. 技能 `backend-project-analysis`
3. `.harness/backend/rules/backend-response.mdc` 和 `backend-api.mdc`
4. 工程确实是 Java 加 Spring 时，再读 `backend-java-spring.mdc`
5. 接雷达数据时读 `.harness/backend/references/series-api-contract.md` 和 `.harness/data/skills/leice-radar-series/SKILL.md`
6. 需要对照分层时再打开参考实现 `.harness/backend/code/leice-radar-series-service/`

## 流程

1. 定位。接口属于哪个域，前端 `src/api/` 里哪个模块调用，同一目录相邻接口怎么写的。
2. 定契约。先改契约：字段名、形状、单位、缺测、时间格式和错误码。字段名与前端组件入参对齐，例如 `times`、`heightArr`、`values`、`dirs`、`angles`、`unit`。
3. 写代码。领域逻辑放不依赖框架的类，Web 层只做参数、本地化和响应包装。文件读取限定在数据目录内，路径先规范化再校验。
4. 写测试。解析和组装用真实样例文件，覆盖空值、`999`、空行和缺列；接口测成功和失败两条路径。
5. 同步文档。组件 `SKILL.md`、模块 `README.md`、`.harness/backend/references/` 的版本，以及根目录 `AGENTS.md`、`project.md`、`README.md`。

契约先改，代码后改。字段在代码里定完再回填文档，通常会漏。

## 提交前检查

| 项 | 要求 |
| --- | --- |
| 字段名 | 与契约和组件入参一致，不按语言习惯改名 |
| 缺测 | 空值、`NaN`、非有限数都是 `999`；`0` 保留 |
| 时间 | 本地时间，`YYYY-MM-DD HH:mm:ss` 或 Unix 秒，不加 `Z` |
| 单位 | 放 `unit`，展示换算在服务内完成 |
| 错误码 | 不用 `401`、`403`、`404`（前端会覆盖文案）；业务失败用 `400` 或 `500`，文案键有中英文 |
| 路径 | 拒绝目录外路径，包括 `..` 和符号链接 |
| 本地化 | 读 `X-Lang`，缺省英文，不在接口里写死中文 |
| 空结果 | `200` 加空数组，不用 `404` |
| 文档 | 根目录三份说明和组件说明已同步 |

## 验证

按工程已有命令跑，命令以工程为准。常见形式：

| 技术栈 | 命令 |
| --- | --- |
| Java 加 Maven | `mvn -q test` |
| Java 加 Gradle | `gradle test` |
| Node | `npm test` |
| Go | `go test ./...` |
| Python | `pytest` |

没有测试脚本时说明没跑，不要把没执行过的命令写进说明。

## 不要

- 不要在服务里重复前端已经处理的计算，也不要在页面解析测量文件。
- 不要为上传率、异常率、完备率自造公式。口径确认前先不计算。
- 不要返回组件用不到的字段，也不要用近似形态顶替未确认的形态。
- 不要把示例里的包名、端口和数据目录写进业务代码。
