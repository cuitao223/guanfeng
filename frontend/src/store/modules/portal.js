import { defineStore } from 'pinia'
import { getPortalIdentity, loginPortal, logoutPortal } from '@/api/portal'
export default defineStore('portal', {
  state: () => ({ cloud: null, operations: null }),
  actions: {
    async verify(platform) { try { this[platform] = await getPortalIdentity(platform); return this[platform] } catch (error) { this[platform] = null; if (error.code !== 401) throw error; return null } },
    async login(platform, credentials) { const user = await loginPortal({ platform, ...credentials }); this[platform] = user; return user },
    async logout(platform) { await logoutPortal(platform); this[platform] = null }
  }
})
