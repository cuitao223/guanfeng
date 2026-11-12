<template>
  <div class="wb-page">
    <div class="wb-heading">
      <div><span class="wb-eyebrow">GUANFENG / WORKBENCH</span><h1>{{ t(tab) }}</h1><p>{{ $t('portal.' + ({generation:'generationHint',catalog:'catalogHint',workflow:'workflowHint',collaboration:'collaborationHint',analysis:'analysisHint'}[tab])) }}</p></div>
      <div class="wb-inline">
        <el-tag :type="health ? 'success' : 'danger'">{{ t(health ? 'connected' : 'offline') }}</el-tag>
        <el-tag v-if="session">{{ session.name }} · {{ session.role }}</el-tag>
        <el-button class="manage-toolbar-btn" @click="connect">{{ t('retry') }}</el-button>
        <el-select :model-value="$i18n.locale" class="query-item--w140" aria-label="Language" @change="setLanguage"><el-option label="中文" value="Cn"/><el-option label="English" value="En"/></el-select>
      </div>
    </div>
    <el-alert v-if="connectionError" type="error" :title="t('apiFailure')" :description="connectionError" show-icon :closable="false"/>
    <el-tabs v-model="tab" class="wb-tabs">
      <el-tab-pane v-for="item in tabs" :key="item" :name="item" :label="t(item)"/>
    </el-tabs>
    <div class="wb-content">
      <AnalysisPanel v-if="tab === 'analysis'" :datasets="datasets"/>
      <CatalogPanel v-if="tab === 'catalog'" :session="session" @changed="loadComponents"/>
      <WorkflowPanel v-show="tab === 'workflow'" ref="workflow" :active="tab === 'workflow'" :components="components" :datasets="datasets" :session="session" @conflict="tab = 'collaboration'"/>
      <CollaborationPanel v-if="tab === 'collaboration'" :session="session" @session="session = $event" @load="loadWorkflow"/>
      <GenerationPanel v-if="tab === 'generation'" :datasets="datasets" :health="health" :session="session" @edit-workflow="editGeneratedWorkflow"/>
    </div>
  </div>
</template>
<script>
import Cookies from 'js-cookie'
import { wb } from '@/api/workbench'
import AnalysisPanel from './AnalysisPanel.vue'
import CatalogPanel from './CatalogPanel.vue'
import WorkflowPanel from './WorkflowPanel.vue'
import CollaborationPanel from './CollaborationPanel.vue'
import GenerationPanel from './GenerationPanel.vue'
export default {
  name: 'WorkbenchPage', components: { AnalysisPanel, CatalogPanel, WorkflowPanel, CollaborationPanel, GenerationPanel },
  data() { return { tab: 'generation', tabs: ['analysis', 'catalog', 'workflow', 'collaboration', 'generation'], health: null, connectionError: '', datasets: [], components: [], session: null } },
  created() {
    this.tab = this.tabs.includes(this.$route.query.tab) ? this.$route.query.tab : 'generation'
    this.connect()
    try { this.session = JSON.parse(sessionStorage.getItem('guanfeng.project.session') || 'null') } catch { this.session = null }
    this.restoreProjectSession()
  },
  watch: {
    '$route.query.tab'(value) { if(this.tabs.includes(value)) this.tab = value },
    tab(value) { if(this.$route.query.tab !== value) this.$router.replace({ path: '/cloud/workbench', query: { ...this.$route.query, tab:value } }) },
    session(value) { if(value) sessionStorage.setItem('guanfeng.project.session', JSON.stringify(value)); else sessionStorage.removeItem('guanfeng.project.session') }
  },
  methods: {
    async restoreProjectSession() {
      if(this.session) { try { await wb('/projects/demo',{session:this.session.token}); return } catch { this.session=null } }
    },
    t(key) { return this.$t(`workbench.${key}`) },
    setLanguage(value) { Cookies.set('language', value); this.$i18n.locale = value },
    async connect() {
      this.connectionError = ''
      const results = await Promise.allSettled([wb('/health'), wb('/datasets'), wb('/components')])
      this.health = results[0].status === 'fulfilled' ? results[0].value : null
      if (results[1].status === 'fulfilled') this.datasets = results[1].value || []
      if (results[2].status === 'fulfilled') this.components = results[2].value || []
      this.connectionError = results.map((r, i) => r.status === 'rejected' ? `${['/health', '/datasets', '/components'][i]}: ${r.reason.message}` : '').filter(Boolean).join(' · ')
    },
    async loadComponents() { try { this.components = await wb('/components') || [] } catch (e) { this.connectionError = e.message } },
    async editGeneratedWorkflow(payload) {
      if(this.session?.role !== 'editor'){this.connectionError=this.t('generatedWorkflowEditorRequired');return}
      try {
        if(await this.$refs.workflow.importGeneratedDraft(payload)){this.connectionError='';this.tab='workflow'}
      }catch(e){this.connectionError=e.message}
    },
    async loadWorkflow() { this.tab = 'workflow'; await this.$nextTick(); this.$refs.workflow.loadProject() }
  }
}
</script>
