import request from '@/utils/request'

export function listSample(query) {
  return request({
    url: '/sample/list',
    method: 'get',
    params: query
  })
}
