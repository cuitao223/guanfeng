# 项目地图

前端在 `frontend/`，后端业务代码在 `backend/`，规则、技能、组件和页面模板在 `.harness/`。在 `frontend/` 执行 `npm run dev`，生产构建是 `npm run build:prod`。

新页面参照 `frontend/src/views/sample/index.vue`，使用选项式 API。环境文件只保留变量名和接口前缀 `/dev-api`。

## 目录

```text
.
├── AGENTS.md                         给 AI 编码工具读的开发入口
├── project.md                        目录地图
├── README.md                         使用说明
├── frontend/                         可运行的 Vue 3 前端
│   ├── index.html                    页面入口
│   ├── package.json                  依赖和脚本
│   ├── package-lock.json             依赖锁定
│   ├── vite.config.js                开发服务器、别名和样式转换
│   ├── .env.development              开发环境变量名
│   ├── .env.production               生产环境变量名
│   ├── .env.staging                  预发环境变量名
│   ├── public/                       不经过打包的静态资源
│   └── src/
│       ├── api/                      接口
│       ├── assets/                   样式和字体
│       ├── components/               页面实际引入的界面组件
│       ├── directive/                权限指令
│       ├── lang/                     中英文文案
│       ├── layout/                   平台布局
│       ├── plugins/
│       ├── router/                   路由
│       ├── store/                    状态
│       ├── utils/
│       └── views/                    页面。示例列表在 sample
├── backend/                          后端业务代码
└── .harness/                         给开发和 AI 用的规范与可复用材料
    ├── frontend/
    │   ├── rules/                    平台规则，扩展名是 .mdc
    │   ├── skills/                   开发流程和选型技能，入口是 SKILL.md
    │   ├── examples/                 页面写法摘录
    │   ├── pages/                    业务页面模板
    │   └── widgets/
    │       ├── leice-charts/         绘图组件
    │       ├── leice-map-2d/         二维地图
    │       └── leice-map-3d/         三维气象地图
    ├── data/
    │   └── skills/leice-radar-series/  测量文件整理成绘图接口
    └── backend/                      后端规则、技能、契约和参考实现
        ├── rules/                    通用、响应、接口和 Java 参考写法
        ├── skills/                   工程判断和接口开发流程
        ├── references/               语言无关的接口契约
        ├── examples/                 curl 和前端调用示例
        └── code/
            └── leice-radar-series-service/  Java 参考实现
```

## 根目录文件

- `README.md`：使用说明。从这里看怎么启动、改哪里，以及怎么把本目录交给 AI。
- `project.md`：目录地图。说明每个目录和常见文件做什么。
- `AGENTS.md`：给 AI 编码工具读的开发入口。它列出改代码前要先读哪些规则和技能。

## `frontend/`

这是可运行的 Vue 3 工程。依赖写在 `frontend/package.json`。`vite.config.js` 把 `@` 指到 `frontend/src`，把绘图和地图组件指到 `.harness/frontend/widgets`。

- `index.html`：浏览器打开的页面入口。
- `.env.development`、`.env.production`、`.env.staging`：只放变量名和接口前缀。变量值不写进说明。
- `public/`：原样提供的静态文件，例如地图脚本和风场样例图。
- `src/api/`：页面调用的接口。
- `src/assets/`：全局样式和字体。
- `src/components/`：页面用 `import` 引入的界面组件。和页面绑在一起的工具条、色标、时间轴放在这里。
- `src/lang/`：界面上的中文和英文。用户能看见的文案放这里。
- `src/layout/`：带顶栏的平台布局。
- `src/router/`：地址和页面的对应关系。
- `src/store/`：跨页面保存的状态。
- `src/views/`：一个目录通常是一个页面。`sample` 是列表页写法示例。
- `src/directive/`、`src/plugins/`、`src/utils/`：权限指令、插件和通用方法。

## `.harness/`

`.harness` 不是第二套能运行的前端。它放规则、技能、示例数据、组件源码和页面模板。可以按现有目录继续补充。后端参考实现可以在本地启动验证，但它不是要部署的工程。

