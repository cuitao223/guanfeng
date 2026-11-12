import request from '@/utils/request'
export async function portalRequest(path, { method = 'get', data, params } = {}) {
  const envelope = await request({ baseURL: '', url: `/api/wb/auth${path}`, method, data, params, portalAuth: true, silent: true, validateStatus: () => true, headers: { isToken: false, repeatSubmit: false } })
  return envelope.data
}
export const loginPortal = data => portalRequest('/login', { method: 'post', data })
export const getPortalIdentity = platform => portalRequest('/me', { params: { platform } })
export const logoutPortal = platform => portalRequest('/logout', { method: 'post', data: { platform } })
