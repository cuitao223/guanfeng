# Vue 3 微服务示例

## 不要混淆这些产品

| 检查 | 微服务前端 | 不是这一类 |
| --- | --- | --- |
| 技术栈 | Vue 3、Vite、Element Plus、Pinia | Vue 2、Vuex、Element UI |
| 环境变量 | `import.meta.env.VITE_APP_BASE_API` | `process.env.VUE_APP_*` |
| 新页面写法 | 选项式 API。许多旧文件仍是 `<script setup>` | `windpowerpredict` 以 `<script setup>` 为主，保持原样 |

## 用户页和接口

`src/views/system/user/index.vue` 是已有的 `<script setup>` 页面。它使用 `useDict`、`v-hasPermi="['system:user:add']"`，弹窗使用 `v-model`。保持它的写法。

`src/api/system/user.js` 导出 `listUser`，地址是 `/system/user/list`。

新页面遵循 `.harness/frontend/rules/vue-options-api.mdc`，不要照这个旧页面的 `<script setup>`。

## 请求和权限

`src/utils/request.js` 是唯一的接口客户端。见 `.harness/frontend/rules/vue3-request.mdc`。`src/api/sample.js` 把 `listSample` 导出为 GET `/sample/list`。`code` 为 `200` 时，辅助函数解析 `res.data`。`src/views/sample/index.vue` 读取 `res.rows`。

`src/directive/permission/hasPermi.js` 使用 `mounted` 和 `useUserStore().permissions`。

`src/permission.js` 在 `generateRoutes()` 之后用 `router.addRoute` 装入路由。

## 命令

`npm run dev`、`npm run build:prod`、`npm run build:stage`、`npm run preview`。当时没有 `lint` 脚本，也没有 Jest 配置。不要编造一次测试运行。
