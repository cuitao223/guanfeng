import axios from 'axios'
import { ElNotification , ElMessageBox, ElMessage, ElLoading } from 'element-plus'
import { getToken } from '@/utils/auth'
import errorCode from '@/utils/errorCode'
import { tansParams, blobValidate } from '@/utils/common'
import cache from '@/plugins/cache'
import { saveAs } from 'file-saver'
import useUserStore from '@/store/modules/user'
import i18n, { getLanguage } from '@/lang'

let downloadLoadingInstance
// Whether to show re-login dialog
export let isRelogin = { show: false }

function t(key, params) {
  return i18n.global.t(key, params)
}

axios.defaults.headers['Content-Type'] = 'application/json;charset=utf-8'
// Create axios instance
const service = axios.create({
  // axios baseURL option: shared API prefix
  baseURL: import.meta.env.VITE_APP_BASE_API,
  // timeout
  timeout: 30000
})

// request interceptor
service.interceptors.request.use(config => {
  // Whether token is required
  const isToken = (config.headers || {}).isToken === false
  // Whether to prevent duplicate submit
  const isRepeatSubmit = (config.headers || {}).repeatSubmit === false
  // Interval (ms); shorter means duplicate submit
  const interval = (config.headers || {}).interval || 1000
  // Backend returns localized msg by X-Lang (Cn | En)
  config.headers['X-Lang'] = getLanguage()
  if (getToken() && !isToken) {
    config.headers['Authorization'] = 'Bearer ' + getToken()
  }
  // Map GET params onto the URL
  if (config.method === 'get' && config.params) {
    let url = config.url + '?' + tansParams(config.params)
    url = url.slice(0, -1)
    config.params = {}
    config.url = url
  }
  if (!isRepeatSubmit && (config.method === 'post' || config.method === 'put')) {
    const requestObj = {
      url: config.url,
      data: typeof config.data === 'object' ? JSON.stringify(config.data) : config.data,
      time: new Date().getTime()
    }
    const requestSize = Object.keys(JSON.stringify(requestObj)).length
    const limitSize = 5 * 1024 * 1024
    if (requestSize >= limitSize) {
      console.warn(`[${config.url}]: ` + t('common.http.repeatSubmitSizeWarn'))
      return config
    }
    const sessionObj = cache.session.getJSON('sessionObj')
    if (sessionObj === undefined || sessionObj === null || sessionObj === '') {
      cache.session.setJSON('sessionObj', requestObj)
    } else {
      const s_url = sessionObj.url
      const s_data = sessionObj.data
      const s_time = sessionObj.time
      if (s_data === requestObj.data && requestObj.time - s_time < interval && s_url === requestObj.url) {
        const message = t('common.http.repeatSubmit')
        console.warn(`[${s_url}]: ` + message)
        return Promise.reject(new Error(message))
      } else {
        cache.session.setJSON('sessionObj', requestObj)
      }
    }
  }
  return config
}, error => {
    console.log(error)
    Promise.reject(error)
})

// response interceptor
service.interceptors.response.use(res => {
    const code = res.data.code || 200
    const msg = errorCode[code] || res.data.msg || errorCode['default']
    if (res.request.responseType ===  'blob' || res.request.responseType ===  'arraybuffer') {
      return res.data
    }
    if (res.config?.portalAuth) {
      if (code !== 200) throw Object.assign(new Error(res.data.msg || 'Authentication failed'), { code })
      return res.data
    }
    if (code === 401) {
      if (!isRelogin.show) {
        isRelogin.show = true
        ElMessageBox.confirm(
          t('common.http.sessionExpired'),
          '',
          {
            customClass: 'platform-msgbox',
            showClose: false,
            confirmButtonText: t('common.reLogin'),
            cancelButtonText: t('common.cancel'),
            type: 'warning'
          }
        ).then(() => {
          isRelogin.show = false
          useUserStore().logOut().then(() => {
            location.href = '/overview'
          })
      }).catch(() => {
        isRelogin.show = false
      })
    }
      return Promise.reject(t('common.http.invalidSession'))
    } else if (code === 500) {
      if (!res.config?.silent) {
        ElMessage({ message: msg, type: 'error' })
      }
      return Promise.reject(new Error(msg))
    } else if (code === 601) {
      if (!res.config?.silent) {
        ElMessage({ message: msg, type: 'warning' })
      }
      return Promise.reject(new Error(msg))
    } else if (code !== 200) {
      ElNotification.error({ title: msg })
      return Promise.reject('error')
    } else {
      return  Promise.resolve(res.data)
    }
  },
  error => {
    // AbortController / axios cancel: silent, no toast
    if (
      axios.isCancel?.(error) ||
      error?.code === 'ERR_CANCELED' ||
      error?.name === 'CanceledError' ||
      error?.message === 'canceled'
    ) {
      return Promise.reject(error)
    }
    if (error?.config?.silent) {
      return Promise.reject(error)
    }
    console.log('err' + error)
    let { message } = error
    if (message == "Network Error") {
      message = t('common.http.networkError')
    } else if (message.includes("timeout")) {
      message = t('common.http.timeout')
    } else if (message.includes("Request failed with status code")) {
      message = t('common.http.statusError', { code: message.slice(-3) })
    }
    ElMessage({ message: message, type: 'error', duration: 5 * 1000 })
    return Promise.reject(error)
  }
)

// Generic download helper
export function download(url, params, filename, config) {
  downloadLoadingInstance = ElLoading.service({ text: t('common.http.downloading'), background: "rgba(0, 0, 0, 0.7)", })
  return service.post(url, params, {
    transformRequest: [(params) => { return tansParams(params) }],
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'blob',
    ...config
  }).then(async (data) => {
    const isBlob = blobValidate(data)
    if (isBlob) {
      const blob = new Blob([data])
      saveAs(blob, filename)
    } else {
      const resText = await data.text()
      const rspObj = JSON.parse(resText)
      const errMsg = errorCode[rspObj.code] || rspObj.msg || errorCode['default']
      ElMessage.error(errMsg)
    }
    downloadLoadingInstance.close()
  }).catch((r) => {
    console.error(r)
    ElMessage.error(t('common.http.downloadError'))
    downloadLoadingInstance.close()
  })
}

export default service
