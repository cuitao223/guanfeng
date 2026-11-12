# AI 开发入口

本文件写给 AI 编码工具。人阅读 `README.md` 和 `project.md`。

本目录是一套可运行的 Vue 3 前端和一个可运行的后端参考实现，加上规则、技能、组件和页面模板。业务页面写在 `frontend/src/`，后端业务代码写在 `backend/`。在 `frontend/` 执行 `npm run dev`。

`.harness/` 存放开发规范、技能、示例、可视化组件、页面模板和后端参考实现。可以阅读，也可以在对应目录里新增或修改规则、技能和组件。这里没有可部署的前端工程，前端在 `frontend/`。

目录结构见 `project.md`。改前端代码之前先读：

1. 本文件和 `project.md`。
2. `.harness/frontend/rules/frontend-common.mdc`
3. `.harness/frontend/rules/vue3-microservice.mdc`
4. `.harness/frontend/skills/vue3-development/SKILL.md`

这些剖面规则的 `alwaysApply` 保持关闭。改平台时仍然要按上面的顺序阅读。接口再读 `.harness/frontend/rules/vue3-request.mdc`。按钮、表单、表格、弹窗、分页和布局先读 `.harness/frontend/skills/leice-ui-packages/SKILL.md`。样式、国际化、绘图组件和地图只在对应技能点名时再打开。页面需要地图时先读 `.harness/frontend/skills/leice-map-packages/SKILL.md`。

改后端代码之前先读：

1. 本文件和 `project.md`。
2. `.harness/backend/rules/backend-common.mdc`
3. `.harness/backend/skills/backend-project-analysis/SKILL.md`
4. `.harness/backend/skills/backend-feature-development/SKILL.md`

接口再读 `.harness/backend/rules/backend-response.mdc` 和 `.harness/backend/rules/backend-api.mdc`。接雷达数据时读 `.harness/backend/references/series-api-contract.md` 和 `.harness/backend/code/leice-radar-series-service/SKILL.md`。只有工程确实是 Java 加 Spring 时才读 `.harness/backend/rules/backend-java-spring.mdc`。

后端的接口契约与语言无关。`.harness/backend/code/` 里的 Java 实现是示例，不是指定技术栈。不要因为示例是 Java 就给现有工程换语言，也不要凭示例新建后端工程。

页面模板在 `.harness/frontend/pages/`。测量文件到绘图接口的整理在 `.harness/data/skills/leice-radar-series/SKILL.md`。页面不解析测量文件。新增规则、技能或组件后，同步更新根目录的 `AGENTS.md`、`project.md` 和 `README.md`。UTF-8 和禁止真实环境数据这两条规则在 `.harness/frontend/rules/`，后端同样适用。

## 观风赛题2扩展索引

- 用户已明确选定Java17/SpringBoot智能体及业务后端；不要切回Python智能体。Python仅为科学文件适配器。
- 生成Skill：`.harness/backend/skills/guanfeng-generate/SKILL.md`，由产品运行时加载并记录hash。
- Java业务组件与编排：`backend/src/main/java/com/leice/radar/demo/workbench/`、`generation/`。
- 工作台：`frontend/src/views/workbench/`；科学适配：`adapters/`；可信插件：`plugins/`。
- 真实测试及证据：`tests/data/`、`tests/integration/`、`tests/browser/`、`evidence/`；运行产物：`runtime/`。
- 文档：`docs/`；脚本：`scripts/`。完整要求及验收状态见父目录的Goal任务书和需求矩阵。
- 保留原始资料与有效产物；模型凭据只能读取外部文件，禁止进入源码、日志、截图及导出包。
## 真实地图接入（2026-11-12）

地图组件页、设备总览和其他模式使用 `frontend/src/components/RealMap/`，底图源集中在 `frontend/src/utils/maps/basemaps.js`：高德道路/卫星（含注记）、Esri 地形。支持平移缩放、底图切换、署名、加载错误和重试；需联网。二维视图默认中国区域。设备示例未提供真实坐标时不落点。三维页面保留高德与 Three.js，引导到中国区域；自带相对坐标风场样例保留分析、不随意定位到真实城市。浏览器实测证据见 `evidence/maps/`。

