import request from '@/utils/request'
import { saveAs } from 'file-saver'
import { ElMessage } from 'element-plus'
import i18n from '@/lang'

// Keep the existing client, including language and error handling.
export async function wb(path, { method = 'get', data, params, session, signal, timeout = 30000 } = {}) {
  let envelope
  try {
    const result = await request({
      baseURL: '', url: `/api/wb${path}`, method, data, params, signal, timeout,
      headers: { isToken: false, repeatSubmit: false, ...(session ? { 'X-Session': session } : {}) },
      transformResponse: [(raw) => { envelope = typeof raw === 'string' ? JSON.parse(raw) : raw; return envelope }]
    })
    return result.data
  } catch (cause) {
    const error = new Error(envelope?.msg || cause?.message || String(cause))
    error.code = envelope?.code || cause?.response?.status
    error.details = envelope?.data
    throw error
  }
}

export async function exportFile(path, params, filename, session) {
  try {
    const blob = await request({
      baseURL: '', url: `/api/wb${path}`, method: 'get', params, responseType: 'blob',
      headers: { isToken: false, ...(session ? { 'X-Session': session } : {}) }
    })
    if (!(blob instanceof Blob)) throw new Error(i18n.global.t('common.http.downloadError'))
    if (blob.type.includes('application/json')) {
      const response = JSON.parse(await blob.text())
      throw new Error(response.msg || i18n.global.t('common.http.downloadError'))
    }
    saveAs(blob, filename)
    return { downloaded: true, bytes: blob.size }
  } catch (error) {
    ElMessage.error(error.message || i18n.global.t('common.http.downloadError'))
    return { downloaded: false }
  }
}
