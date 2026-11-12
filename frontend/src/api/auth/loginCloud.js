import request from '@/utils/request'

export function login(data) {
  return request({
    url: '/auth/login',
    headers: { isToken: false, repeatSubmit: false },
    method: 'post',
    data
  })
}

export function verifyLoginEmail(data) {
  return request({
    url: '/auth/login/email/verify',
    headers: { isToken: false, repeatSubmit: false },
    method: 'post',
    data
  })
}

export function resendLoginEmail(data) {
  return request({
    url: '/auth/login/email/resend',
    headers: { isToken: false, repeatSubmit: false },
    method: 'post',
    data
  })
}

export function getCodeImg() {
  return request({
    url: '/code',
    headers: { isToken: false },
    method: 'get',
    silent: true
  })
}

export function getOpenDeviceCounts() {
  return request({
    url: '/device/open/counts',
    headers: { isToken: false },
    method: 'get',
    silent: true
  })
}
