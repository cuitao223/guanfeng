---
name: device-model
description: 设备型号列表模板。按型号查询，维护型号、重量、备注、类型、颜色和探测能力阈值。使用前先读本技能。
---

# 设备型号

状态是 `approved`，版本 `0.1.0`。不依赖绘图或地图。

## 页面

- 筛选：型号 `name`。查询权限 `system:model:query`。
- 新增按钮权限 `system:model:add`。
- 表格列：序号、型号、重量、备注、类型、颜色、N1、OB1、N2、OB2、操作。
- 编辑权限 `system:model:edit`，删除权限 `system:model:remove`。
- 分页字段 `pageNum`、`pageSize`，读取 `res.rows` 和 `res.total`。
- 弹窗使用 `platform-form-dialog--md`。型号必填，长度 2 到 20。N1、N2 为空或整数。OB1、OB2 为空或数字。空字符串提交前改为 `null`。

文案键在 `deviceModel`。接口文件放到 `src/api/manage/deviceModel.js`。

| 动作 | 方法 | 路径 |
| --- | --- | --- |
| 列表 | GET | `/system/model/list` |
| 详情 | GET | `/system/model/{modelId}`，读取 `res.data` |
| 新增 | POST | `/system/model` |
| 修改 | PUT | `/system/model`，请求体带 `modelId` |
| 删除 | DELETE | `/system/model/{modelId}` |

全量列表 `GET /system/model/getList` 由故障类型和设备台账使用，型号页自己的列表不调用它。历史导出接口这个页面没有调用。

## 使用

1. 把 `index.vue` 接到平台路由。
2. 把 `api.js` 放到 `src/api/manage/deviceModel.js`。
3. 在中英文语言包注册 `deviceModel`。
4. 列表、查询、弹窗对照 `src/views/sample/index.vue`。
