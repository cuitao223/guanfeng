import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/utils/lib-flexible.js'
import '@/assets/styles/fonts.scss'
import '@/assets/styles/platform-form-dialog.scss'
import '@/assets/styles/platform-message-box.scss'
import '@/assets/styles/workbench.scss'
import '@/assets/styles/portal.scss'
import App from './App.vue'
import store from './store'
import router from './router'
import directive from './directive'
import i18n from './lang'
import { download } from '@/utils/request'
import './permission'

document.documentElement.classList.add('dark')
const app = createApp(App)
app.config.globalProperties.download = download
app.use(router)
app.use(store)
app.use(i18n)
app.use(directive)
app.use(ElementPlus)
app.mount('#app')
