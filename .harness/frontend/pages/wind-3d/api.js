import request from '@/utils/request'

export function listWindAlerts(params) {
  return request({
    url: '/alertInfo/alertInfoListByTime',
    method: 'get',
    params,
    silent: true
  })
}
