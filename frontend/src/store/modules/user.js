import { defineStore } from 'pinia'
import { getToken, removeToken, setToken } from '@/utils/auth'

const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    permissions: ['*:*:*']
  }),
  actions: {
    setSession(token) {
      setToken(token)
      this.token = token
    },
    logOut() {
      this.token = ''
      removeToken()
      return Promise.resolve()
    }
  }
})

export default useUserStore
