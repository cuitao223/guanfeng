# 生成应用运行契约

用户提交自然语言需求后，产品内规划、组件、界面、组装与修复角色通过兼容 Chat Completions 的模型服务生成源码。成功任务必须经过代码校验、实际构建、工作流检查与浏览器运行门禁。生成应用包含 Vue 源码、受限业务 API 模块、工作流 JSON 和可重建的 package.json。

模型配置见 [模型接入说明](../docs/MODEL_API.md)。默认凭据路径为当前项目 `config/model-api.key`，可通过 `GUANFENG_KEY_FILE` 指向外部文件；仓库不包含凭据或历史生成任务。

部署在本机启动应用进程，成功后返回实际访问 URL。动态分析通过后端接口执行，导出提供应用源码。生成结果保存在被 Git 忽略的 `runtime/generation/`。
