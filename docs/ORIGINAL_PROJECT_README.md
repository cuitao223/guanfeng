> 提交包说明（2026-11-12）：本文保留原工程开发记录，部分路径、端口及旧打包文件属于历史环境。本提交包的运行方法以根目录 readme.md 为准，本次独立验证以 evidence/submission/REPORT.md 为准。

# 观风——气象应用生成AI平台及组件库

当前作品在主办方Harness工程上扩展。用户最终选择Java17 + Spring Boot开发业务与智能体，Vue3沿用现有前端，Python仅承担GRIB/NetCDF解码；普通电脑CPU运行，现成DeepSeek API负责需求及源码生成。

作品入口为 `/workbench`，实际后端在 `backend/`，默认仅监听本机 `127.0.0.1:18080`。启动方法见 [运行指南](docs/STARTUP_GUIDE.md)，交付说明见 [文档入口](docs/README.md)。完整实施与实时状态以工作区父目录的赛题2_Goal提示词、需求矩阵、TASKS、PROJECT_STATE为准。

新增Skill为 [.harness/backend/skills/guanfeng-generate/SKILL.md](.harness/backend/skills/guanfeng-generate/SKILL.md)，产品Java编排会实际读取它并保存加载时间及SHA256。组件职责、复用与新增范围见 [组件与Skill说明](docs/SKILLS_COMPONENTS.md)，来源与数据边界见 [数据来源](docs/DATA_SOURCES.md)。

主流程：选真实观测数据与范围→分析/图表/导出；文字需求→规划→并行生成Vue与API模块→实际构建校验→最多两轮修复→本机构建部署→访问/停止/源码导出。原始DBS/PPI不含坐标，PPI仅为径向风，公开卫星与雷达分别展示；不输出飞行安全或预报结论。

API Key只从外部文件运行时读取，不提交、不回显、不打包。原始资料及旧失败证据保留；本地部署不等于公网或云端部署。以下保留原工程说明，参考后端与合成samples的描述仅针对原Harness示例。

---
# 应用开发工程

本目录包含可运行的前端代码和一个可运行的后端参考实现，以及供开发使用的规则、技能和组件。

三份说明的分工如下：

- 本文件说明如何启动工程、代码应写在哪里，以及如何配合 AI 编码工具使用。
- `project.md` 说明目录结构，以及各类文件的作用。
- `AGENTS.md` 是 AI 编码工具的开发入口。使用 Cursor、Codex 等工具打开本目录时，请先让它阅读该文件，再按其中列出的规则和技能修改代码。

## 目录组成

- `frontend/`：可运行的 Vue 3 前端。
- `backend/`：后端业务代码。
- `.harness/`：规则、技能、示例、绘图组件、地图组件、页面模板和后端参考实现。可以阅读，也可以继续补充技能和组件。

## 启动前端

需要 Node.js 20 或更新版本。在 `frontend/` 目录安装依赖并启动：

```text
npm install
npm run dev
```

生产环境构建使用 `npm run build:prod`。环境文件只保留变量名，不要把真实主机、令牌或账号写进代码和说明。

## 启动后端参考实现

后端参考实现是 Java 17 加 Spring Boot 3.2 加 Maven。它只是示例，不是指定技术栈；其他语言按 `.harness/backend/references/series-api-contract.md` 实现同一套接口。

```text
cd .harness/backend/code/leice-radar-series-service
mvn spring-boot:run
```

默认数据目录是 `samples`，端口 `8080`。用 `RADAR_DATA_DIR` 和 `RADAR_DEMO_PORT` 覆盖。接口说明见该类目下的 `SKILL.md`，请求示例见 `.harness/backend/examples/request-examples.md`。样例测量文件是合成的，不含真实设备和站点数据。

## 代码写在哪里

- 页面、接口和文案写在 `frontend/src/`。新页面可参照 `frontend/src/views/sample/index.vue`。
- 后端业务代码写在 `backend/`。规则和技能读 `.harness/backend/`。
- 新的规则、技能和组件写在 `.harness/` 的对应目录。前端技能可参照 `.harness/frontend/skills/` 中已有的 `SKILL.md`，绘图或地图组件可参照 `.harness/frontend/widgets/` 中已有组件，后端技能可参照 `.harness/backend/skills/`。

各目录和文件的具体作用见 `project.md`。

## 交给 AI 编码工具

使用 Cursor、Codex 等主流 AI 编码工具打开本目录。请先让它阅读 `AGENTS.md`，再按其中的规则和技能修改代码。目录和文件的作用以 `project.md` 为准。

下面是一段示范。可以直接发给 AI，再补充具体题目：

```text
请先阅读 AGENTS.md 和 project.md。
我要新增一个页面，用已有绘图组件显示一条高度廓线。
先根据技能选定组件，再把页面写到 frontend/src/views，文案写到 frontend/src/lang。
不要把真实主机、令牌或账号写进代码和说明。
```

后端题目的示范：

```text
请先阅读 AGENTS.md 和 project.md。
我要给前端补一个接口，把测量文件整理成绘图组件能用的数组。
先读 .harness/backend 的规则和技能，判断现有后端工程的技术栈，再改契约、写代码和测试。
文档用中文，源码注释用英文。最后同步 AGENTS.md、project.md 和 README.md。
```

## 组件技能开发流程建议

下面是开发相关组件技能时的一种参考，可按题目自行调整。

可以先阅读 `.harness/` 中已有的组件技能，再按相近的方式补充自己的技能。技能说明写清组件的使用场景和页面接入方式，并与组件放在同一目录。页面实际引用的组件放在 `frontend/src/`。

后端组件的顺序建议：

1. 在 `.harness/backend/skills/` 里写清什么时候用、技术栈怎么判断，入口是 `SKILL.md`。
2. 在 `.harness/backend/references/` 里先定接口契约，字段与前端组件入参对齐。
3. 代码放 `.harness/backend/code/<组件名>/`，只作为一种参考实现，其他语言按契约实现。
4. 样例数据和请求示例分别放组件目录的 `samples/` 和 `.harness/backend/examples/`。
5. 同步根目录 `AGENTS.md`、`project.md`、`README.md`。

