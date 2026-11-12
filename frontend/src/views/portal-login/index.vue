<template>
  <main class="portal-login">
    <section class="portal-login__story"><router-link class="portal-link" to="/">← {{ t('back') }}</router-link><p class="portal-eyebrow">GUANFENG / {{ platform === 'cloud' ? 'APPLICATION STUDIO' : 'WEATHER OPERATIONS' }}</p><h1>{{ t('brand') }}<br>{{ t(platform) }}</h1><p>{{ t(platform + 'Intro') }}</p><div class="portal-login__features">{{ t(platform + 'Features') }}</div></section>
    <section class="portal-login__panel"><h2>{{ t('login') }}</h2><p>{{ t('loginSubtitle') }}</p><el-alert v-if="error" :title="error" type="error" :closable="false" show-icon/>
      <el-form ref="form" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <el-form-item :label="t('username')" prop="username"><el-input v-model="form.username" name="username" autocomplete="username" :aria-label="t('username')" /></el-form-item>
        <el-form-item :label="t('password')" prop="password"><el-input v-model="form.password" name="password" type="password" show-password autocomplete="current-password" :aria-label="t('password')" /></el-form-item>
        <el-button type="primary" native-type="submit" :loading="busy" class="portal-login__submit" data-testid="portal-login">{{ t(busy ? 'loggingIn' : 'login') }}</el-button>
      </el-form>
      <router-link class="portal-link" :to="platform === 'cloud' ? '/login-network' : '/login-cloud'">{{ t('switchPlatform') }} · {{ t(platform === 'cloud' ? 'operations' : 'cloud') }} →</router-link>
    </section>
  </main>
</template>
<script>
import usePortalStore from '@/store/modules/portal'
export default {
  name: 'PortalLogin',
  data() { return { form: { username: '', password: '' }, busy: false, error: '' } },
  computed: {
    platform() { return this.$route.meta.loginPlatform },
    rules() { return { username: [{ required: true, message: this.t('usernameRequired'), trigger: 'blur' }], password: [{ required: true, message: this.t('passwordRequired'), trigger: 'blur' }] } }
  },
  watch: { platform() { this.form = { username: '', password: '' }; this.error = ''; this.$refs.form?.clearValidate() } },
  methods: {
    t(key) { return this.$t('portal.' + key) },
    async submit() {
      if (this.busy) return
      if (!await this.$refs.form.validate().catch(() => false)) return
      this.busy = true; this.error = ''
      try {
        const platform = this.platform
        await usePortalStore().login(platform, this.form)
        this.form.password = ''
        const target = String(this.$route.query.redirect || '')
        const prefix = platform === 'cloud' ? '/cloud' : '/operations'
        await this.$router.replace(target === prefix || target.startsWith(prefix + '/') ? target : prefix)
      } catch (error) { this.error = error.code === 401 ? this.t('loginError') : this.t('loginUnavailable') } finally { this.busy = false }
    }
  }
}
</script>
