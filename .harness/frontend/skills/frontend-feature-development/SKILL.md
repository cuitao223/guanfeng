---
name: frontend-feature-development
description: 按当前 Vue 3 微服务平台已有架构实现页面、表单、表格、弹窗或接口。package.json 已证明是 Vue 3、Vite、Element Plus、Pinia 时使用。
---

# 前端功能开发

这是本平台改页面的顺序。框架细节在 `vue3-development`。

## 修改前

1. 确认 `frontend/package.json` 和 `frontend/src/` 已存在。页面写在 `frontend/src/`，静态资源写在 `frontend/public/`。规则、技能和组件写在 `.harness/` 的对应目录。
2. 阅读前端工程的 `package.json`。确认 Vue 3、Vite、Element Plus、Pinia。对不上就停止。
3. 阅读 `.harness/frontend/rules/frontend-common.mdc` 和 `.harness/frontend/rules/vue3-microservice.mdc`。
4. 新页面参照前端工程的 `src/views/sample/index.vue`。已有页面从当前文件追到接口。不要凭记忆起稿。

## 步骤

1. 列出要新增或修改的文件，优先放进现有目录。
2. 按类型技能处理页面、表单、请求和权限。接口阅读 `.harness/frontend/rules/vue3-request.mdc`。通用控件先读技能 `leice-ui-packages`。改平台页样式时再使用技能 `vue3-platform-style`。
3. 复用当前项目的请求封装、表格、弹窗和上传组件。不要新建第二套 Axios。
4. 新建 `.vue`、`.js`、`.ts` 的注释只用 ASCII。界面文案放到该项目已经存放文案的位置。
5. 代码和文档中不写真实主机、令牌或账号。
6. 只用 `package.json` 里真实存在的命令做验证，并写明实际跑了什么。

## 完成条件

- 新代码与追踪到的示例使用相同的组件和请求写法。
- 没有新增第二套组件库、状态库或地图引擎。
- 权限标识与现有字符串一致，或来自用户的明确答复。
- 已报告验证输出；若没有对应脚本，要写明未运行的原因。

## 常见错误

- 新增或修改 `.harness/` 下的文件。
- 同时套用 Vue 2 和 Vue 3 规则。
- 在单机应用里新建 `src/views/system`。
- 项目没有 `npm test` 却声称测试已通过。

没有单独的公共接口技能。请求步骤因客户端而不同，写在各自的类型技能里。
