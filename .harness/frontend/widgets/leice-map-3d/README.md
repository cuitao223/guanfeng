# 三维地图

离线高德底图和气象图层。状态是 `approved`。页面从 `.harness/frontend/widgets/leice-map-3d` 引用。

页面加载离线高德脚本，并在 `frontend/` 安装 `three`。依赖写入 `frontend/package.json`。图层放在 `LeiceMap3d` 内部。瓦片地址由页面传入。

固定数据检查：

```text
node .harness/frontend/widgets/leice-map-3d/scripts/map-3d.test.mjs
```

在仓库根目录执行。通过时打印 `map-3d checks passed`。
