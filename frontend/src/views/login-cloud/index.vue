<template>
  <div class="login-cloud">
    <div class="glow"></div>
    <div class="stars">
      <i v-for="(star, index) in stars" :key="index" :style="star"></i>
    </div>
    <div class="globe" aria-hidden="true">
      <div class="world">
        <div class="floor"></div>
        <div class="grid"></div>
        <span class="turbine" style="left: 28%; top: 42%"></span>
        <span class="turbine" style="left: 46%; top: 58%"></span>
        <span class="turbine" style="left: 61%; top: 36%"></span>
        <span class="lidar" style="left: 38%; top: 30%"></span>
        <span class="lidar" style="left: 54%; top: 48%"></span>
      </div>
    </div>
    <div class="login-lang">
      <button type="button" :class="{ 'is-current': lang === 'Cn' }" @click="setLang('Cn')">{{ $t('loginCloud.langCn') }}</button>
      <button type="button" :class="{ 'is-current': lang === 'En' }" @click="setLang('En')">{{ $t('loginCloud.langEn') }}</button>
      <router-link to="/templates">{{ $t('pages.nav') }}</router-link>
    </div>
    <div class="brand">
      <h1>{{ $t('loginCloud.brandPrefix') }}</h1>
      <p>{{ $t('loginCloud.subtitle') }}</p>
      <span class="tag">{{ $t('loginCloud.tag') }}</span>
    </div>
    <div class="status">
      <div class="status-item">
        <span class="dot"></span>
        <span>{{ $t('loginCloud.lidar') }}</span>
        <b>{{ countText(lidarCount) }}</b>
      </div>
      <div class="status-item">
        <span>{{ $t('loginCloud.turbine') }}</span>
        <b>{{ countText(turbineCount) }}</b>
      </div>
    </div>
    <el-form
      v-if="!emailStep"
      ref="loginForm"
      class="login-form"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent
    >
      <h2 class="panel-title">{{ $t('loginCloud.panelTitle') }}</h2>
      <p class="panel-sub">{{ $t('loginCloud.panelSub') }}</p>
      <el-form-item prop="username" :label="$t('loginCloud.username')">
        <el-input v-model="form.username" :placeholder="$t('loginCloud.usernamePlaceholder')" />
      </el-form-item>
      <el-form-item prop="password" :label="$t('loginCloud.password')">
        <el-input
          v-model="form.password"
          type="password"
          show-password
          :placeholder="$t('loginCloud.passwordPlaceholder')"
          @keyup.enter="submit"
        />
      </el-form-item>
      <el-form-item prop="code" class="code-item" :label="$t('loginCloud.code')">
        <el-input v-model="form.code" :placeholder="$t('loginCloud.codePlaceholder')" @keyup.enter="submit" />
        <canvas ref="captcha" class="captcha" width="110" height="48" @click="drawCaptcha"></canvas>
      </el-form-item>
      <el-checkbox v-model="form.rememberMe">{{ $t('loginCloud.remember') }}</el-checkbox>
      <el-button class="login-btn" type="primary" :loading="loading" @click="submit">
        {{ loading ? $t('loginCloud.loggingIn') : $t('loginCloud.login') }}
      </el-button>
    </el-form>
    <el-form
      v-else
      ref="emailForm"
      class="login-form"
      :model="emailForm"
      :rules="emailRules"
      label-position="top"
      @submit.prevent
    >
      <h2 class="panel-title">{{ $t('loginCloud.emailTitle') }}</h2>
      <p class="panel-sub panel-sub-tight">{{ $t('loginCloud.emailSub', { email: maskedEmail }) }}</p>
      <p class="expire" :class="{ 'is-expired': emailExpired }">
        {{ emailExpired ? $t('loginCloud.emailExpired') : $t('loginCloud.emailExpire', { seconds: emailLeft }) }}
      </p>
      <el-form-item prop="emailCode" :label="$t('loginCloud.emailCode')">
        <el-input
          v-model="emailForm.emailCode"
          maxlength="6"
          :placeholder="$t('loginCloud.emailCodePlaceholder')"
          @input="sanitizeEmailCode"
          @keyup.enter="verifyEmail"
        />
      </el-form-item>
      <div class="email-actions">
        <button type="button" @click="backToPassword">{{ $t('loginCloud.back') }}</button>
        <button type="button" :disabled="resendLeft > 0 || emailExpired" @click="resend">
          {{ resendLeft > 0 ? $t('loginCloud.resendWait', { seconds: resendLeft }) : $t('loginCloud.resend') }}
        </button>
      </div>
      <el-button class="login-btn" type="primary" :loading="loading" :disabled="emailExpired" @click="verifyEmail">
        {{ loading ? $t('loginCloud.verifying') : $t('loginCloud.verify') }}
      </el-button>
    </el-form>
  </div>
