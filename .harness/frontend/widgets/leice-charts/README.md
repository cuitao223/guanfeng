# 读取说明

本目录汇总当前已实现的绘图组件。脚手架从 [SKILL.md](SKILL.md) 选型，再进入对应子目录。

```text
leice-charts/
  SKILL.md
  references/catalog.md
  profile/
  barb-thi/
  thi/
  scan/
```

每个组件目录是一套完整 Skill：

- `SKILL.md`：适用场景和业务规则
- `references/data.md`：数据契约
- `assets/src/`：组件源码
- `README.md`：安装、构建和示例

本目录没有 `package.json`。安装依赖、类型检查和示例都进入 `profile/`、`barb-thi/`、`thi/` 或 `scan/` 后，按该目录的 `README.md` 执行。
