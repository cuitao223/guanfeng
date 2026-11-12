<template>
  <section class="wb-card wb-workflow-results" data-testid="workflow-results">
    <h2>{{ t('result') }}</h2>
    <template v-if="chart">
      <h3>{{ chartTitle }}</h3>
      <el-alert v-if="!validChart" :title="t('workflowInvalidChart')" type="warning" :closable="false" show-icon/>
      <template v-else>
        <p v-if="chart.kind === 'scan'" class="wb-muted">{{ t('workflowScanHint') }} | {{ t('workflowPitch') }}: {{ number(chartData.pitch) }}&#176;</p>
        <p v-if="chart.kind === 'grid'" class="wb-muted">{{ t('workflowGridHint') }} | {{ grid.xName || 'X' }} ({{ grid.xUnit || '' }}) | {{ grid.yName || 'Y' }} ({{ grid.yUnit || '' }})</p>
        <div v-if="chart.kind === 'profile'" class="wb-workflow-chart" data-testid="workflow-profile-chart">
          <HarnessBarbThiChart :times="chartData.times" :height-arr="chartData.heightArr" :values="chartData.values" :dirs="chartData.dirs" :unit="chartData.unit || ''" :title="chartTitle" :breakpoints="colorRange" :colors="colors" theme="dark"/>
        </div>
        <div v-else-if="chart.kind === 'scan'" class="wb-workflow-chart" data-testid="workflow-scan-chart">
          <ScanChart mode="ppi" :angles="chartData.angles" :height-arr="chartData.heightArr" :values="chartData.values" :max-range="scanRange" :unit="chartData.unit || ''" :title="chartTitle" :breakpoints="colorRange" :colors="colors" theme="dark"/>
        </div>
        <div v-else class="wb-workflow-grid" data-testid="workflow-grid-chart">
          <svg v-if="hasValues" viewBox="0 0 860 490" role="img" :aria-label="chartTitle">
            <title>{{ chartTitle }}</title>
            <desc>{{ t('workflowGridHint') }}</desc>
            <rect x="80" y="20" width="720" height="380" fill="#101d38"/>
            <rect v-for="cell in gridCells" :key="cell.key" :x="cell.x" :y="cell.y" :width="cell.width" :height="cell.height" :fill="cell.fill">
              <title>{{ `x: ${cell.sourceX}, y: ${cell.sourceY} | ${cell.value === null ? t('workflowMissing') : number(cell.value)} ${grid.unit || ''}` }}</title>
            </rect>
            <path d="M80 20 V400 H800" fill="none" stroke="currentColor"/>
            <g v-for="tick in xTicks" :key="`x-${tick.index}`">
              <line :x1="tick.position" :x2="tick.position" y1="400" y2="406" stroke="currentColor"/>
              <text :x="tick.position" y="425" text-anchor="middle">{{ number(tick.value) }}</text>
            </g>
            <g v-for="tick in yTicks" :key="`y-${tick.index}`">
              <line x1="74" x2="80" :y1="tick.position" :y2="tick.position" stroke="currentColor"/>
              <text x="68" :y="tick.position + 4" text-anchor="end">{{ number(tick.value) }}</text>
            </g>
            <text x="820" y="404">x</text><text x="76" y="12">y</text>
            <g v-for="(color,index) in legendColors" :key="index"><rect :x="180 + index * 5" y="450" width="5.1" height="12" :fill="color"/></g>
            <text x="170" y="461" text-anchor="end">{{ number(valueRange[0]) }}</text>
            <text x="510" y="461">{{ number(valueRange[1]) }} {{ grid.unit || '' }}</text>
            <rect x="650" y="450" width="12" height="12" fill="#263b60"/><text x="670" y="461">{{ t('workflowMissing') }}</text>
          </svg>
          <el-empty v-if="!hasValues" :description="t('empty')"/>
        </div>
      </template>
      <div v-if="summary" class="wb-metrics">
        <div v-for="(value,key) in summary" :key="key" class="wb-metric"><span>{{ metricLabel(key) }}</span><strong>{{ display(value) }}</strong></div>
      </div>
      <el-collapse v-if="chartData.provenance || chartData.quality">
        <el-collapse-item :title="t('quality')"><pre class="wb-json">{{ json({quality: chartData.quality, provenance: chartData.provenance}) }}</pre></el-collapse-item>
      </el-collapse>
    </template>
    <el-empty v-else :description="t('workflowNoChart')"/>
    <template v-if="showExports">
    <h3>{{ t('workflowExports') }}</h3>
    <el-table v-if="exports.length" :data="exports" class="panel-table" data-testid="workflow-exports">
      <el-table-column prop="name" :label="t('name')" min-width="180"/>
      <el-table-column prop="format" :label="t('format')" width="90"/>
      <el-table-column prop="bytes" :label="t('workflowBytes')" width="110"/>
      <el-table-column prop="sha256" label="SHA-256" min-width="240"><template #default="{row}"><code class="wb-workflow-hash">{{ row.sha256 }}</code></template></el-table-column>
      <el-table-column :label="t('workflowDownload')" width="140"><template #default="{row}"><el-button class="manage-toolbar-btn" :loading="downloading.includes(row.url)" :disabled="!validExport(row)" @click="downloadExport(row)">{{ t('workflowDownload') }}</el-button></template></el-table-column>
    </el-table>
    <el-empty v-else :description="t('workflowNoExports')"/>
    </template>
  </section>
