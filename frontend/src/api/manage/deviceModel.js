import request from '@/utils/request'

export function listDeviceModel(query) {
  return request({
    url: '/system/model/list',
    method: 'get',
    params: query
  })
}

export function getDeviceModel(modelId) {
  return request({
    url: '/system/model/' + modelId,
    method: 'get'
  })
}

export function addDeviceModel(data) {
  return request({
    url: '/system/model',
    method: 'post',
    data
  })
}

export function updateDeviceModel(data) {
  return request({
    url: '/system/model',
    method: 'put',
    data
  })
}

export function getAllDeviceModelList() {
  return request({
    url: '/system/model/getList',
    method: 'get'
  })
}

export function deleteDeviceModel(modelId) {
  return request({
    url: '/system/model/' + modelId,
    method: 'delete'
  })
}
