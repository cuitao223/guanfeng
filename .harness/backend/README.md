# 后端规范

本目录放后端规则、技能、接口契约和参考实现。业务代码写在根目录 `backend/`。

接口契约与语言无关。Java 17 加 Spring Boot 3.2 只是 `code/leice-radar-series-service` 里的参考实现，不是指定技术栈。工程用 Node、Go、Python 或其他框架时，按同一份契约实现，写法换成该技术栈的等价做法。

## 目录

| 路径 | 作用 |
| --- | --- |
| `rules/` | 通用约束、响应契约、接口契约和 Java 参考写法，扩展名 `.mdc` |
| `skills/` | 先判断工程形态、再新增接口的流程，入口是 `SKILL.md` |
| `references/series-api-contract.md` | 雷达序列接口契约，语言无关 |
| `code/leice-radar-series-service/` | Java 参考实现，可在本地起服务验证 |
| `examples/request-examples.md` | curl 和前端调用示例 |

## 阅读顺序

1. `rules/backend-common.mdc`
2. 技能 `skills/backend-project-analysis`
3. 技能 `skills/backend-feature-development`
4. `rules/backend-response.mdc` 和 `rules/backend-api.mdc`
5. 接雷达数据时读 `code/leice-radar-series-service/SKILL.md`，再读 `references/series-api-contract.md`
6. 工程确实是 Java 加 Spring 时才读 `rules/backend-java-spring.mdc`

## 技术栈怎么定

不要因为本目录带一份 Java 实现就默认新工程也用 Java。先按 `backend-project-analysis` 检查现有工程，再决定。没有后端工程时先问，不要凭这份示例直接新建。

## 新增后端能力的流程

1. 判断工程形态和技术栈，记录响应包装、鉴权、分页、错误码和测试命令。
2. 先改契约：`references/` 里的字段和示例，与前端 `src/api/` 和 `.harness/frontend/widgets/` 的入参对齐。
3. 写规则或技能：只写这个工程成立的做法，不写「应该像 Java 那样」。
4. 补代码和示例：参考实现放 `code/`，业务实现放根目录 `backend/`。
5. 同步根目录 `AGENTS.md`、`project.md`、`README.md`。这一步不能省。
6. 验证：按工程已有命令跑，不要把没跑过的命令写成已通过。

## 数据来源

测量文件如何整理成绘图接口见 `.harness/data/skills/leice-radar-series/SKILL.md`。页面不解析测量文件，后端不返回组件用不到的字段。

## 约束

- 说明文档用中文，源码注释用 ASCII 英文，用户可见文案放语言文件。
- 不写真实主机、令牌、账号和客户地址。变量名可以写，值不行。
