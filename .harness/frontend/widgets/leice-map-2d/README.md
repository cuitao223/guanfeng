# 二维地图

Leaflet 底图和气象图层。状态是 `approved`。页面从 `.harness/frontend/widgets/leice-map-2d` 引用。

页面在 `frontend/` 安装 `leaflet` 后，引入 `leaflet/dist/leaflet.css`。依赖写入 `frontend/package.json`。组件放在 `LeiceMap2d` 内部。同一时刻只挂风羽、箭头、粒子中的一种。

固定数据检查：

```text
node .harness/frontend/widgets/leice-map-2d/scripts/map-2d.test.mjs
```

在仓库根目录执行。通过时打印 `map-2d checks passed`。
