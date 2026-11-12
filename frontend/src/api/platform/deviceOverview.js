import request from '@/utils/request'

export function listOverviewDevices(query) {
  return request({
    url: '/device/map',
    method: 'get',
    params: query,
    silent: true
  })
}

export function listOverviewModels() {
  return request({
    url: '/device/model/all',
    method: 'get',
    silent: true
  })
}

export function listOverviewWindfarms() {
  return request({
    url: '/device/windfarm/list',
    method: 'get',
    silent: true
  })
}

export function listOverviewProjects() {
  return request({
    url: '/device/project/all',
    method: 'get',
    silent: true
  })
}
