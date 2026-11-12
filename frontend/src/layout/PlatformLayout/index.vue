<template>
  <div class="platform-layout">
    <header class="platform-header">
      <router-link class="header-title" :to="platform === 'cloud' ? '/cloud' : '/operations'">{{ $t('portal.brand') }}<small>{{ $t('portal.' + platform) }}</small></router-link>
      <nav class="header-nav" :aria-label="$t('portal.' + platform)">
        <router-link v-for="item in navigation" :key="item.key" class="nav-item" :class="{ 'is-active': active(item) }" :to="item.to">{{ $t('portal.' + item.key) }}</router-link>
      </nav>
      <div class="header-account"><span>{{ identity?.displayName || identity?.username }}</span><router-link class="portal-link" to="/">{{ $t('portal.switchPlatform') }}</router-link><el-button text :loading="leaving" @click="logout" data-testid="portal-logout">{{ $t('portal.logout') }}</el-button></div>
    </header>
    <main class="platform-main" :class="{ 'is-full-bleed': $route.meta.fullBleed }"><router-view /></main>
  </div>
</template>
<script>
import usePortalStore from '@/store/modules/portal'
export default {
  name: 'PlatformLayout',
  data() { return { leaving: false } },
  computed: {
    platform() { return this.$route.meta.portal || 'cloud' },
    identity() { return usePortalStore()[this.platform] },
    navigation() { return this.platform === 'cloud' ? [
      { key: 'home', to: '/cloud' }, { key: 'create', to: '/cloud/workbench?tab=generation', tab: 'generation' }, { key: 'components', to: '/cloud/workbench?tab=catalog', tab: 'catalog' }, { key: 'workflow', to: '/cloud/workbench?tab=workflow', tab: 'workflow' }, { key:'resources',to:'/cloud/resources',prefix:'/cloud/resources' }, { key: 'collaborate', to: '/cloud/workbench?tab=collaboration', tab: 'collaboration' }
    ] : [{ key: 'overview', to: '/operations' }, { key: 'analysis', to: '/operations/analysis' }, { key: 'scene', to: '/operations/3d' }, { key: 'windField', to: '/operations/wind' }, { key:'tools',to:'/operations/tools',prefix:'/operations/tools' }] }
  },
  created() { document.documentElement.classList.add('dark') },
  methods: {
    active(item) { if(item.prefix)return this.$route.path.startsWith(item.prefix); return item.tab ? this.$route.path === '/cloud/workbench' && (this.$route.query.tab || 'generation') === item.tab : this.$route.path === item.to },
    async logout() {
      if(this.leaving) return
      this.leaving = true
      const platform = this.platform
      try {
        if(platform === 'cloud') {
          try { const raw = sessionStorage.getItem('guanfeng.project.session'); if(raw) { const session=JSON.parse(raw); const { wb } = await import('@/api/workbench'); await wb('/session/leave',{ method:'post',session:session.token,data:{} }) } } catch { /* Expired project sessions do not prevent portal logout. */ }
          sessionStorage.removeItem('guanfeng.project.session')
        }
        await usePortalStore().logout(platform)
        await this.$router.replace(platform === 'cloud' ? '/login-cloud' : '/login-network')
      } finally { this.leaving = false }
    }
  }
}
</script>
<style lang="scss" scoped>
@use '../../assets/styles/platform-manage-shell.scss' as *;

.platform-main:not(.is-full-bleed) {
  @include platform-manage-filter;
  @include platform-manage-table;
}

html.dark .platform-main:not(.is-full-bleed) {
  @include platform-manage-filter-dark;
  @include platform-manage-table-dark;
}

.platform-layout {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #111827;
  color: #ffffff;
  font-family: 'Alibaba PuHuiTi', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --el-font-family: 'Alibaba PuHuiTi', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.platform-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 24px;
  height: 80px;
  padding: 0 24px;
  background: rgba(17, 24, 39, 0.8);
  border-bottom: 1px solid rgba(36, 132, 249, 0.28);
}

.header-nav {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.header-title {
  font-family: 'Alimama ShuHeiTi', 'AlimamaShuHeiTi', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  height: 34px;
  padding: 0 14px;
  white-space: nowrap;
  border-radius: 8px;
  color: #ffffff;
  background: rgba(17, 24, 39, 0.8);
  text-decoration: none;
}

.nav-item.is-active {
  background: #206aff;
}

.platform-main {
  flex: 1;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 16px;
}

.platform-main.is-full-bleed {
  padding: 0;
}
</style>

<style scoped>
.header-title { color: #fff; text-decoration: none; white-space: nowrap; }
.header-title small { display: block; font-size: 11px; letter-spacing: 0; margin-top: 8px; color: #a7c4fc; }
.header-account { display: flex; gap: 14px; align-items: center; white-space: nowrap; font-size: 13px; }
</style>
