import request from '@/utils/request'

export function login(data) {
  return request({
    url: '/login',
    headers: { isToken: false, repeatSubmit: false },
    method: 'post',
    data
  })
}

export function getCodeImg() {
  return request({
    url: '/captchaImage',
    headers: { isToken: false },
    method: 'get',
    silent: true
  })
}