## 公开站点地图演示数据（2026-11-12）

二维和三维地图通过 `frontend/src/components/WeatherObservations/` 展示39个公开METAR站点快照，支持气温/风速切换、站点详情、原始报文和显隐。真实数据来源为NOAA Aviation Weather Center缓存；原始压缩文件和下载清单在 `data/public/map-observations/`，前端标准化数据在 `frontend/src/data/metar-observations.json`。观测时间为北京时间2026-11-12 00:00–00:30，页面明确标记非实时。高德显示使用WGS84转GCJ02，Esri底图保留WGS84；原始坐标不变。站点并非自有雷达，未伪造设备上线状态、风场网格或预警。浏览器验收见 `tests/browser/verify_map_observations.py` 和 `evidence/maps/observations/`。


## 双平台产品入口（2026-11-12）

业务入口 `/` → 独立登录 → 创作工作台 `/cloud` 或监测工作台 `/operations`。账号与使用见 `docs/PORTAL_GUIDE.md`，验收见 `evidence/portals/REPORT.md`。

- 前端页面：`frontend/src/views/portal/`、`portal-login/`、`cloud-home/`、`operations/`、`operations-analysis/`、`operations-scene/`；平台布局 `frontend/src/layout/PlatformLayout/`。
- 会话：`frontend/src/store/modules/portal.js`、`frontend/src/api/portal/index.js`；路由守卫 `frontend/src/permission.js`。
- 后端身份：`backend/src/main/java/com/leice/radar/demo/auth/`；`runtime/auth/`存储账号哈希，不回显或进入交付包。旧API授权边界见使用指南。
- 主导航只显示业务，原模板源码保留，开发参考路由 `/developer/*` 不作用户入口。


## 真实三维风场（2026-11-12）

监测导航新增 `/operations/wind`，原站点三维态势继续保留。页面 `frontend/src/views/operations-wind/` 使用NOAA/NCEP GFS真实公开u/v/HGT，四气压层、三时次、33×33网格；原始GRIB和来源哈希在 `data/public/gfs-wind/`，准备脚本 `scripts/prepare_gfs_wind.py`，标准化数据 `frontend/src/data/gfs-wind.json`。

Harness三维图层新增可选 `pointGrid`、`displayCorners`、`displayCoordinates`、风羽`sizeScale`，默认行为兼容旧页。实现与科学边界见 `docs/REAL_WIND_SCENE.md`；实测 `tests/browser/verify_wind_scene.py`、`evidence/wind-scene/`。模式分析/预报不称雷达实测，高度按层平均位势高度铺平并明确视觉放大。


## 页面与工具入口恢复（2026-11-12）

创作平台增加“流程编排”“组件资源”，监测平台增加“专题工具”。入口中心 `frontend/src/views/resource-center/`，清单 `frontend/src/utils/resourceEntries.js`；11类原页面通过带来源横幅的ReferencePage恢复。保留各自登录和工作台。

真实GFS风场新增廓线、频数、阈值检查、标尺、色标、标注、全屏和格点标记。型号和列表开发示例的原接口未接入，referenceMode不请求接口或假保存。完整映射与边界见 `docs/RESTORED_ENTRIES.md`；实测 `tests/browser/verify_restored_entries.py`，证据 `evidence/restored-entries/`。


## 模型API兼容接入（2026-11-12）

模型接入说明见 `docs/MODEL_API.md`，客户端支持 `GUANFENG_MODEL_ENDPOINT`、`GUANFENG_KEY_FILE`、`GUANFENG_MODEL` 配置兼容Chat Completions服务。默认DeepSeek保留；其他厂商须独立联调，不称已全部验收。本地协议与生成回归40项通过，证据在 `evidence/model-api/`。本轮未重启现有服务，配置在下一次启动时读取。