</template>

<script>
import Cookies from 'js-cookie'
import { ElMessage } from 'element-plus'
import i18n from '@/lang'
import useUserStore from '@/store/modules/user'
import { getOpenDeviceCounts } from '@/api/auth/loginCloud'

const accountCookie = 'cloudLoginUser'
const captchaChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export default {
  name: 'LoginCloudPage',
  data() {
    return {
      lang: 'Cn',
      stars: [],
      lidarCount: null,
      turbineCount: null,
      loading: false,
      emailStep: false,
      maskedEmail: '',
      emailLeft: 0,
      resendLeft: 0,
      captchaText: '',
      form: {
        username: '',
        password: '',
        code: '',
        rememberMe: false
      },
      emailForm: {
        emailCode: ''
      }
    }
  },
  computed: {
    emailExpired() {
      return this.emailStep && this.emailLeft <= 0
    },
    rules() {
      return {
        username: [{ required: true, message: this.$t('loginCloud.rules.username'), trigger: 'blur' }],
        password: [{ required: true, message: this.$t('loginCloud.rules.password'), trigger: 'blur' }],
        code: [{ validator: this.validateCode, trigger: 'blur' }]
      }
    },
    emailRules() {
      return {
        emailCode: [{
          validator: (rule, value, callback) => {
            if (!/^\d{6}$/.test(value || '')) callback(new Error(this.$t('loginCloud.rules.emailCode')))
            else callback()
          },
          trigger: 'blur'
        }]
      }
    }
  },
  created() {
    this.lang = i18n.global.locale.value === 'En' ? 'En' : 'Cn'
    this.stars = Array.from({ length: 48 }, () => ({
      left: (Math.random() * 70).toFixed(2) + '%',
      top: (Math.random() * 46).toFixed(2) + '%',
      animationDelay: (Math.random() * 4).toFixed(1) + 's'
    }))
    const username = Cookies.get(accountCookie)
    if (username) {
      this.form.username = username
      this.form.rememberMe = true
    }
    getOpenDeviceCounts().then((res) => {
      const data = res.data || {}
      this.lidarCount = Number(data.radarCount)
      this.turbineCount = Number(data.windfarmCount)
    }).catch(() => {
      this.lidarCount = null
      this.turbineCount = null
    })
  },
  mounted() {
    this.drawCaptcha()
  },
  beforeUnmount() {
    this.clearTimers()
  },
  methods: {
    setLang(lang) {
      this.lang = lang
      Cookies.set('language', lang)
      i18n.global.locale.value = lang
    },
    countText(value) {
      return Number.isFinite(value) ? String(value) : '--'
    },
    validateCode(rule, value, callback) {
      if (!value) callback(new Error(this.$t('loginCloud.rules.code')))
      else if (String(value).toLowerCase() !== this.captchaText.toLowerCase()) {
        callback(new Error(this.$t('loginCloud.rules.codeMismatch')))
      } else callback()
    },
    drawCaptcha() {
      const canvas = this.$refs.captcha
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      let text = ''
      for (let i = 0; i < 4; i += 1) {
        text += captchaChars[Math.floor(Math.random() * captchaChars.length)]
      }
      this.captchaText = text
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#10192c'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = '24px sans-serif'
      ctx.fillStyle = '#d6e6ff'
      ctx.fillText(text, 12, 32)
    },
    submit() {
      this.$refs.loginForm.validate((valid) => {
        if (!valid) return
        this.loading = true
        if (this.form.rememberMe) Cookies.set(accountCookie, this.form.username, { expires: 30 })
        else Cookies.remove(accountCookie)
        window.setTimeout(() => {
          this.loading = false
          this.maskedEmail = (this.form.username.trim().slice(0, 1) || '*') + '***'
          this.emailForm.emailCode = ''
          this.emailStep = true
          this.startCountdown('email', 300)
          this.startCountdown('resend', 60)
        }, 300)
      })
    },
    sanitizeEmailCode(value) {
      this.emailForm.emailCode = String(value || '').replace(/\D/g, '').slice(0, 6)
    },
    verifyEmail() {
      if (this.emailExpired || this.loading) return
      this.$refs.emailForm.validate((valid) => {
        if (!valid) return
        this.loading = true
        window.setTimeout(() => {
          this.loading = false
          this.clearTimers()
          useUserStore().setSession('skeleton')
          this.$router.push('/templates')
        }, 300)
      })
    },
    backToPassword() {
      this.emailStep = false
      this.clearTimers()
      this.emailLeft = 0
      this.resendLeft = 0
      this.form.code = ''
      this.$nextTick(() => this.drawCaptcha())
    },
    resend() {
      if (this.resendLeft > 0 || this.emailExpired) return
      this.startCountdown('email', 300)
      this.startCountdown('resend', 60)
      ElMessage.success(this.$t('loginCloud.resendOk'))
    },
    startCountdown(kind, seconds) {
      const key = kind === 'email' ? 'emailLeft' : 'resendLeft'
      const timer = kind === 'email' ? '_emailTimer' : '_resendTimer'
      this[key] = seconds
      if (this[timer]) window.clearInterval(this[timer])
      this[timer] = window.setInterval(() => {
        if (this[key] <= 1) {
          this[key] = 0
          window.clearInterval(this[timer])
          this[timer] = null
          return
        }
        this[key] -= 1
      }, 1000)
    },
    clearTimers() {
      if (this._emailTimer) window.clearInterval(this._emailTimer)
      if (this._resendTimer) window.clearInterval(this._resendTimer)
      this._emailTimer = null
      this._resendTimer = null
    }
  }
}
</script>

