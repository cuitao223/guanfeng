# 公开样例来源与使用条件

核对日期：2026-11-02。原始文件合计 2,672,736 字节，约 2.55 MiB；下载单文件上限 4 MiB。文件保持原始字节，未重编码、未制造观测值。

## ERA5 GRIB1

- 提供方：ECMWF；样例分发：ECMWF 官方 cfgrib 项目。
- 原文件：https://raw.githubusercontent.com/ecmwf/cfgrib/master/era5-levels-members.grib
- 官方解码说明：https://github.com/ecmwf/cfgrib
- ERA5 官方资料与数据许可：https://cds.climate.copernicus.eu/datasets/reanalysis-era5-pressure-levels?tab=overview
- 当前官方数据目录标注 CC-BY-4.0：https://spdx.org/licenses/CC-BY-4.0
- 分发仓库 Apache-2.0：https://github.com/ecmwf/cfgrib/blob/master/LICENSE ，原文保留在 LICENSE-cfgrib-Apache-2.0.txt。仓库代码许可与底层 ERA5 数据许可分别记录，不能互相替代。
- 建议署名：Contains Copernicus Climate Change Service information (2017). ERA5 sample distributed by ECMWF/cfgrib. Neither the European Commission nor ECMWF is responsible for its use.
- 原始时间：2017-01-01 00:00、12:00，2017-01-02 00:00、12:00 UTC；集合成员 0..9；850/500 hPa；t 和 z。
- 原网格：61 纬度×120 经度，3°间距，纬度北到南、经度 0..357°。适配器默认展示首时次、成员 0、850 hPa 的 t，允许选择 z。
- 大小：2,361,600 字节。
- SHA-256：`c144fde61ca5d53702bf6f212775ef2cc783bdd66b6865160bf597c1b35ed898`。

## GOES-16 卫星 NetCDF4

- 提供方：NOAA/NESDIS；平台与产品：GOES-16 ABI L2 Cloud and Moisture Imagery，Mesoscale 1，C13，2 km at nadir。
- NOAA NODD 官方公开目录及使用条件：https://registry.opendata.aws/noaa-goes/
- 原文件：https://noaa-goes16.s3.amazonaws.com/ABI-L2-CMIPM/2024/001/00/OR_ABI-L2-CMIPM1-M6C13_G16_s20240010000281_e20240010000350_c20240010000422.nc
- 官方 NODD 目录说明：数据公开且可按需求使用；请求署名，不得暗示 NOAA 认可、隶属或背书。通过匿名 HTTPS 成功取得原文件。
- 原文件 license 属性包含旧的 access restriction 文案，与当前 NOAA NODD 公开分发说明不一致。manifest 原样保留该属性并解释此差异，没有删除或改写原文件属性；此处使用条件依据官方公开目录。
- 建议署名：NOAA/NESDIS GOES-16 ABI L2 Cloud and Moisture Imagery, accessed 2026-11-02 via NOAA NODD on AWS.
- 原始时间：2024-01-01T00:00:28.1Z 至 2024-01-01T00:00:35.0Z。
- 地理外包范围约：西经 81.8524°..68.1476°，北纬 32.27377°..45.725967°；以文件 geospatial_lat_lon_extent 属性为准。
- 原生网格：500×500，投影固定网格扫描角 rad；适配器返回每四点取一的 125×125 CMI 亮温 K，执行 DQF==0 质量控制。
- 大小：311,136 字节。
- SHA-256：`12f713d3740f70ae1d6474a3d46a8215993f8a44c59b9c20a95b9cad98bc49f7`。

## 解释边界

上述数据是不同时间和区域的公开历史样例，用于验证真实解码与独立展示。未与主办方雷达做同步、重网格、融合或精度验证，不得声称提高测量精度。GOES 红外亮温不能解释成近地空气温度；ERA5 气压层再分析不是地面实测。

下载记录、精确范围、单位、SHA-256、署名和许可 URL 见 manifest.json；下载与校验脚本见 ../../adapters/fetch_public_data.py。原文件在正式运行时离线读取。

## 地图演示：公开METAR观测快照（2026-11-12新增）

来源：NOAA Aviation Weather Center，公开压缩CSV：`https://aviationweather.gov/data/cache/metars.cache.csv.gz`。原始文件保存到 `map-observations/metars.cache.csv.gz`，下载时间、SHA-256和观测时间范围保存到同目录 `manifest.json`。源文件包含全球观测；筛选中国大陆ICAO区域前缀ZB/ZG/ZH/ZJ/ZL/ZP/ZS/ZU/ZW/ZY，并按站号保留最新报文，共39站。城市名是界面别名，站号、经纬度、温度、时间和原始METAR来自源文件；不将这些站点称为项目自有设备。

时间：UTC 2026-11-11 16:00–16:30，即北京时间2026-11-12 00:00–00:30。风速由源字段节转换为m/s：kt×1852÷3600。风向为来向；箭头指向下风向；VRB保留为不定风向，未补造方向或缺测数值。该快照不自动更新，不能作为实时天气或预报展示。坐标原值保留WGS84；显示到高德地图时转换为GCJ02，Esri使用原坐标。转换公式参考wandergis/coordtransform，MIT许可原文保留在 `frontend/src/utils/maps/coordtransform-LICENSE.txt`。

复核命令：`python guanfeng/tests/browser/verify_map_observations.py`（从T2运行）。脚本逐站对照原始CSV的坐标、温度、风速、时次和报文。原始数据仅作为公开样例保留，使用时保留来源及时间；不主张独占数据权利，不将地图展示用作业务预警。