### 规则、技能和摘录

- `.harness/frontend/rules/*.mdc`：代码风格、接口、国际化、尺寸和基础界面规则。AI 按 `AGENTS.md` 的顺序阅读。
- `.harness/frontend/skills/<名称>/SKILL.md`：一项开发流程或选型说明。文件开头的 `name` 和 `description` 用来判断什么时候读它。
- `vue3-development`：新页面怎么写。
- `leice-ui-packages`：按钮、表单、表格、弹窗、分页和布局。
- `leice-chart-mapping`：业务图对应哪一个绘图组件。
- `leice-chart-packages`：已有绘图组件的入口。
- `leice-map-packages`：已有地图组件的入口。
- `.harness/frontend/examples/vue3-microservice.md`：页面写法摘录，配合 `vue3-development` 阅读。

### 绘图组件

每个绘图组件在 `.harness/frontend/widgets/leice-charts/<组件名>/`。

- `SKILL.md`：什么时候用这个组件、输入是什么、页面怎么接。先读汇总目录里的 `SKILL.md`，再只打开点名的这一个。
- `README.md`：这个组件的补充说明。
- `assets/src/`：组件源码。页面从这里引入，例如廓线、时高图和扫描图。
- `assets/examples/`：示例数据，用来看字段长什么样，也可以给页面做本地演示。
- `references/`：字段约定和行为差异。技能里点到时再打开。

和页面绑在一起的界面组件，例如时间轴、色标和图层面板，技能仍在 `leice-charts` 下。页面运行时引入的是 `frontend/src/components/` 里的那一份。

### 地图组件

`.harness/frontend/widgets/leice-map-2d` 是二维地图，`leice-map-3d` 是三维气象地图。

- 包入口 `SKILL.md`：先选图层，再只打开该图层自己的 `SKILL.md`。
- `assets/layers/`：底图和各类图层组件。
- `assets/logic/`：坐标、解码和绘制用的计算。
- `references/`：数据契约和行为差异。
- `scripts/`：检查地图固定数据的脚本。用法写在该包的 `README.md`。
- `README.md`：安装依赖和检查命令。依赖写入 `frontend/package.json`。

### 页面模板

每个模板在 `.harness/frontend/pages/<页面名>/`。现有模板是 `device-model`、`login-cloud`、`login-network`、`device-overview`、`wind-3d`、`other-mode`。

- `SKILL.md`：这一页保留哪些区域、用哪些组件。
- `index.vue`：页面模板。
- `api.js`：这一页用到的接口。
- 个别页面还带本地示例数据，例如 `other-mode/rhi-sample.json`。

可运行的页面在 `frontend/src/views/`。模板用来对照，不是另一套路由。

### 后端规则与参考实现

- `.harness/backend/rules/*.mdc`：通用约束、统一响应、接口约定和 Java 参考写法。`backend-java-spring.mdc` 只在工程确实是 Java 加 Spring 时使用。
- `.harness/backend/skills/backend-project-analysis/SKILL.md`：写代码前确认工程形态和技术栈。
- `.harness/backend/skills/backend-feature-development/SKILL.md`：新增或修改接口的流程。
- `.harness/backend/references/series-api-contract.md`：雷达序列接口契约，与语言无关。
- `.harness/backend/examples/request-examples.md`：curl 和前端调用示例。
- `.harness/backend/code/leice-radar-series-service/`：Java 17 加 Spring Boot 3.2 的参考实现，带样例文件和单元测试。Java 只是示例，其他语言按契约实现。
- 根目录 `backend/`：后端业务实现写在这里。

参考实现提供 DBS 风羽、垂直风、信噪比、温湿趋势、高度获取率，以及 PPI 扫描的径向风、信噪比、谱宽和谱强。样例测量文件是合成的。

### 测量文件和后端

- `.harness/data/skills/leice-radar-series/SKILL.md`：测量文件如何整理成绘图接口能用的字段。页面不解析测量文件。
- `.harness/backend/`：后端规则、技能、接口契约和参考实现。
- `backend/`：后端业务代码写在这里，不写进 `.harness`。

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