<style scoped>
.login-cloud {
  --login-bg: #050b18;
  --login-ink: #e8eef9;
  --login-dim: #8b9ab5;
  --login-blue: #206aff;
  --login-card: rgba(10, 18, 36, 0.88);
  --login-panel-width: 400px;
  --login-panel-right: 120px;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: var(--login-ink);
  background: var(--login-bg);
}
.glow,
.stars,
.globe {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: calc(var(--login-panel-width) + var(--login-panel-right));
  pointer-events: none;
}
.glow {
  background:
    radial-gradient(1200px 700px at 30% 110%, rgba(46, 134, 255, 0.16), transparent 65%),
    radial-gradient(900px 500px at 78% -10%, rgba(46, 111, 255, 0.1), transparent 60%);
}
.stars { opacity: 0.5; }
.stars i {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #9fc6ff;
  animation: twinkle 4s ease-in-out infinite;
}
.globe { z-index: 1; overflow: hidden; }
.world {
  position: absolute;
  left: 50%;
  top: 46%;
  width: 920px;
  height: 460px;
  transform: translate(-50%, -50%) rotateX(58deg) rotateZ(-4deg);
}
.floor {
  position: absolute;
  inset: -80px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(46, 134, 255, 0.16), transparent 72%);
}
.grid {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    repeating-linear-gradient(90deg, rgba(120, 170, 255, 0.28) 0 1px, transparent 1px 72px),
    repeating-linear-gradient(0deg, rgba(120, 170, 255, 0.22) 0 1px, transparent 1px 48px);
  box-shadow: inset 0 0 0 1px rgba(94, 177, 255, 0.28);
}
.turbine,
.lidar {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7ce3b0;
  box-shadow: 0 0 10px #7ce3b0;
}
.lidar {
  background: #206aff;
  box-shadow: 0 0 12px #206aff;
}
.login-lang {
  position: absolute;
  top: 28px;
  right: 40px;
  z-index: 6;
  display: flex;
  gap: 12px;
  align-items: center;
}
.login-lang button,
.login-lang a {
  border: 0;
  padding: 0;
  color: var(--login-dim);
  background: transparent;
  font: inherit;
  cursor: pointer;
  text-decoration: none;
}
.login-lang .is-current { color: var(--login-ink); }
.brand {
  position: absolute;
  left: 96px;
  top: 84px;
  z-index: 5;
}
.brand h1 {
  margin: 0;
  font-size: 34px;
  letter-spacing: 3px;
}
.brand span { color: var(--login-blue); }
.brand p {
  margin: 10px 0 0;
  color: var(--login-dim);
  letter-spacing: 2px;
}
.tag {
  display: inline-block;
  margin-top: 18px;
  padding: 5px 14px;
  border: 1px solid rgba(94, 177, 255, 0.35);
  border-radius: 20px;
  color: var(--login-blue);
  font-size: 12px;
  letter-spacing: 2px;
}
.status {
  position: absolute;
  left: 96px;
  bottom: 56px;
  z-index: 5;
  display: flex;
  gap: 36px;
}
.status-item {
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--login-dim);
  font-size: 13px;
}
.status-item b {
  color: var(--login-blue);
  font-size: 20px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7ce3b0;
  box-shadow: 0 0 8px #7ce3b0;
}
.login-form {
  position: absolute;
  top: 50%;
  right: var(--login-panel-right);
  z-index: 5;
  width: var(--login-panel-width);
  margin: 0;
  padding: 44px 40px 38px;
  border: 1px solid rgba(94, 177, 255, 0.22);
  border-radius: 18px;
  background: var(--login-card);
  transform: translateY(-50%);
}
.panel-title {
  margin: 0;
  font-size: 24px;
}
.panel-sub {
  margin: 8px 0 30px;
  color: var(--login-dim);
  font-size: 13px;
}
.panel-sub-tight { margin-bottom: 8px; }
.expire {
  margin: 0 0 20px;
  color: var(--login-dim);
  font-size: 12px;
}
.expire.is-expired { color: #f38ba8; }
.login-form :deep(.el-form-item__label) {
  color: #a7c4fc;
  font-size: 13px;
}
.login-form :deep(.el-input__wrapper) {
  height: 48px;
  background: rgba(237, 239, 243, 0.06);
  box-shadow: 0 0 0 1px #566c95 inset;
}
.login-form :deep(.el-input__inner) { color: #a7c4fc; }
.login-form :deep(.el-checkbox) { margin: 2px 0 24px; }
.login-form :deep(.el-checkbox__label) { color: var(--login-dim); }
.code-item :deep(.el-form-item__content) {
  display: flex;
  gap: 10px;
}
.code-item :deep(.el-input) { flex: 1; }
.captcha {
  flex: none;
  width: 110px;
  height: 48px;
  border-radius: 8px;
  cursor: pointer;
}
.email-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
}
.email-actions button {
  border: 0;
  padding: 0;
  color: var(--login-blue);
  background: transparent;
  cursor: pointer;
}
.email-actions button:disabled { color: var(--login-dim); cursor: not-allowed; }
.login-btn {
  width: 100%;
  height: 50px;
  border: none;
  border-radius: 10px;
  background: var(--login-blue);
  letter-spacing: 6px;
}
@keyframes twinkle {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.8; }
}
</style>
