<template>
  <section class="resource-center"><div class="portal-heading"><div><p class="portal-eyebrow">{{ platform === 'cloud' ? 'COMPONENT RESOURCES' : 'SPECIALIST TOOLS' }}</p><h1>{{ t(platform === 'cloud' ? 'resourceTitle' : 'toolTitle') }}</h1><p>{{ t(platform === 'cloud' ? 'resourceIntro' : 'toolIntro') }}</p></div></div>
    <div class="resource-grid resource-business-grid"><article v-for="item in businessEntries" :key="item.key" class="resource-card resource-card-business"><el-tag type="success">{{ t('actual') }}</el-tag><h2>{{ t(item.title) }}</h2><p>{{ t(item.hint) }}</p><el-button type="primary" @click="$router.push(item.to)">{{ t('open') }} →</el-button></article></div>
    <div class="resource-grid"><article v-for="item in entries" :key="item.key" class="resource-card"><el-tag :type="item.kind === 'unconnected' ? 'warning' : 'info'">{{ t(item.kind) }}</el-tag><h2>{{ t(item.title) }}</h2><p>{{ t(item.hint) }}</p><el-button @click="$router.push(base + '/' + item.slug)" :data-testid="'resource-' + item.key">{{ t('open') }} →</el-button></article></div>
  </section>
</template>
<script>
import { resourceEntries } from '@/utils/resourceEntries'
export default {
  name:'ResourceCenter',
  computed:{platform(){return this.$route.meta.portal},base(){return this.platform === 'cloud' ? '/cloud/resources' : '/operations/tools'},entries(){return resourceEntries.filter(x=>x.platform===this.platform)},businessEntries(){return this.platform==='cloud'?[{key:'catalog',title:'catalogTitle',hint:'catalogHint',to:'/cloud/workbench?tab=catalog'},{key:'workflow',title:'workflow',hint:'workflowHint',to:'/cloud/workbench?tab=workflow'}]:[{key:'analysis',title:'actualAnalysis',hint:'actualAnalysisHint',to:'/operations/analysis'},{key:'wind',title:'actualWind',hint:'actualWindHint',to:'/operations/wind'}]}},
  methods:{t(k){return this.$t('resources.'+k)}}
}
</script>
<style scoped lang="scss">
.resource-center {padding:32px;box-sizing:border-box;height:100%;overflow:auto;background:#111827;color:#fff;}.resource-center h1 {font-size:28px;margin:8px 0 12px;}.resource-center>.portal-heading p {color:#a7c4fc;line-height:1.7;}.resource-grid {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:24px 0;}.resource-business-grid {grid-template-columns:repeat(2,minmax(0,1fr));}.resource-card {padding:24px;background:#091329;border:1px solid #294e78;border-radius:12px;}.resource-card-business {border-color:#326587;}.resource-card h2 {font-size:20px;margin:16px 0 12px;}.resource-card p {font-size:14px;line-height:1.8;color:#a7c4fc;min-height:52px;}.resource-card .el-button {margin-top:14px;}
.resource-card :deep(.el-tag) {opacity:1!important;transform:none!important;animation:none!important;transition:none!important;}
</style>
