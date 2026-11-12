<template>
  <div class="login-network">
    <img class="bg-video" :src="poster" alt="" />
    <router-link class="back-link" to="/templates">{{ $t('pages.nav') }}</router-link>
    <div class="form-wrap">
      <el-form ref="loginForm" :model="form" :rules="rules" class="login-form" @submit.prevent>
        <div class="welcome">{{ $t('loginNetwork.welcome') }}</div>
        <h1 class="title">{{ $t('loginNetwork.title') }}</h1>
        <el-form-item prop="username">
          <el-input v-model="form.username" clearable :placeholder="$t('loginNetwork.username')">
            <template #prefix>
              <span class="input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 19c1.4-3 3.8-4.5 7-4.5S17.6 16 19 19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              </span>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="$t('loginNetwork.password')"
            @keyup.enter="submit"
          >
            <template #prefix>
              <span class="input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><rect x="6" y="10" width="12" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
              </span>
            </template>
          </el-input>
        </el-form-item>
        <el-checkbox v-model="form.rememberMe" class="remember">{{ $t('loginNetwork.remember') }}</el-checkbox>
        <el-button class="login-btn" type="primary" :loading="loading" @click="submit">
          {{ loading ? $t('loginNetwork.loggingIn') : $t('loginNetwork.login') }}
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script>
import Cookies from 'js-cookie'
import useUserStore from '@/store/modules/user'
import poster from './assets/login-bg.jpg'

const accountCookie = 'networkLoginUser'

export default {
  name: 'LoginNetworkPage',
  data() {
    return {
      poster,
      loading: false,
      form: {
        username: '',
        password: '',
        rememberMe: false
      }
    }
  },
  computed: {
    rules() {
      return {
        username: [{ required: true, message: this.$t('loginNetwork.usernameRequired'), trigger: 'blur' }],
        password: [{ required: true, message: this.$t('loginNetwork.passwordRequired'), trigger: 'blur' }]
      }
    }
  },
  created() {
    const username = Cookies.get(accountCookie)
    if (username) {
      this.form.username = username
      this.form.rememberMe = true
    }
  },
  methods: {
    submit() {
      this.$refs.loginForm.validate((valid) => {
        if (!valid) return
        this.loading = true
        if (this.form.rememberMe) {
          Cookies.set(accountCookie, this.form.username, { expires: 30 })
        } else {
          Cookies.remove(accountCookie)
        }
        window.setTimeout(() => {
          this.loading = false
          useUserStore().setSession('skeleton')
          this.$router.push('/templates')
        }, 300)
      })
    }
  }
}
</script>

<style scoped>
.login-network {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: #ffffff;
  background: #061018;
}
.bg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.back-link {
  position: absolute;
  top: 24px;
  right: 32px;
  z-index: 2;
  color: #d6e6ff;
  text-decoration: none;
}
.form-wrap {
  position: absolute;
  left: 10%;
  top: 20%;
  z-index: 2;
}
.login-form {
  width: 470px;
  padding: 48px 40px;
  border-radius: 6px;
  background: #192235;
}
.welcome {
  margin-bottom: 24px;
  color: #3aa6ff;
  font-size: 14px;
}
.title {
  margin: 0 0 60px;
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  text-align: center;
}
.input-icon {
  display: inline-flex;
  width: 16px;
  height: 16px;
  color: #9fb4d4;
}
.input-icon svg {
  width: 16px;
  height: 16px;
}
.login-form :deep(.el-input__wrapper) {
  height: 50px;
  background: transparent;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16) inset;
}
.login-form :deep(.el-input__inner) {
  height: 50px;
  color: #ffffff;
}
.remember {
  margin: 0 0 25px;
}
.login-form :deep(.el-checkbox__label) {
  color: #d6e6ff;
}
.login-btn {
  width: 100%;
  height: 44px;
}
</style>
