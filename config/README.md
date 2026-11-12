# 模型配置

自行创建 `model-api.key`，写入自己的模型 API token（UTF-8、单行、无引号）。提交包不含密钥；请勿将此文件提交或发给他人。

通过环境变量 `GUANFENG_KEY_FILE` 可指定外部凭据文件；`GUANFENG_MODEL_ENDPOINT` 为完整兼容 Chat Completions URL；`GUANFENG_MODEL` 为模型名称。启动脚本读取当前目录，未配置时不会读取原工程的凭据。

默认服务为 DeepSeek；兼容协议的其他服务可按根目录 readme.md 配置。无需训练模型或 GPU。
