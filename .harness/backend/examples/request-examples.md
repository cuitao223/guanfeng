# 请求示例

下面的地址只写到路径。网关、主机和端口由部署决定，示例用 `RADAR_BASE_URL` 占位，不要抄成真实环境。

## curl

```bash
# 水平风羽
curl -s "$RADAR_BASE_URL/radar/series/dbs/wind-profile?file=dbs-sample.csv"

# 垂直风
curl -s "$RADAR_BASE_URL/radar/series/dbs/vertical-wind?file=dbs-sample.csv"

# 信噪比
curl -s "$RADAR_BASE_URL/radar/series/dbs/snr?file=dbs-sample.csv"

# 温湿趋势
curl -s "$RADAR_BASE_URL/radar/series/dbs/temperature-humidity?file=dbs-sample.csv"

# 高度获取率
curl -s "$RADAR_BASE_URL/radar/series/dbs/height-obtain-rate?file=dbs-sample.csv"

# PPI 信噪比
curl -s "$RADAR_BASE_URL/radar/series/ppi/scan?file=ppi-sample.csv&product=snr"
```

需要中文文案时加 `X-Lang`。没有这个头时返回英文：

```bash
curl -s -H "X-Lang: Cn" "$RADAR_BASE_URL/radar/series/dbs/snr?file=dbs-sample.csv"
```

## 前端调用

接口文件放 `frontend/src/api/radar/series.js`，沿用平台的 `request`：

```js
import request from '@/utils/request'

export function getWindProfile(params) {
  return request({ url: '/radar/series/dbs/wind-profile', method: 'get', params })
}

export function getVerticalWind(params) {
  return request({ url: '/radar/series/dbs/vertical-wind', method: 'get', params })
}

export function getSnr(params) {
  return request({ url: '/radar/series/dbs/snr', method: 'get', params })
}

export function getTemperatureHumidity(params) {
  return request({ url: '/radar/series/dbs/temperature-humidity', method: 'get', params })
}

export function getHeightObtainRate(params) {
  return request({ url: '/radar/series/dbs/height-obtain-rate', method: 'get', params })
}

export function getScan(params) {
  return request({ url: '/radar/series/ppi/scan', method: 'get', params })
}
```

拦截器返回响应体，所以页面拿到的 `res.data` 是接口的 `data`：

```js
const res = await getWindProfile({ file: this.currentFile })
this.times = res.data.times
this.heightArr = res.data.heightArr
this.values = res.data.values
this.dirs = res.data.dirs
```

`barb-thi` 直接吃这四个数组，`unit` 传下去即可。缺测 `999` 由组件跳过，页面不要把它换成 `0` 或 `null`。

## 注意

- 时间已经是 `YYYY-MM-DD HH:mm:ss`，页面不要再转格式，也不要补 `Z`。
- 风向是来向，0° 在正上方。页面不要翻转。
- `file` 用平台的资料接口给出的相对路径，不要拼绝对路径。
- 错误响应仍是 HTTP `200`，`code` 非 `200` 时拦截器已经提示，页面不要再提示一次。
