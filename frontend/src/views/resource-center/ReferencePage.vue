<template>
  <section class="reference-page" :data-reference="entry.key"><header class="reference-header"><el-button @click="$router.push(base)">← {{ t('back') }}</el-button><div><h1>{{ t(entry.title) }}</h1><p>{{ t(entry.hint) }}</p></div><el-tag :type="entry.kind==='unconnected'?'warning':'info'">{{ t(entry.kind) }}</el-tag><el-button v-if="entry.key==='wind-tools'" type="primary" @click="$router.push('/operations/wind')">{{ t('realWindLink') }}</el-button></header>
    <div class="reference-notice" role="note">{{ t(entry.kind + 'Note') }}</div><div class="reference-content"><component :is="view" :key="entry.key" :reference-mode="true"/></div>
  </section>
</template>
<script>
import { defineAsyncComponent } from 'vue'
import { resourceEntries } from '@/utils/resourceEntries'
const views={
  'charts': defineAsyncComponent(() => import('@/views/chart-preview/index.vue')),
  'maps': defineAsyncComponent(() => import('@/views/map-preview/index.vue')),
  'ui': defineAsyncComponent(() => import('@/views/ui-preview/index.vue')),
  'widgets': defineAsyncComponent(() => import('@/views/widget-preview/index.vue')),
  'overview': defineAsyncComponent(() => import('@/views/overview/index.vue')),
  'pages': defineAsyncComponent(() => import('@/views/page-templates/index.vue')),
  'sample': defineAsyncComponent(() => import('@/views/sample/index.vue')),
  'devices': defineAsyncComponent(() => import('@/views/device-overview/index.vue')),
  'multimode': defineAsyncComponent(() => import('@/views/other-mode/index.vue')),
  'models': defineAsyncComponent(() => import('@/views/device-model/index.vue')),
  'wind-tools': defineAsyncComponent(() => import('@/views/wind-3d/index.vue')),
}
export default {name:'ReferencePage',computed:{entry(){return resourceEntries.find(x=>x.key===this.$route.meta.referenceKey)},view(){return views[this.entry.key]},base(){return this.$route.meta.portal==='cloud'?'/cloud/resources':'/operations/tools'}},methods:{t(k){return this.$t('resources.'+k)}}}
</script>
<style scoped lang="scss">
.reference-page {display:flex;flex-direction:column;height:100%;min-height:0;background:#091329;color:#fff;}.reference-header {display:flex;align-items:center;gap:20px;padding:16px 24px;background:#111827;border-bottom:1px solid #294e78;flex-shrink:0;}.reference-header>div {flex:1;}.reference-header h1 {font-size:21px;margin:0 0 6px;}.reference-header p {font-size:13px;margin:0;color:#a7c4fc;}.reference-notice {background:#18263c;color:#f3cc80;font-size:13px;line-height:1.7;padding:10px 24px;border-bottom:1px solid #34465d;flex-shrink:0;}.reference-content {flex:1;min-height:0;overflow:auto;position:relative;padding:16px;}.reference-content:has(>.wind3d-page),.reference-content:has(>.map-preview),.reference-content:has(>.other-mode),.reference-content:has(>.device-overview) {padding:0;}
.reference-header :deep(.el-tag) {opacity:1!important;transform:none!important;animation:none!important;transition:none!important;}
</style>
