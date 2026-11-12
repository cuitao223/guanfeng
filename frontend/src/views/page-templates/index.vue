<template>
  <div class="page-template-hub">
    <h1>{{ $t('pages.hubTitle') }}</h1>
    <ul>
      <li><router-link to="/login-cloud">{{ $t('pages.link.loginCloud') }}</router-link></li>
      <li><router-link to="/login-network">{{ $t('pages.link.loginNetwork') }}</router-link></li>
      <li><router-link to="/operations/tools/devices">{{ $t('pages.link.deviceOverview') }}</router-link></li>
      <li><router-link to="/operations/wind">{{ $t('pages.link.wind3d') }}</router-link></li>
      <li><router-link to="/operations/tools/multimode">{{ $t('pages.link.otherMode') }}</router-link></li>
      <li><router-link to="/operations/tools/models">{{ $t('pages.link.deviceModel') }}</router-link></li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'PageTemplateHub'
}
</script>

<style scoped>
.page-template-hub {
  box-sizing: border-box;
  height: 100%;
  padding: 24px;
  overflow: auto;
}
ul { margin: 0; padding-left: 20px; }
li { margin: 8px 0; }
</style>
