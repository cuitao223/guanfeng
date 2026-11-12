---
name: leice-ui-packages
description: 选择按钮、表单、弹窗、表格、筛选、分页和布局容器。做通用交互时先读本技能。绘图和地图不在这里选型。
---

# UI 基础组件

本技能只解决通用交互和视觉一致。行业可视化另读 `.harness/frontend/skills/leice-chart-packages/SKILL.md` 或 `.harness/frontend/skills/leice-map-packages/SKILL.md`。一次只处理当前页用到的控件。

优先复用 Element Plus。只有本平台已经存在的壳和类名才算特有封装。不要为按钮、表格、弹窗或分页再写一套组件。

视觉数值见 `.harness/frontend/rules/vue3-platform-style.mdc` 和技能 `vue3-platform-style`。尺寸见 `.harness/frontend/rules/px2rem.mdc`。新页面参照 `src/views/sample/index.vue`。

## 选型

| 需求 | 使用 | 不要 |
| --- | --- | --- |
| 布局容器 | `PlatformLayout`。普通业务页留在内容区。`/overview`、`meta.fullBleed` 不套白卡片 | 新顶栏、新侧栏、另做布局组件 |
| 筛选 | `el-form` 行内表单。查询项用 `query-item--w140` 至 `query-item--w220`。已有列表壳时用 `panel-filter` 或 `filter-toolbar` | 用行内 `width` 写查询项宽度 |
| 按钮 | `el-button`。新增用 `manage-add-btn`，其他工具按钮用 `manage-toolbar-btn`。动作按钮加 `v-hasPermi` | 自绘按钮组件 |
| 表单 | `el-form` 与 `el-form-item`。校验文案用 `this.$t`，放在 `computed`。标签宽用已有 CSS 变量 | `label-width="140px"`，以及第二套表单组件 |
| 表格 | `el-table`。已有列表壳时放进 `panel-table` | 自绘表格 |
| 分页 | `el-pagination`。`pageNum`、`pageSize`、`total` 与列表接口一致 | 再封装一套分页 |
| 弹窗 | `el-dialog` 配 `v-model`，加上 `platform-form-dialog`。宽度只用已有修饰类：默认 920、`--md` 720、`--sm` 640、`--chart` 600、`--split` 400 | `width="920px"` |
| 确认框 | `ElMessageBox`。沿用 `platform-message-box` 的尺寸，不另设宽度 | 自绘确认框 |

筛选、表格和弹窗的色值、字号、圆角已经在平台样式里。页面只写该页特有的结构。

## 读取顺序

1. 用上表确定控件。
2. 打开 `src/views/sample/index.vue`，沿用它的 Element Plus 写法和类名。
3. 需要色值和壳层时再读技能 `vue3-platform-style`。
4. 需要换算尺寸时再读技能 `px2rem`。

未出现在上表中的通用控件，先在 Element Plus 里找已有组件。找不到，并且现有页面也没有同类封装时，再问是否需要公司特有组件。不要提前新建。
