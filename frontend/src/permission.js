import router from './router'
import store from './store'
import usePortalStore from '@/store/modules/portal'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
NProgress.configure({ showSpinner: false })
router.beforeEach(async to => {
  NProgress.start()
  const platform = to.meta.portal
  if (!platform) return true
  try {
    if (await usePortalStore(store).verify(platform)) return true
  } catch { /* The protected screen must remain closed if identity verification fails. */ }
  return { path: platform === 'cloud' ? '/login-cloud' : '/login-network', query: { redirect: to.fullPath } }
})
router.afterEach(() => NProgress.done())
router.onError(() => NProgress.done())
