---
name: vue3-development
description: 在 Vue 3 微服务前端（Vue 3、Vite、Element Plus、Pinia）中实现功能。用于本平台的页面、接口、权限或国际化。不要用于 Vue 2 或风功率预测。
---

# Vue 3 微服务开发

## 何时使用

分析技能已把仓库判为 `vue3-microservice`。

## 修改前

1. 阅读 `.harness/frontend/rules/vue3-microservice.mdc`。
2. 增加或调用接口时，阅读 `.harness/frontend/rules/vue3-request.mdc`。
3. 阅读 `.harness/frontend/examples/vue3-microservice.md`。
4. 新建页面时，阅读 `.harness/frontend/rules/vue-options-api.mdc`。参照 `frontend/src/views/sample/index.vue`，页面写在 `frontend/src/`。已有 `<script setup>` 文件保持原样。规则、技能和组件可以在 `.harness/` 中按相同结构补充。
5. 界面有可见文案时，阅读 `.harness/frontend/rules/i18n.mdc`。
6. 改动平台页可见样式时，再阅读 `.harness/frontend/rules/vue3-platform-style.mdc` 并使用技能 `vue3-platform-style`。
7. 需要廓线、风羽、时高图、扫描图、统计率或温湿趋势时，先读 `.harness/frontend/skills/leice-chart-mapping/SKILL.md`，再只打开它点名的组件。测量文件到接口的字段见 `.harness/data/skills/leice-radar-series/SKILL.md`。页面不解析测量文件。
8. 页面需要二维或三维地图时，先读 `.harness/frontend/skills/leice-map-packages/SKILL.md`，再只打开它点名的一套。不要在页面里另选地图引擎。

## 步骤

1. 在 `src/api/<领域>/<资源>.js` 中增加函数，调用 `@/utils/request`。GET 用 `params`，POST/PUT 用 `data`。列表成功后读 `res.rows`。URL 形状跟随相邻模块。不要改 `src/utils/request.js`。
2. 按钮、筛选、表单、表格、分页和弹窗先读 `.harness/frontend/skills/leice-ui-packages/SKILL.md`，再用 Element Plus 和其中点名的类。分页用 `el-pagination`。只有正在修改的文件已经使用 `useDict` 时才继续用它。新建的选项式页面跟随本仓库其他新页面的字典写法。
3. 按钮使用 `v-hasPermi="['模块:资源:动作']"`。字符串形状对照 `src/directive/permission/hasPermi.js` 和现有页面，不要自造动作名。
4. 新增的中文界面文案放入 `src/lang/Cn` 和 `src/lang/En`。不要再引入第二套国际化库。
5. 除非任务就是改基础设施，否则不要改 `src/utils/request.js`、`src/permission.js` 和 Pinia 用户仓库。
6. 只有任务要求打包时才运行 `npm run build:prod`。不要虚构 `npm test`。

## 完成条件

- 新建 `.vue` 是选项式 API，且没有中文注释。
- 页面导入的接口函数真实存在。
- `v-hasPermi` 的值是真实权限标识。
- 没有引入风功率预测的默认写法（以 `<script setup>` 为默认、语言文件用 `zh-CN.js`）。

## 常见错误

- 新增或修改 `.harness/` 下的文件。
- 未经要求就把已有 `<script setup>` 页面改成选项式 API。
- 使用 `:visible.sync`、`dicts:`、Vuex 或 `process.env`。
- 页面需要地图时引入 MapLibre，或把 Cesium 用在普通二维页上。
- 照搬 Vue 2 指令的 `inserted` 钩子。
- 任务明确要求高德时，仍用云平台旧规则「只用 Leaflet」拒绝。本仓库现有地图代码是 Leaflet。

## 参考

- `.harness/frontend/examples/vue3-microservice.md`
- `.harness/frontend/rules/vue3-request.mdc`
