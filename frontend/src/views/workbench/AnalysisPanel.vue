<template>
  <section class="wb-section" v-loading="busy">
    <div class="wb-card">
      <el-form :model="query" inline class="panel-filter" @submit.prevent="analyze">
        <el-form-item :label="t('dataset')"><el-select v-model="query.datasetId" class="query-item--w220" filterable @change="readDataset"><el-option v-for="d in datasets" :key="d.id" :value="d.id" :label="d.name || d.id"/></el-select></el-form-item>
        <template v-if="!isGrid && !isScan">
          <el-form-item :label="t('heightMin')"><el-input-number v-model="query.heightMin" class="query-item--w140" :controls="false"/></el-form-item>
          <el-form-item :label="t('heightMax')"><el-input-number v-model="query.heightMax" class="query-item--w140" :controls="false"/></el-form-item>
          <el-form-item :label="t('threshold')"><el-input-number v-model="query.threshold" :min="0" :max="150" :step="0.01" class="query-item--w140" :controls="false"/></el-form-item>
          <el-form-item :label="t('start')"><el-input v-model="query.start" class="query-item--w220" placeholder="YYYY-MM-DD HH:mm:ss"/></el-form-item>
          <el-form-item :label="t('end')"><el-input v-model="query.end" class="query-item--w220" placeholder="YYYY-MM-DD HH:mm:ss"/></el-form-item>
          <el-form-item><el-checkbox v-model="query.rejectInvalidDirection">{{ t('rejectInvalidDirection') }}</el-checkbox></el-form-item>
          <el-button type="primary" native-type="submit" :disabled="!query.datasetId" data-testid="analyze">{{ t('analyze') }}</el-button>
        </template>
      </el-form>
      <div v-if="selected" class="wb-inline wb-muted"><el-tag>{{ selected.format }}</el-tag><span>{{ t('source') }}: {{ selected.source || t('unspecified') }}</span><span>{{ selected.timeStart }} · {{ selected.timeEnd }}</span></div>
    </div>
    <el-alert v-if="error" type="error" :title="error" :closable="false" show-icon/>
    <template v-if="isGrid && detail?.grid">
      <WorkflowResultPanel :result="{chart:{kind:'grid',data:detail}}" :show-exports="false"/>
      <div class="wb-card">
        <h2>{{ t('grid') }} · {{ detail.grid.variable }} ({{ detail.grid.unit }})</h2>
        <p class="wb-muted">{{ t('gridHint') }}</p>
        <el-table :data="gridRows.slice((gridPage-1)*50,gridPage*50)" stripe><el-table-column prop="x" :label="`${detail.grid.xName || 'X'} (${detail.grid.xUnit || ''})`"/><el-table-column prop="y" :label="`${detail.grid.yName || 'Y'} (${detail.grid.yUnit || ''})`"/><el-table-column prop="value" :label="`${t('variable')} (${detail.grid.unit || ''})`"/></el-table>
        <el-pagination v-model:current-page="gridPage" :page-size="50" :total="gridRows.length" layout="total, prev, pager, next"/>
        <pre class="wb-json">{{ json(detail.summary) }}</pre>
      </div>
    </template>
    <div v-else-if="isScan && detail" class="wb-card"><h2>{{ t('scan') }}</h2><div class="wb-chart"><ScanChart mode="ppi" :angles="detail.angles || []" :height-arr="detail.heightArr || []" :values="detail.values || []" :unit="detail.unit || 'm/s'" :max-range="Math.max(...(detail.heightArr || [15000]))" :breakpoints="[-15,0,15]" :colors="['#57aaff','#eef2ff','#fb8b64']" theme="dark"/></div><pre class="wb-json">{{ json(detail.provenance || selected) }}</pre></div>
    <template v-else-if="analysis">
      <el-alert :title="t('analysisHint')" type="info" :closable="false" show-icon/>
      <div class="wb-metrics"><div v-for="key in metrics" :key="key" class="wb-metric"><span class="wb-muted">{{ t(key) }}</span><strong>{{ number(analysis.summary?.[key]) }}</strong></div></div>
      <div class="wb-card">
        <div class="wb-toolbar">
          <el-radio-group v-model="app"><el-radio-button value="wind">{{ t('windApp') }}</el-radio-button><el-radio-button value="compare">{{ t('compareApp') }}</el-radio-button></el-radio-group>
          <el-button class="manage-toolbar-btn" :disabled="stale" @click="exportAnalysis('csv')">{{ t('exportCsv') }}</el-button>
          <el-button class="manage-toolbar-btn" :disabled="stale" @click="exportAnalysis('html')">{{ t('exportHtml') }}</el-button>
          <el-tag v-if="stale" type="warning">{{ t('stale') }}</el-tag>
        </div>
        <h2>{{ t(app === 'wind' ? 'chart' : 'compare') }}</h2>
        <el-select v-if="app === 'compare'" v-model="timeIndexes" multiple class="query-item--w220" :placeholder="t('timeSamples')"><el-option v-for="(time,i) in analysis.times" :key="i" :label="String(time)" :value="i"/></el-select>
        <div class="wb-chart">
          <BarbThiChart v-if="app === 'wind'" :times="analysis.times || []" :height-arr="analysis.heightArr || []" :values="analysis.values || []" :dirs="analysis.dirs || []" :unit="analysis.unit || 'm/s'" :height-min="applied.heightMin" :height-max="applied.heightMax" :breakpoints="[0,5,10,15,25]" :colors="['#6fe5d1','#73c9ff','#5682ed','#e7b456','#f8756f']" theme="dark"/>
          <CompareProfileChart v-else :series="comparison" :height-min="applied.heightMin" :height-max="applied.heightMax" :unit="analysis.unit || 'm/s'" :title="t('compare')" theme="dark"/>
        </div>
      </div>
      <div class="wb-two">
        <div class="wb-card"><h2>{{ t('events') }}</h2><el-table :data="eventRows.slice((eventPage-1)*10,eventPage*10)" stripe><el-table-column prop="start" :label="t('start')"/><el-table-column prop="end" :label="t('end')"/><el-table-column prop="peak" :label="t('peak')"/><el-table-column :label="t('heights')"><template #default="{row}">{{ (row.heights || []).join(', ') }}</template></el-table-column><el-table-column type="expand"><template #default="{row}"><pre class="wb-json">{{ json(row.records) }}</pre></template></el-table-column></el-table><el-pagination v-model:current-page="eventPage" :page-size="10" :total="eventRows.length" layout="total, prev, pager, next"/></div>
        <div class="wb-card"><h2>{{ t('quality') }}</h2><pre class="wb-json">{{ json(analysis.quality) }}</pre><pre class="wb-json">{{ json(analysis.provenance) }}</pre></div>
      </div>
    </template>
    <el-empty v-else :description="t('empty')"/>
  </section>
