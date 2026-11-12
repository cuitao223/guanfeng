# 公开气象数据适配器

实现范围：独立 Python stdin/stdout 子进程，供 Java WorkbenchService 调用。Java 的 HTTP 响应信封、鉴权和雷达 CSV 解析由主工程承担。本适配器离线读取已校验的公开 GRIB1 与卫星 NetCDF4，不调用模型、不读取 key，不在请求中接收文件路径。

## 安装与调用

从 `guanfeng/` 执行（PowerShell）：

```powershell
python -m pip install -r adapters/requirements-data.txt
'{"op":"list"}' | python -B adapters/worker.py
'{"op":"read","id":"era5-temperature"}' | python -B adapters/worker.py
'{"op":"read","id":"era5-temperature","variable":"z"}' | python -B adapters/worker.py
'{"op":"read","id":"goes16-c13"}' | python -B adapters/worker.py
python -B tests/data/run_checks.py
```

`requirements-data.txt` 记录本机已验证版本。ecCodes 的 Windows wheel 已包含可工作的原生库；其他平台安装后应运行真实解码测试确认原生库可用。测试使用 jsonschema；运行协议本身无需 jsonschema。

每个进程只接受一个完整 JSON，请写完 stdin 后关闭输入流，再读取 stdout 并等待退出。stdout 只含一行 JSON。最大输入 16 KiB；成功 exit=0，失败返回 `{"error":"..."}` 且 exit=1。不支持一个进程内多次请求。

- `list`：只接受 `{op:"list"}`，返回 `{datasets:[metadata...]}`，同时检查所有文件的大小和 SHA-256。
- `read`：接受 `{op:"read",id:"...",variable?:"..."}`，返回 `{dataset,grid,summary}`。
- 数据 ID 固定为 `era5-temperature`、`goes16-c13`。未知 ID、未知变量、任意额外字段（包括 path）均拒绝。
- 读取不依赖当前工作目录；Java 可用 `ProcessBuilder(pythonExecutable, absoluteWorkerPath)`，无需联网。Java 应检查退出码并解析 JSON，不把失败当作空数据。

## 支持范围与科学含义

| ID | 文件与变量 | 默认切片 | 返回坐标与尺寸 |
| --- | --- | --- | --- |
| era5-temperature | ECMWF cfgrib 仓库提供的真实 ERA5 GRIB1；t=气温 K、z=位势 m²/s² | 2017-01-01 00:00 UTC，集合成员 0，850 hPa | 经度 0..357°、纬度 90..-90°，原网格 61×120，全量返回 |
| goes16-c13 | NOAA GOES-16 ABI L2 CMIPM1 C13；CMI=红外亮温 K | 2024-01-01 00:00:28.1..00:00:35 UTC | GOES 固定网格扫描角 x/y，单位 rad；原始 500×500，每四点取一返回 125×125 |

GOES 返回 geostationary CF 投影参数；扫描角不能直接当经纬度。地理范围记录于 dataset.spatial，供标注覆盖区域，不以边界线性插值伪造逐点经纬度。卫星亮温不能解释为近地气温。ERA5 是再分析资料，850 hPa 温度/位势不能解释为地表雷达实测风。时间、区域与主办方雷达不一致，两个网格独立展示；`fusionPerformed=false`。

所有网格 `values[yIndex][xIndex]`；长度分别与 `y`、`x` 一致。原始单位放 `unit`，不暗中换成摄氏度。`sampling` 明确原始/返回形状、抽点步长和未插值状态。一般上限为每边 128 点；当前仅卫星做抽点。统计仅针对返回网格，`statisticsScope=returned-grid`。

时间展示字段 `timeStart/timeEnd` 转为 Asia/Shanghai 本地时间，格式 `YYYY-MM-DD HH:mm:ss`。`sourceTimeStart/sourceTimeEnd` 和切片 `timeUTC` 保留原始 UTC 信息；不把 UTC 冒充本地时间。

NetCDF 使用真实 CF scale/offset、填充值解码；卫星仅保留 `DQF==0` 的好像元，其他质量标记视作缺测。非有限值、原始填充掩码及后端规定的 999/≤-999 哨兵统一输出为 `999`，有效 0 保留；统计在编码前按缺测掩码排除。全缺测时 min/max/mean 为 JSON null，计数仍正确，不输出 NaN/Infinity。

仅支持 manifest 中已校验的两个文件及上述固定切片/变量，未实现任意文件上传、其他 GRIB 消息类型、任意 NetCDF 维度、时空重网格或资料融合。其他层次/时次列入元数据供追溯，当前读接口不接受自选时间/层次。

## 来源、下载和完整性

`data/public/manifest.json` 保存每个文件的来源 URL、官方说明、原始 UTC 范围、本地显示时间、空间范围、变量/单位、字节数、SHA-256、许可和下载/校验时间。`data/public/SOURCES.md` 补充许可解释，Apache 原文单独保存。

可选恢复命令：`python -B adapters/fetch_public_data.py`。已存在文件通过固定散列后直接复用，不重复下载；缺失文件经匿名 HTTPS 获取，单文件硬限 4 MiB。散列变化或已有文件损坏直接失败，不覆盖已有数据。下载仅用于准备数据，运行时无需网络。不自动升级样例、不自动接收上游替换文件。

路径先校验文件名与真实解析路径；拒绝目录越界、符号链接及 Windows junction。读取前重新验证大小和散列。cfgrib 设置 `indexpath=""`，不在共享数据目录生成索引。

## 验证与证据

`tests/data/run_checks.py` 同时运行真实解码、CLI 和 JSON Schema 验证，在 `tests/data/` 写 UTF-8 的 `test-results.txt` 与机器可读 `validation-report.json`。响应 Schema 为 `adapters/read-response.schema.json`；另外校验二维形状和统计计数，因为 JSON Schema 不能直接表达数组间的长度相等。

真实 GRIB 网格与 ecCodes 直接读取的 7320 个数逐点比较；NetCDF 使用 netCDF4 读原始打包整数并按文件的 scale_factor/add_offset 还原，与返回值逐点比较。测试覆盖未知 ID/变量、路径字段和 manifest 越界、错误 JSON、超大输入、文件缺失、散列篡改、符号链接/junction 拒绝，以及 0/999/NaN/Infinity/全缺测。

两个已下载原始默认切片都没有缺测。缺测集成测试复制真实卫星文件，在测试目录内明确注入填充值、DQF=3 和 DQF=1，再重算该测试副本散列；断言 3 个像元被排除。此副本仅为故障注入测试，随测试结束清理，绝不进入公开样例目录或冒充原始数据。

本报告只验收 Python 数据层。Java 调用、工作流编排和前端图表由主代理完成集成验收。
