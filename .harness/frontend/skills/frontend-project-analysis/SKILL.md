---
name: frontend-project-analysis
description: 确认当前工程是 Vue 3 微服务平台，并指出应阅读的规范。在修改 src 之前，或怀疑仓库不属于该平台时使用。
---

# 前端项目识别

前端工程在 `frontend/`。先确认 `frontend/package.json` 和 `frontend/src/`，再用这份 `package.json` 证明类型。`.harness/` 存放规则、技能、示例、组件和页面模板，可以阅读，也可以按现有目录补充。

## 动手前

1. 确认 `frontend/package.json` 和 `frontend/src/` 已存在。页面、静态资源和前端配置写在 `frontend/`。规则、技能和组件写在 `.harness/` 的对应目录。
2. 阅读前端工程 `package.json` 的依赖和脚本，以及同目录的环境文件名和 `vite.config.*`。只记录变量名，不记录变量值。
3. 用这些文件确认 Vue 主版本、路由、状态库和组件库。

## 判定

| 证据 | 类型 | 下一步 |
| --- | --- | --- |
| Vue 3、Vite、Element Plus、Pinia | `vue3-microservice` | 规则 `.harness/frontend/rules/vue3-microservice.mdc`，技能 `vue3-development` |
| Vue 2.6、Vuex、Element UI、Vue CLI | 不是本平台 | 停止。不要在本仓库里另建 Vue 2 工程 |
| Vue 3、Vite、Element Plus，且项目是风功率预测 | 独立产品 | 停止。不要使用本平台的微服务技能 |
| 没有权限指令，也没有 `src/api/system`，且不是上面的 Vue 3 微服务 | 不是本平台 | 停止。不要在本仓库里另建单机工程 |

## 输出

说明：类型、证据文件、请求封装路径，以及应阅读的规则。本平台只使用 Vue 3 微服务这一套。

## 完成条件

类型能由前端工程的 `package.json` 证明。对不上的仓库不要在这里改成另一种前端。

## 常见错误

- README 仍写 Element UI，但 `package.json` 已是 Element Plus，却仍按 README 判断。
- 再执行生成命令，造出第二个工程。
- 把新增的规则、技能或组件散落到 `.harness/` 以外。按现有目录放入 `.harness/frontend/rules`、`skills`、`widgets` 或 `pages`。
