---
name: backend-project-analysis
description: 写后端代码前确认工程形态和技术栈。新增接口、改响应、接数据或换框架之前先读本技能。
---

# 后端工程判断

本技能只做判断，不改代码。判断结果写进当前任务的说明，不要写进本技能。

`.harness/backend` 自带一份 Java 参考实现，这不代表目标工程是 Java。先看工程本身。

## 检查顺序

| 顺序 | 看什么 | 记什么 |
| --- | --- | --- |
| 1 | 构建文件：`pom.xml`、`build.gradle`、`package.json`、`go.mod`、`pyproject.toml`、`requirements.txt`、`Cargo.toml` | 语言和依赖管理 |
| 2 | 入口：`*Application.java`、`main` 函数、`app.py`、`cmd/` | 启动方式和端口来源 |
| 3 | 路由与控制器目录 | 地址前缀和模块划分 |
| 4 | 统一响应和全局异常 | `code`、`msg`、`data` 的形状 |
| 5 | 鉴权：过滤器、拦截器、中间件、注解 | 令牌头、白名单、失败码 |
| 6 | 分页、上传下载、文件读取 | 参数名和返回字段 |
| 7 | 配置来源：`application.yml`、`.env`、配置中心 | 变量名，不抄值 |
| 8 | 测试目录和命令 | 能不能跑、跑哪些 |
| 9 | 日志和错误上报 | 记什么、报什么 |
| 10 | 部署方式：Dockerfile、脚本、流水线 | 产物和运行方式 |

## 判据

| 看到 | 判断 |
| --- | --- |
| `pom.xml` 或 `build.gradle` 带 Spring 依赖 | Java 加 Spring，读 `backend-java-spring.mdc` |
| `pom.xml` 但没有 Spring | 纯 Java，按现有框架写法，不要引入 Spring |
| `package.json` 里有 express、fastify、koa、nest | Node，按该框架的中间件和路由写 |
| `go.mod` | Go，按 `net/http` 或现有框架写 |
| `pyproject.toml`、`manage.py`、`requirements.txt` | Python，按现有框架写 |
| `Cargo.toml` | Rust，按现有框架写 |
| 只有 `backend/README.md` | 还没有后端工程。先问，不要凭示例新建 |
| 同时存在多套响应包装 | 先问哪一套是现行，不要直接加第三套 |

## 输出

判断完先在任务说明里写清：

1. 语言、框架和构建命令。
2. 响应信封和错误码。
3. 鉴权方式和令牌头。
4. 分页参数和返回字段。
5. 测试命令。
6. 数据目录或文件来源。

缺一项就先去问，不要用默认值顶上。

## 不要

- 不要因为 `.harness/backend/code` 是 Java 就默认新工程也用 Java。
- 不要因为前端是 Vue 就给后端选 Node，语言按现有后端工程定。
- 不要把 `.harness` 当部署目录，业务代码写根目录 `backend/`。
- 不要凭印象写端口、主机、账号和密钥。