</template>
<script>
import { wb, exportFile } from '@/api/workbench'
import WorkflowResultPanel from './WorkflowResultPanel.vue'
import BarbThiChart from '@leice-charts/barb-thi/assets/src/BarbThiChart.vue'
import ScanChart from '@leice-charts/scan/assets/src/ScanChart.vue'
import CompareProfileChart from '@leice-charts/profile-compare/assets/src/CompareProfileChart.vue'
export default {
  name: 'WorkbenchAnalysis', components: { BarbThiChart, ScanChart, CompareProfileChart, WorkflowResultPanel }, props: { datasets: { type: Array, default: () => [] } },
  data() { return { query: { datasetId: '', heightMin: 127, heightMax: 500, threshold: 10, start: '', end: '', rejectInvalidDirection: true }, busy: false, error: '', detail: null, analysis: null, applied: {}, appliedKey: '', app: 'wind', timeIndexes: [], gridPage: 1, eventPage: 1, sequence: 0, metrics: ['mean','max','validCount','missingCount','exceedCount'] } },
  computed: {
    selected() { return this.datasets.find(d => d.id === this.query.datasetId) },
    isGrid() { return this.selected?.kind === 'grid' || ['netcdf','grib'].includes(this.selected?.format) },
    isScan() { return this.selected?.kind === 'scan' || this.selected?.format === 'radar-ppi' },
    stale() { return this.appliedKey !== JSON.stringify(this.query) },
    eventRows() { return this.analysis?.events || [] },
    gridRows() { const g = this.detail?.grid; if (!g) return []; return (g.y || []).flatMap((y,j) => (g.x || []).map((x,i) => ({ x, y, value: g.values?.[j]?.[i] ?? '—' }))) },
    comparison() { return this.timeIndexes.map(i => ({ key: String(i), name: String(this.analysis.times[i]), heightArr: this.analysis.heightArr, value: this.analysis.values[i] || [] })) }
  },
  watch: { datasets: { immediate: true, handler(items) { if (!this.query.datasetId && items.length) { this.query.datasetId = items[0].id; this.readDataset() } } } },
  methods: {
    t(key) { return this.$t(`workbench.${key}`) }, json(value) { return JSON.stringify(value ?? {}, null, 2) },
    number(value) { return Number.isFinite(value) ? (Number.isInteger(value) ? value : value.toFixed(2)) : '—' },
    async readDataset() {
      const seq = ++this.sequence; this.detail = null; this.analysis = null; this.error = ''; this.busy = true; this.gridPage = 1
      try { const data = await wb(`/datasets/${encodeURIComponent(this.query.datasetId)}`, {timeout:120000}); if (seq === this.sequence) this.detail = data } catch (e) { if (seq === this.sequence) this.error = e.message } finally { if (seq === this.sequence) this.busy = false }
    },
    async analyze() {
      if (!this.query.datasetId || !Number.isFinite(this.query.heightMin) || !Number.isFinite(this.query.heightMax) || this.query.heightMin >= this.query.heightMax || (this.query.start && this.query.end && this.query.start > this.query.end)) { this.error = this.t('analysisRequired'); return }
      const seq = ++this.sequence; const snapshot = { ...this.query }; this.busy = true; this.error = ''
      try { const data = await wb('/analysis', { method: 'post', data: snapshot }); if (seq !== this.sequence) return; this.analysis = data; this.applied = snapshot; this.appliedKey = JSON.stringify(snapshot); this.eventPage = 1; this.timeIndexes = [...new Set([0, Math.floor((data.times?.length || 1)/2), (data.times?.length || 1)-1])].filter(i => data.times?.[i] !== undefined) } catch (e) { if (seq === this.sequence) this.error = e.message } finally { if (seq === this.sequence) this.busy = false }
    },
    exportAnalysis(format) { return exportFile('/analysis/export', { ...this.applied, format }, `guanfeng-analysis.${format}`) }
  }
}
</script>
