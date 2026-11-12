# 模型 API 配置

观风通过**兼容 Chat Completions 的接口**统一配置模型服务，可面向 **Kimi、GLM、Qwen、DeepSeek、GPT、Claude** 等模型扩展。使用服务商的兼容接口或相应网关，统一填写端点、模型名称与凭据文件；原生采用其他请求与响应协议的接口需要适配。

默认配置为 **DeepSeek / `deepseek-flash`**。真实生成需自行配置凭据，仓库不包含 key。生成内容仍须满足项目源码 JSON 契约，并经过后续代码校验、构建与运行检查。

## 仓库配置方式

以下命令在仓库根目录的 PowerShell 中执行。启动默认无 key，不访问原工程的凭据文件；默认凭据位置仅为当前包的 **`config/model-api.key`**，请自行创建并以 UTF-8 保存单个 token。不要将凭据内容写入源码、日志、截图或导出包。

项目**不使用 dotenv，不自动加载 `.env`**。环境变量需由同一窗口传给启动进程：

```powershell
$env:GUANFENG_KEY_FILE = Join-Path (Get-Location) 'config\model-api.key'
$env:GUANFENG_MODEL_ENDPOINT = 'https://api.deepseek.com/chat/completions'
$env:GUANFENG_MODEL = 'deepseek-flash'
.\scripts\start.ps1
```

切换模型时，按所选服务的说明修改端点和模型名称。服务运行期间修改环境变量不会自动生效，请先执行 `scripts/stop.ps1`，再从配置所在窗口执行 `scripts/start.ps1`。

## 参数说明

| 参数 | 默认及作用 |
| --- | --- |
| `GUANFENG_KEY_FILE` | 启动脚本默认使用当前包的 `config/model-api.key`；也可指定自己管理的外部文件。`start.ps1 -KeyFile` 显式参数优先。 |
| `GUANFENG_MODEL_ENDPOINT` | 默认 `https://api.deepseek.com/chat/completions`。填写完整地址，路径以 `/chat/completions` 结尾，可包含 `/v1` 等前缀，不自动补齐。 |
| `GUANFENG_MODEL` | 默认 `deepseek-flash`。可使用带斜杠的名称，如 `provider/model-v1`；具体名称以服务提供方为准，生成请求也可指定模型覆盖。 |
| `GUANFENG_MODEL_RESPONSE_FORMAT` | 默认发送 `response_format: {"type":"json_object"}`。兼容服务不支持该字段时设为 `false`；返回内容仍须遵守源码 JSON 契约。 |
| `GUANFENG_THINKING` | 客户端仅对官方 DeepSeek HTTPS 默认端口识别此扩展，其他端点不发送。仓库 `start.ps1` 固定设置为 `false`。 |

凭据文件在请求时读取，移除 UTF-8 BOM 及首尾空白后，当前支持单个 16–512 字符的 `[A-Za-z0-9_-]` token。模型名支持 1–100 个 ASCII 字母、数字或 `._:/-` 字符。

远程端点须使用 HTTPS；本机仅允许 `localhost`、`127.0.0.1`、`[::1]` 的 HTTP。地址不接受用户名密码、查询参数或片段，客户端不自动跟随重定向。

## 请求与生成流程

客户端发送 UTF-8 JSON POST，使用 Bearer 凭据，包含 `model`、system / user 消息、`stream: false` 与 `max_tokens`，从 `choices[0].message.content` 读取结果。连接超时 15 秒，请求超时 150 秒；空内容、截断及不符合约定的响应会被拒绝。

规划角色返回应用标题、描述与工作流等 JSON，源码生成角色返回模块源码，汇总与修复角色返回完整 `app`、`api`、`workflow`。传输层之后继续执行 JSON 解析、受限源码检查、实际构建及工作流与浏览器门禁。

模型服务涉及外部网络与服务商额度，生成时间和可用性取决于实际服务。

## 启动

默认前端 http://127.0.0.1:5274/，后端 http://127.0.0.1:18180/。先执行 `scripts/setup.ps1` 安装构建，再执行 `scripts/start.ps1`。没有配置模型凭据时仍可登录、查看地图与使用已有数据分析；新建 AI 生成任务需配置自己的模型服务。
