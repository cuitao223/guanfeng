<template>
  <div class="login-page">
    <el-button type="primary" @click="enter">进入示例</el-button>
  </div>
</template>

<script>
import useUserStore from '@/store/modules/user'

export default {
  name: 'LoginPage',
  methods: {
    enter() {
      useUserStore().setSession('skeleton')
      this.$router.push('/')
    }
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #111827;
}
</style>
