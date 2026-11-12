<template><section class="operations-analysis"><header class="portal-section-title"><div><p class="portal-eyebrow">OBSERVATION ANALYSIS</p><h1>{{ $t('portal.analysis') }}</h1><p class="portal-muted">{{ $t('portal.analysisIntro') }}</p></div><el-button @click="$router.push('/operations')">← {{ $t('portal.backOverview') }}</el-button></header><el-alert v-if="error" type="error" :title="error" :closable="false"/><analysis-panel :datasets="datasets"/></section></template>
<script>
import { wb } from '@/api/workbench'
import AnalysisPanel from '@/views/workbench/AnalysisPanel.vue'
export default { name:'OperationsAnalysis',components:{AnalysisPanel},data(){return{datasets:[],error:''}},created(){wb('/datasets').then(d=>this.datasets=d).catch(e=>this.error=e.message)} }
</script>
