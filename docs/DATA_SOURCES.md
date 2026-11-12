# 数据来源与口径

本项目保留真实样例与来源说明，演示数据是历史快照，不代表实时预警。

| 数据 | 位置 | 用途与边界 |
| --- | --- | --- |
| 赛事 DBS 风廓线、PPI 扫描 | `data/radar/` | 来自赛题样例；DBS 可分析高度、水平风速、风向、垂直风及缺测；PPI 为径向风扫描，不能直接称为完整水平风场。文件未给出真实经纬度时不落到虚构站点。 |
| ERA5 GRIB 样例 | `data/public/era5-levels-members.grib` | cfgrib 公开样例，支持气压层切片，温度保持 K；再分析资料不是雷达实测。 |
| GOES-16 ABI C13 NetCDF | `data/public/` | 卫星红外亮温样例，按质量标志筛选；不解释为近地气温。 |
| 公开 METAR 站点快照 | `data/public/map-observations/`、`frontend/src/data/metar-observations.json` | 39个公开站点，保留来源与观测时间；非本项目自有设备，不虚构设备在线率。 |
| GFS 多层风场 | `data/public/gfs-wind/`、`frontend/src/data/gfs-wind.json` | NOAA/NCEP 公开 u/v/HGT，4个气压层、3个时次；风场为模式资料，场景高度有视觉放大。 |

原始链接、下载时间及 SHA-256 见 `data/public/` 各目录 manifest、SOURCES 和 source-url 文件。`scripts/prepare_gfs_wind.py` 提供 GFS 数据准备过程。缺测值不按零值混入统计；用户阈值是交互分析条件，不代表行业安全标准。
