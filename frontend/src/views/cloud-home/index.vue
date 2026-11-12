<template>
  <section class="portal-dashboard" v-loading="busy">
    <header class="portal-dashboard__hero"><div><p class="portal-eyebrow">APPLICATION STUDIO</p><h1>{{ t('welcome') }}，{{ identity?.displayName || identity?.username }}</h1><p>{{ t('cloudHomeIntro') }}</p></div><el-button type="primary" size="large" @click="go('generation')" data-testid="new-application">＋ {{ t('newApp') }}</el-button></header>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon/>
    <div class="portal-stat-grid"><article v-for="item in stats" :key="item.key" class="portal-stat"><span>{{ t(item.key) }}</span><strong>{{ busy ? '—' : item.value }}</strong></article></div>
    <section class="portal-flow"><h2>{{ t('flowTitle') }}</h2><div><button v-for="(step,index) in ['flow1','flow2','flow3','flow4']" :key="step" type="button" @click="go(index === 0 ? 'analysis' : 'generation')"><b>{{ '0' + (index+1) }}</b>{{ t(step) }}<span v-if="index < 3">→</span></button></div></section>
    <div class="portal-action-grid"><article v-for="item in actions" :key="item.tab" class="portal-action"><h2>{{ t(item.key) }}</h2><p>{{ t(item.hint) }}</p><el-button @click="go(item.tab)">{{ t('open') }} →</el-button></article></div>
    <section class="portal-panel"><div class="portal-section-title"><h2>{{ t('recentApps') }}</h2><el-button text @click="go('generation')">{{ t('viewApps') }} →</el-button></div><el-empty v-if="!jobs.length && !busy" :description="t('noApps')"/><el-table v-else :data="jobs.slice(0,5)" @row-click="openJob"><el-table-column :label="t('task')" show-overflow-tooltip><template #default="{row}"><strong>{{ row.plan?.title || (t('application') + ' · ' + row.id.slice(0,8)) }}</strong></template></el-table-column><el-table-column :label="t('status')"><template #default="{row}"><el-tag :type="row.status === 'ready' ? 'success' : row.status === 'failed' ? 'danger' : 'info'">{{ $te('workbench.'+row.status) ? $t('workbench.'+row.status) : row.status }}</el-tag></template></el-table-column><el-table-column><template #default="{row}"><el-button text @click.stop="openJob(row)">{{ t('viewApplication') }} →</el-button></template></el-table-column></el-table></section>
  </section>
</template>
<script>
import usePortalStore from '@/store/modules/portal'
import { wb } from '@/api/workbench'
export default {
  name: 'CloudHome',
  data() { return { datasets: [], jobs: [], busy: false, error: '', actions: [{key:'components',hint:'componentIntro',tab:'catalog'},{key:'workflow',hint:'workflowIntro',tab:'workflow'},{key:'collaborate',hint:'collaborationIntro',tab:'collaboration'}] } },
  computed: { identity() { return usePortalStore().cloud }, stats() { return [{key:'availableDatasets',value:this.datasets.length},{key:'generatedApps',value:this.jobs.length},{key:'readyApps',value:this.jobs.filter(j=>j.status==='ready').length},{key:'runningApps',value:this.jobs.filter(j=>j.deployment?.status==='running').length}] } },
  created() { this.load() },
  methods: { t(k) { return this.$t('portal.'+k) }, go(tab) { this.$router.push({path:'/cloud/workbench',query:{tab}}) }, openJob(job) { this.$router.push({path:'/cloud/workbench',query:{tab:'generation',job:job.id}}) }, async load() { this.busy=true;try { [this.datasets,this.jobs]=await Promise.all([wb('/datasets'),wb('/generation')]) } catch(e) { this.error=e.message } finally { this.busy=false } } }
}
</script>
