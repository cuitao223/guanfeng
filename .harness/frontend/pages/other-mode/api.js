import request from '@/utils/request'

export function listRhiFiles(params) {
  return request({
    url: '/PPIData/getRHIFileListFromCSv',
    method: 'get',
    params,
    silent: true
  })
}

export function readRhiScan(params) {
  return request({
    url: '/PPIData/getRHIDataFromCsv',
    method: 'get',
    params,
    silent: true
  })
}
export function listOtherModeDevices(params) {
  return request({
    url: '/device/homePageDeviceInfo',
    method: 'get',
    params,
    silent: true
  })
}