</template>
<script>
import HarnessBarbThiChart from '@leice-charts/barb-thi/assets/src/BarbThiChart.vue'
import ScanChart from '@leice-charts/scan/assets/src/ScanChart.vue'
import { exportFile } from '@/api/workbench'

export default {
  name: 'WorkflowResultPanel',
  components: { HarnessBarbThiChart, ScanChart },
  props: { result: { type: Object, default: () => ({}) }, session: Object, showExports: { type: Boolean, default: true } },
  data() { return { downloading: [], colors: ['#73c9ff', '#f7bf65'] } },
  computed: {
    chart() { return this.result.chart && typeof this.result.chart === 'object' ? this.result.chart : null },
    chartData() { return this.chart?.data || {} },
    chartTitle() { return this.t({ profile: 'chart', scan: 'scan', grid: 'workflowGridTitle' }[this.chart?.kind] || 'result') },
    grid() { return this.chartData.grid || {} },
    exports() { return Array.isArray(this.result.exports) ? this.result.exports : [] },
    summary() { return this.chartData.summary && typeof this.chartData.summary === 'object' ? this.chartData.summary : null },
    validChart() {
      const d = this.chartData
      if (this.chart?.kind === 'grid') {
        return this.validAxis(this.grid.x) && this.validAxis(this.grid.y) && this.matrix(this.grid.values, this.grid.y.length, this.grid.x.length)
      }
      if (!['profile', 'scan'].includes(this.chart?.kind) || !Array.isArray(d.heightArr) || !d.heightArr.length) return false
      const rows = this.chart.kind === 'profile' ? d.times : d.angles
      return Array.isArray(rows) && rows.length > 0 && this.matrix(d.values, rows.length, d.heightArr.length) && (this.chart.kind !== 'profile' || this.matrix(d.dirs, rows.length, d.heightArr.length))
    },
    valueRange() {
      if (!this.validChart) return [0, 0]
      const rows = this.chart.kind === 'grid' ? this.grid.values : this.chartData.values
      let min = Infinity, max = -Infinity
      for (const row of rows) for (const value of row) {
        if (!this.isValue(value)) continue
        min = Math.min(min, value); max = Math.max(max, value)
      }
      return min === Infinity ? [0, 0] : [min, max]
    },
    hasValues() { return this.validChart && this.grid.values?.some(row => row.some(value => this.isValue(value))) },
    colorRange() { const [min, max] = this.valueRange; return min === max ? [min - 0.5, max + 0.5] : [min, max] },
    scanRange() { return Math.max(1, ...(this.chartData.heightArr || []).filter(Number.isFinite)) },
    gridLayout() {
      if (!this.validChart || this.chart.kind !== 'grid') return null
      return { x: this.axisLayout(this.grid.x, 80, 720, false), y: this.axisLayout(this.grid.y, 20, 380, true) }
    },
    gridCells() {
      if (!this.gridLayout) return []
      return this.grid.y.flatMap((y,j) => this.grid.x.map((x,i) => {
        const a = this.gridLayout.x, b = this.gridLayout.y, raw = this.grid.values[j][i], value = this.isValue(raw) ? raw : null
        return { key: `${j}-${i}`, sourceX: x, sourceY: y, value,
          x: Math.min(a.edges[i], a.edges[i+1]), y: Math.min(b.edges[j], b.edges[j+1]),
          width: Math.abs(a.edges[i+1] - a.edges[i]), height: Math.abs(b.edges[j+1] - b.edges[j]), fill: value === null ? '#263b60' : this.gridColor(value) }
      }))
    },
    xTicks() { return this.gridLayout ? this.axisTicks(this.grid.x, this.gridLayout.x.centers) : [] },
    yTicks() { return this.gridLayout ? this.axisTicks(this.grid.y, this.gridLayout.y.centers) : [] },
    legendColors() { const [min,max] = this.valueRange; return Array.from({length: 64}, (_,i) => this.gridColor(min + (max-min)*i/63)) }
  },
  methods: {
    t(key) { return this.$t(`workbench.${key}`) },
    json(value) { return JSON.stringify(value, null, 2) },
    number(value) { return Number.isFinite(value) ? (Number.isInteger(value) ? value : Number(value.toPrecision(6))) : '\u2014' },
    display(value) { return typeof value === 'number' ? this.number(value) : value === null ? '\u2014' : typeof value === 'object' ? this.json(value) : String(value) },
    metricLabel(key) { return this.$te(`workbench.${key}`) ? this.t(key) : key },
    matrix(value, rows, columns) { return Array.isArray(value) && value.length === rows && value.every(row => Array.isArray(row) && row.length === columns) },
    validAxis(axis) { return Array.isArray(axis) && axis.length > 0 && axis.every(Number.isFinite) && (axis.length === 1 || axis.every((v,i) => i === 0 || (axis[1] > axis[0] ? v > axis[i-1] : v < axis[i-1]))) },
    isValue(value) {
      if (!Number.isFinite(value)) return false
      if (this.chart?.kind === 'grid') {
        const missingValue = Number.isFinite(this.grid.missingValue) ? this.grid.missingValue : 999
        return value !== 999 && value !== missingValue
      }
      return value !== 999 && value > -999
    },
    axisLayout(axis, offset, size, reverse) {
      const edges = axis.length === 1 ? [axis[0]-0.5, axis[0]+0.5] : [axis[0]-(axis[1]-axis[0])/2, ...axis.slice(1).map((v,i) => (v+axis[i])/2), axis.at(-1)+(axis.at(-1)-axis.at(-2))/2]
      const min = Math.min(edges[0], edges.at(-1)), max = Math.max(edges[0], edges.at(-1))
      const scale = value => offset + (reverse ? 1-(value-min)/(max-min) : (value-min)/(max-min))*size
      return { edges: edges.map(scale), centers: axis.map(scale) }
    },
    axisTicks(axis, centers) { const step = Math.max(1, Math.ceil((axis.length-1)/5)); return axis.flatMap((value,index) => index % step === 0 || index === axis.length-1 ? [{index, value, position: centers[index]}] : []) },
    gridColor(value) { const [min,max] = this.valueRange; const ratio = max === min ? 0.5 : Math.max(0,Math.min(1,(value-min)/(max-min))); return `hsl(${220-200*ratio}, 75%, 58%)` },
    validExport(file) {
      if (!file || typeof file.name !== 'string' || typeof file.url !== 'string' || !/^\/api\/wb\/workflow\/exports\/[A-Za-z0-9_-]+\/[^/?#]+$/.test(file.url)) return false
      try { const name = decodeURIComponent(file.url.split('/').at(-1)); return name === file.name && !['.', '..'].includes(name) && !/[\/\\\x00-\x1f]/.test(name) } catch { return false }
    },
    async downloadExport(file) {
      if (!this.validExport(file) || this.downloading.includes(file.url)) return
      this.downloading.push(file.url)
      try { await exportFile(file.url.slice('/api/wb'.length), undefined, file.name, this.session?.token) }
      finally { this.downloading = this.downloading.filter(url => url !== file.url) }
    }
  }
}
</script>
<style lang="scss" scoped>
.wb-workflow-results { min-width: 0; }
.wb-workflow-chart { height: 520px; min-height: 320px; }
.wb-workflow-grid { overflow-x: auto; color: #a7c4fc; }
.wb-workflow-grid svg { width: 100%; min-width: 600px; display: block; }
.wb-workflow-grid text { font-size: 12px; fill: currentColor; }
.wb-workflow-hash { white-space: normal; overflow-wrap: anywhere; }
</style>
