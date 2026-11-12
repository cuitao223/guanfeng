import resourcesCn from './Cn/resources'
import resourcesEn from './En/resources'
import windSceneCn from './Cn/windScene'
import windSceneEn from './En/windScene'
import portalCn from './Cn/portal'
import portalEn from './En/portal'
import realMapCn from './Cn/realMap'
import realMapEn from './En/realMap'
import workbenchCn from './Cn/workbench'
import workbenchEn from './En/workbench'
import { createI18n } from 'vue-i18n'
import Cookies from 'js-cookie'
import widgetCn from './Cn/widget'
import widgetEn from './En/widget'
import deviceModelCn from './Cn/deviceModel'
import deviceModelEn from './En/deviceModel'
import pagesCn from './Cn/pages'
import pagesEn from './En/pages'
import loginCloudCn from './Cn/loginCloud'
import loginCloudEn from './En/loginCloud'
import loginNetworkCn from './Cn/loginNetwork'
import loginNetworkEn from './En/loginNetwork'
import deviceOverviewCn from './Cn/deviceOverview'
import deviceOverviewEn from './En/deviceOverview'
import wind3dCn from './Cn/wind3d'
import wind3dEn from './En/wind3d'
import otherModeCn from './Cn/otherMode'
import otherModeEn from './En/otherMode'

const messages = {
  Cn: {
    common: {
      reLogin: '重新登录',
      cancel: '取消',
      http: {
        repeatSubmit: '数据正在处理，请勿重复提交',
        repeatSubmitSizeWarn: '请求数据过大',
        sessionExpired: '登录状态已过期，您可以继续留在该页面，或者重新登录',
        invalidSession: '无效的会话，或者会话已过期，请重新登录。',
        networkError: '后端接口连接异常',
        timeout: '系统接口请求超时',
        statusError: '系统接口{code}异常',
        downloading: '正在下载数据，请稍候',
        downloadError: '下载文件出现错误，请联系管理员！'
      }
    },
    windScene: windSceneCn,
    resources: resourcesCn,
    portal: portalCn,
    realMap: realMapCn,
    workbench: workbenchCn,
    widget: widgetCn,
    deviceModel: deviceModelCn,
    pages: pagesCn,
    loginCloud: loginCloudCn,
    loginNetwork: loginNetworkCn,
    deviceOverview: deviceOverviewCn,
    wind3d: wind3dCn,
    otherMode: otherModeCn
  },
  En: {
    common: {
      reLogin: 'Sign in again',
      cancel: 'Cancel',
      http: {
        repeatSubmit: 'Request in progress',
        repeatSubmitSizeWarn: 'Payload is too large',
        sessionExpired: 'Session expired',
        invalidSession: 'Invalid or expired session',
        networkError: 'Network error',
        timeout: 'Request timeout',
        statusError: 'Request failed ({code})',
        downloading: 'Downloading',
        downloadError: 'Download failed'
      }
    },
    windScene: windSceneEn,
    resources: resourcesEn,
    portal: portalEn,
    realMap: realMapEn,
    workbench: workbenchEn,
    widget: widgetEn,
    deviceModel: deviceModelEn,
    pages: pagesEn,
    loginCloud: loginCloudEn,
    loginNetwork: loginNetworkEn,
    deviceOverview: deviceOverviewEn,
    wind3d: wind3dEn,
    otherMode: otherModeEn
  }
}

export function getLanguage() {
  const lang = Cookies.get('language')
  return lang === 'En' ? 'En' : 'Cn'
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: getLanguage(),
  messages
})

export default i18n
