---
name: vue3-platform-style
description: 按本平台 PlatformLayout 编写或审查平台页样式。涉及顶栏、内容壳、列表筛选、表格、表单弹窗、确认框、颜色或圆角时使用。不要用于 Vue 2、风功率预测、单机 Web 或后台 AdminLayout。
---

# 平台页样式

## 何时使用

仓库已被技能 `frontend-project-analysis` 判为 `vue3-microservice`，并且本次改动会改变平台页的可见样式。控件先由技能 `leice-ui-packages` 选定。只改接口、权限或文案时不用本技能。

Vue 2 组网、风功率预测和单机 Web 停止使用本技能。那些项目不使用这里的类名和色值。

## 修改前

1. 阅读 `.harness/frontend/rules/vue3-platform-style.mdc`。
2. 阅读 `.harness/frontend/rules/px2rem.mdc` 和 `.harness/frontend/skills/px2rem/SKILL.md`。
3. 打开目标页，以及 `src/layout/PlatformLayout/` 里对应的壳。列表页再打开 `src/assets/styles/platform-manage-shell.scss`；弹窗再打开 `platform-form-dialog.scss`；确认框再打开 `platform-message-box.scss`。
4. 找到一个已经上线的同类页面，沿用它的类，不新造一套皮肤。

## 壳层

平台页的外层是 `PlatformLayout`：纵向撑满视口，顶栏固定 80px，主区域占满剩余高度。`created` 里若当前不是深色，会切到深色。顶栏里的主题切换已停用，新页面保持深色。

内容区使用 `PlatformContentShell`。普通业务页留在卡片里，并带目录页签和标签栏。以下路由保持裸布局，不要再包一层白卡片：

- `/overview` 及其子路径。顶栏用 `is-overlay` 浮在内容上。
- 组件名为 `DirectoryTabs` 的路由。
- `meta.fullBleed`。
- 以 `/redirect` 开头的路径。

不要在业务页里重写 `.platform-header` 或另做侧栏。后台 `AdminLayout` 的侧栏色 `#1a1f2e`、菜单激活色 `#409EFF` 只属于那套后台壳，平台页的强调色是 `#206aff`。

## 新页面怎么挂样式

列表页：

- 筛选条使用已有的 `panel-filter` 或 `filter-toolbar`，查询项宽度用 `query-item--w140`、`query-item--w160`、`query-item--w180`、`query-item--w200`、`query-item--w220`。
- 新增按钮使用 `manage-add-btn`，其他工具按钮使用 `manage-toolbar-btn`。
- 表格放进 `panel-table`，让现有 mixin 负责表头 50px、表头字号 14px、单元格字号 12px 和深色表头 `#101d38`。
- 页面级样式只写该页特有的结构。筛选高度、圆角、输入框底色和按钮色已经在 `platform-manage-shell.scss` 中，不要在页面里再写一遍。

弹窗：

- 根节点加上 `platform-form-dialog`。宽度选择已有修饰类：默认 920、`platform-form-dialog--md` 720、`--sm` 640、`--chart` 600、`--split` 400。
- 标签宽度继续用样式表里的 `--platform-form-label-width`。不要在 `el-dialog` 上写 `width="920px"`，也不要在 `el-form` 上写 `label-width="140px"`。

确认框沿用 `platform-message-box.scss` 的尺寸和深色底，不另设 `ElMessageBox` 的宽度属性。

总览地图上的 Leaflet 像素、运行时颜色和 `width: 100%` 按 px2rem 技能里的例外处理。图表字号用 `src/utils/chart/designPx.js` 的 `designPx()`。

## 完成前核对

- 页面仍在 `PlatformLayout` 内，没有新的顶栏或侧栏。
- 色值能在 `PlatformHeader.vue`、`platform-manage-shell.scss`、`platform-form-dialog.scss` 或 `platform-message-box.scss` 中找到。
- 布局尺寸写在 CSS 中，组件属性没有写出行内 px。
- 没有为顶栏增加按视口收起导航的媒体查询。
- 新注释是英文 ASCII。

## 常见错误

- 把飞书组件平台的浅灰工作台，或后台侧栏，套到平台页上。
- 为了“看起来完整”新写一套按钮色、圆角和弹窗宽。
- 在 Vue 2 页面上使用 `platform-form-dialog` 或 `#206aff`。
- 给总览页再套 `PlatformContentShell` 的卡片。
