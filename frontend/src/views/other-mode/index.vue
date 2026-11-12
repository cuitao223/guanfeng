<template>
  <div class="other-mode">
    <header class="other-mode__bar">
      <label class="filter-field">
        <span>{{ $t('otherMode.device') }}</span>
        <el-select v-model="deviceNos" multiple collapse-tags filterable>
          <el-option v-for="item in devices" :key="item.deviceNo" :label="item.label" :value="item.deviceNo" />
        </el-select>
      </label>
      <label class="filter-field">
        <span>{{ $t('otherMode.product') }}</span>
        <el-select v-model="products" multiple collapse-tags>
          <el-option v-for="item in productOptions" :key="item" :label="$t('otherMode.products.' + item)" :value="item" />
        </el-select>
      </label>
      <label class="filter-field filter-field--time">
        <span>{{ $t('otherMode.timeRange') }}</span>
        <el-date-picker
          v-model="timeRange"
          type="datetimerange"
          value-format="YYYY-MM-DD HH:mm:ss"
          :disabled="realtime"
          :clearable="false"
          :shortcuts="shortcuts"
          @change="onTimeChange"
        />
      </label>
      <el-switch
        v-model="realtime"
        :inactive-text="$t('otherMode.history')"
        :active-text="$t('otherMode.realtime')"
        @change="onModeChange"
      />
    </header>

    <div class="other-mode__body">
      <section class="chart-column">
        <p v-if="!cards.length" class="chart-empty">{{ $t('otherMode.emptyChart') }}</p>
        <article v-for="card in cards" :key="card.key" class="chart-card" :class="{ 'is-rhi': card.kind === 'rhi' }">
          <div v-if="card.kind === 'rhi'" class="rhi-board">
            <aside class="rhi-files">
              <header>{{ $t('otherMode.rhi.fileTitle') }} {{ card.device.label }}</header>
              <div class="rhi-files__sort">
                <span>{{ $t('otherMode.rhi.sort') }}</span>
                <el-select
                  :model-value="panel(card.device.deviceNo).order"
                  @change="setOrder(card.device.deviceNo, $event)"
                >
                  <el-option value="time" :label="$t('otherMode.rhi.timeOrder')" />
                  <el-option value="reverse" :label="$t('otherMode.rhi.reverseOrder')" />
                </el-select>
              </div>
              <p v-if="!sortedFiles(card.device.deviceNo).length" class="rhi-files__empty">{{ $t('otherMode.rhi.emptyFiles') }}</p>
              <div v-else class="rhi-files__list">
                <button
                  v-for="file in sortedFiles(card.device.deviceNo)"
                  :key="file.id"
                  type="button"
                  class="rhi-file"
                  :class="{ 'is-active': file.id === panel(card.device.deviceNo).fileId }"
                  @click="pickFile(card.device.deviceNo, file)"
                >{{ file.name }}</button>
              </div>
            </aside>
            <div class="rhi-main">
              <div class="rhi-switch">
                <el-radio-group
                  :model-value="panel(card.device.deviceNo).type"
                  @change="setType(card.device.deviceNo, $event)"
                >
                  <el-radio-button v-for="item in rhiTypes" :key="item" :value="item">{{ $t('otherMode.rhi.types.' + item) }}</el-radio-button>
                </el-radio-group>
              </div>
              <div class="chart-plot">
                <scan-chart
                  mode="rhi"
                  :title="card.device.label"
                  :angles="rhiViews[card.device.deviceNo].angles"
                  :height-arr="rhiViews[card.device.deviceNo].heightArr"
                  :values="rhiViews[card.device.deviceNo].values"
                  :max-range="rhiViews[card.device.deviceNo].maxRange"
                  :unit="rhiViews[card.device.deviceNo].unit"
                  theme="dark"
                  color-mode="threshold"
                  :breakpoints="scanScale.breakpoints"
                  :colors="scanScale.colors"
                />
              </div>
            </div>
          </div>
          <template v-else>
            <header>{{ card.title }}</header>
            <div class="chart-plot">
              <barb-thi-chart
                v-if="card.kind === 'barb'"
                :times="card.series.times"
                :height-arr="card.series.heightArr"
                :values="card.series.values"
                :dirs="card.series.dirs"
                unit="m/s"
                theme="dark"
                :color-mode="card.scale.mode"
                :breakpoints="card.scale.breakpoints"
                :colors="card.scale.colors"
              />
              <thi-chart
                v-else
                :times="card.series.times"
                :height-arr="card.series.heightArr"
                :values="card.series.values"
                :unit="card.unit"
                theme="dark"
                :color-mode="card.scale.mode"
                :breakpoints="card.scale.breakpoints"
                :colors="card.scale.colors"
              />
            </div>
          </template>
        </article>
      </section>

      <section class="map-column">
        <real-map
          class="other-mode__map"
          :tile-url="tileUrl"
      :map-type="mapType"
      :note="$t('realMap.preview')"
          :center="mapView.center"
          :zoom="mapView.zoom"
          :min-zoom="mapView.minZoom"
          :max-zoom="mapView.maxZoom"
          :max-bounds="mapView.maxBounds"
        >
          <device-markers :devices="mapDevices" :active-ids="deviceNos" @toggle="onMarkerToggle" />
        </real-map>
        <div class="map-tools">
          <span>{{ $t('otherMode.mapType') }}</span>
          <el-radio-group v-model="mapType">
            <el-radio value="vector">{{ $t('otherMode.vector') }}</el-radio>
            <el-radio value="satellite">{{ $t('otherMode.satellite') }}</el-radio>
          </el-radio-group>
          <label class="tile-field">
            <span>{{ $t('otherMode.tileUrl') }}</span>
            <el-input v-model="tileUrl" clearable />
          </label>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { ElMessage } from 'element-plus'
import { BarbThiChart } from '@leice-charts/barb-thi/assets/src'
import barbMock from '@leice-charts/barb-thi/assets/examples/wind.json'
import { ScanChart } from '@leice-charts/scan/assets/src'
import { ThiChart } from '@leice-charts/thi/assets/src'
import thiMock from '@leice-charts/thi/assets/examples/test.json'
import { verticalWindBreakpoints, verticalWindColors } from '@leice-charts/thi/assets/examples/verticalWindScale'
import RealMap from '@/components/RealMap/index.vue'
import DeviceMarkers from '@leice-map-2d/assets/layers/DeviceMarkers.vue'
import { listOtherModeDevices, listRhiFiles, readRhiScan } from '@/api/map/otherMode'
import rhiSample from './rhi-sample.json'
import 'leaflet/dist/leaflet.css'

const PRODUCTS = ['rhi', 'barb', 'vertical', 'snr']
const RHI_TYPES = ['wind', 'snr', 'width', 'intensity']
const GATES = [500, 1500, 3000, 4500, 6000]
const ELEVATIONS = [0, 10, 20, 30, 45, 60, 75, 90]
const SCAN_SCALE = {
  mode: 'threshold',
  breakpoints: [0, 2, 4, 6, 8, 10, 12],
  colors: ['#313695', '#74add1', '#abd9e9', '#fee090', '#fdae61', '#d73027']
}
const BARB_SCALE = {
  mode: 'threshold',
  breakpoints: [0, 2, 4, 6, 8, 10, 12, 14, 18],
  colors: ['#d0e6f5', '#74add1', '#abd9e9', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
}
const VERTICAL_SCALE = {
  mode: 'threshold',
  breakpoints: verticalWindBreakpoints,
  colors: verticalWindColors
}
const SNR_SCALE = {
  mode: 'linear',
  breakpoints: [0, 4, 8],
  colors: ['#1d4e89', '#7eb6d9', '#f2e6c2']
}
const DAY_MS = 24 * 60 * 60 * 1000

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatTime(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
}

function recentRange(hours) {
  const end = new Date()
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000)
  return [formatTime(start), formatTime(end)]
}

function previewDevices() {
  return [
    { deviceNo: 'WM-01', label: 'WM-01', latitude: null, longitude: null, status: 2 },
    { deviceNo: 'WM-02', label: 'WM-02', latitude: null, longitude: null, status: 2 },
    { deviceNo: 'WM-03', label: 'WM-03', latitude: null, longitude: null, status: 4 },
    { deviceNo: 'WM-04', label: 'WM-04', latitude: null, longitude: null, status: 1 }
  ]
}

function normalizeDevice(row, index) {
  const latitude = Number(row.latitude != null ? row.latitude : row.lat)
  const longitude = Number(row.longitude != null ? row.longitude : row.lng)
  const deviceNo = row.deviceNo || row.stationNo || ('D-' + index)
  return {
    deviceNo,
    label: row.alias || row.deviceName || deviceNo,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    status: Number(row.status) || 2
  }
}

function thiSpec(kind) {
  if (kind === 'barb') {
    const data = barbMock.data
    return {
      unit: 'm/s',
      scale: BARB_SCALE,
      series: {
        times: data.timeAxis,
        heightArr: data.heightAxis,
        values: data.windSpeed,
        dirs: data.windDir
      }
    }
  }
  const data = thiMock.data
  const snr = kind === 'snr'
  return {
    unit: snr ? '' : 'm/s',
    scale: snr ? SNR_SCALE : VERTICAL_SCALE,
    series: {
      times: data.timeAxis,
      heightArr: data.heightAxis,
      values: data.values,
      dirs: []
    }
  }
}

function rhiSeries(kind, seed) {
  const shift = Number(seed) || 0
  const scale = kind === 'snr' ? 4 : kind === 'width' ? 0.35 : kind === 'intensity' ? 2.4 : 1
  const base = kind === 'width' ? 0.2 : kind === 'snr' ? 6 : 2
  const values = ELEVATIONS.map((angle, angleIndex) => GATES.map((gate, gateIndex) => {
    return Math.round((base + (angleIndex + shift) * 0.35 * scale + gateIndex * 0.8 * scale + angle / 80) * 10) / 10
  }))
  return { angles: ELEVATIONS, heightArr: GATES, values, maxRange: 6500, unit: kind === 'wind' || kind === 'width' ? 'm/s' : '' }
}

function previewFiles(deviceNo, startText, endText) {
  const start = new Date(String(startText).replace(/-/g, '/')).getTime()
  const end = new Date(String(endText).replace(/-/g, '/')).getTime()
  const origin = Number.isFinite(start) ? start : Date.now() - DAY_MS
  const span = Number.isFinite(end - origin) ? Math.max(end - origin, 60 * 1000) : DAY_MS
  const files = []
  for (let index = 0; index < 6; index += 1) {
    const time = formatTime(new Date(origin + (span * index) / 5))
    files.push({ id: deviceNo + '-' + index, name: time, time, filePath: '' })
  }
  return files
}

function normalizeFile(row, index, deviceNo) {
  const name = row.name || row.fileName || row.filePath || ('RHI-' + (index + 1))
  const time = row.time || row.dataTime || row.startTime || name
  return {
    id: String(row.id || row.filePath || (deviceNo + '-' + index)),
    name: String(name),
    time: String(time),
    filePath: row.filePath || ''
  }
}

function orderFiles(files, order) {
  const list = (files || []).slice().sort((left, right) => String(left.time).localeCompare(String(right.time)))
  if (order === 'reverse') list.reverse()
  return list
}

function scanFromPayload(data) {
  if (!data || !Array.isArray(data.heightArr) || !Array.isArray(data.pitch)) return null
  const heightArr = data.heightArr.map(Number).filter((item) => Number.isFinite(item))
  const angles = data.pitch.map(Number).filter((item) => Number.isFinite(item))
  if (!heightArr.length || !angles.length || !Array.isArray(data.speedArr)) return null
  const last = heightArr[heightArr.length - 1]
  return {
    angles,
    heightArr,
    maxRange: Number.isFinite(last) && last > 0 ? last : 6500,
    values: {
      wind: data.speedArr,
      snr: data.snrArr,
      width: data.spectralWidth,
      intensity: data.spectralIntensity
    }
  }
}

const SAMPLE_SCAN = scanFromPayload(rhiSample.data)

function scanView(scan, type) {
  const matrix = scan && scan.values ? scan.values[type] : null
  if (!scan || !Array.isArray(matrix) || !matrix.length) return null
  return {
    angles: scan.angles,
    heightArr: scan.heightArr,
    values: matrix,
    maxRange: scan.maxRange,
    unit: type === 'wind' || type === 'width' ? 'm/s' : ''
  }
}

export default {
  name: 'OtherModePage',
  props: { referenceMode: { type:Boolean,default:false } },
  components: { BarbThiChart, DeviceMarkers, RealMap, ScanChart, ThiChart },
  data() {
    return {
      scanScale: SCAN_SCALE,
      devices: previewDevices(),
      deviceNos: ['WM-01'],
      products: ['barb', 'rhi'],
      productOptions: PRODUCTS,
      rhiTypes: RHI_TYPES,
      rhiPanels: {},
      rhiFiles: {},
      rhiScans: {},
      timeRange: recentRange(24),
      previousRange: recentRange(24),
      realtime: false,
      tileUrl: '',
      mapType: 'satellite',
      mapView: {
        center: [35, 105],
        zoom: 4,
        minZoom: 2,
        maxZoom: 18,
        maxBounds: [[-85, -180], [85, 180]]
      }
    }
  },
  computed: {
    shortcuts() {
      const items = [
        ['h1', 1],
        ['h2', 2],
        ['h4', 4],
        ['h12', 12],
        ['d1', 24],
        ['d3', 72]
      ]
      return items.map(([key, hour]) => ({
        text: this.$t('otherMode.shortcuts.' + key),
        value: () => {
          const end = new Date()
          return [new Date(end.getTime() - hour * 60 * 60 * 1000), end]
        }
      }))
    },
    selectedDevices() {
      const picked = new Set(this.deviceNos)
      return this.devices.filter((item) => picked.has(item.deviceNo))
    },
    cards() {
      const rows = []
      this.selectedDevices.forEach((device) => {
        if (this.products.includes('rhi')) {
          rows.push({ key: device.deviceNo + '-rhi', kind: 'rhi', device })
        }
        this.products.filter((product) => product !== 'rhi').forEach((product) => {
          const spec = thiSpec(product)
          rows.push({
            key: device.deviceNo + '-' + product,
            title: device.label + ' / ' + this.$t('otherMode.products.' + product),
            kind: product === 'barb' ? 'barb' : 'thi',
            unit: spec.unit,
            scale: spec.scale,
            series: spec.series
          })
        })
      })
      return rows
    },
    rhiViews() {
      const views = {}
      this.cards.forEach((card) => {
        if (card.kind === 'rhi') views[card.device.deviceNo] = this.rhiView(card.device.deviceNo)
      })
      return views
    },
    mapDevices() {
      return this.devices.filter((item) => item.latitude != null && item.longitude != null).map((item) => ({
        latitude: item.latitude,
        longitude: item.longitude,
        stationNo: item.deviceNo,
        regionInfo: item.label,
        type: 'lidar',
        status: item.status
      }))
    }
  },
  created() {
    this.devices.forEach((item) => this.panel(item.deviceNo))
    this.loadDevices()
    this.loadRhiFiles()
  },
  watch: {
    deviceNos() {
      this.loadRhiFiles()
    },
    timeRange() {
      this.loadRhiFiles()
    },
    products() {
      this.loadRhiFiles()
    }
  },
  methods: {
    panel(deviceNo) {
      if (!this.rhiPanels[deviceNo]) {
        this.rhiPanels[deviceNo] = { order: 'time', fileId: '', type: 'wind' }
      }
      return this.rhiPanels[deviceNo]
    },
    sortedFiles(deviceNo) {
      return orderFiles(this.rhiFiles[deviceNo], this.panel(deviceNo).order)
    },
    setOrder(deviceNo, order) {
      this.panel(deviceNo).order = order
    },
    setType(deviceNo, type) {
      this.panel(deviceNo).type = type
    },
    pickFile(deviceNo, file) {
      this.panel(deviceNo).fileId = file.id
      if (file.filePath) this.loadScan(file)
    },
    rhiView(deviceNo) {
      const panel = this.panel(deviceNo)
      const files = this.sortedFiles(deviceNo)
      const file = files.find((item) => item.id === panel.fileId) || files[0]
      const cached = file ? this.rhiScans[file.id] : null
      const live = scanView(cached, panel.type)
      if (live) return live
      const sample = scanView(SAMPLE_SCAN, panel.type)
      if (sample) return sample
      const source = this.rhiFiles[deviceNo] || []
      const seed = file ? Math.max(0, source.indexOf(file)) : 0
      return rhiSeries(panel.type, seed)
    },
    loadRhiFiles() {
      if (!this.products.includes('rhi')) return
      const range = this.timeRange && this.timeRange.length === 2 ? this.timeRange : recentRange(24)
      this.selectedDevices.forEach((device) => {
        this.panel(device.deviceNo)
        if (!this.rhiFiles[device.deviceNo]) {
          this.keepFiles(device.deviceNo, previewFiles(device.deviceNo, range[0], range[1]))
        }
        if(this.referenceMode)return
        listRhiFiles({ deviceNo: device.deviceNo, startDate: range[0], endDate: range[1] }).then((res) => {
          const body = res && res.data && !Array.isArray(res.data) ? res.data : res
          const rows = body && Array.isArray(body.fileList) ? body.fileList : (Array.isArray(res && res.rows) ? res.rows : [])
          const files = rows.map((row, index) => normalizeFile(row, index, device.deviceNo)).filter((item) => item.name)
          this.keepFiles(device.deviceNo, files.length ? files : previewFiles(device.deviceNo, range[0], range[1]))
        }).catch(() => {
          this.keepFiles(device.deviceNo, previewFiles(device.deviceNo, range[0], range[1]))
        })
      })
    },
    keepFiles(deviceNo, files) {
      this.rhiFiles = { ...this.rhiFiles, [deviceNo]: files }
      const panel = this.panel(deviceNo)
      if (!files.some((item) => item.id === panel.fileId)) {
        const first = orderFiles(files, panel.order)[0]
        panel.fileId = first ? first.id : ''
        if (first && first.filePath) this.loadScan(first)
      }
    },
    loadScan(file) {
      if(this.referenceMode)return
      readRhiScan({ filePath: file.filePath }).then((res) => {
        const data = res && res.data ? res.data : res
        const scan = scanFromPayload(data)
        if (!scan) return
        this.rhiScans = { ...this.rhiScans, [file.id]: scan }
      }).catch(() => {})
    },
    loadDevices() {
      if(this.referenceMode)return
      listOtherModeDevices().then((res) => {
        const rows = Array.isArray(res) ? res : (Array.isArray(res && res.data) ? res.data : (Array.isArray(res && res.rows) ? res.rows : []))
        const mapped = rows.map(normalizeDevice).filter((item) => item.deviceNo)
        if (!mapped.length) return
        this.devices = mapped
        const known = new Set(mapped.map((item) => item.deviceNo))
        const kept = this.deviceNos.filter((id) => known.has(id))
        this.deviceNos = kept.length ? kept : [mapped[0].deviceNo]
      }).catch(() => {})
    },
    onTimeChange(value) {
      if (!value || value.length < 2) return
      const start = new Date(String(value[0]).replace(/-/g, '/')).getTime()
      const end = new Date(String(value[1]).replace(/-/g, '/')).getTime()
      if (Number.isFinite(end - start) && end - start > 3 * DAY_MS) {
        ElMessage.warning(this.$t('otherMode.rangeLimit'))
        this.timeRange = this.previousRange.slice()
        return
      }
      this.previousRange = value.slice()
    },
    onModeChange(live) {
      if (!live) return
      const next = recentRange(1)
      this.timeRange = next
      this.previousRange = next.slice()
    },
    onMarkerToggle(payload) {
      const id = payload && payload.stationNo
      if (!id) return
      const next = this.deviceNos.slice()
      const index = next.indexOf(id)
      if (index >= 0) next.splice(index, 1)
      else next.push(id)
      this.deviceNos = next
    }
  }
}
</script>

<style scoped>
.other-mode {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #07141c;
  color: #d7e4f5;
}
.other-mode__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  height: 64px;
  padding: 0 16px;
  background: #0d1a30;
}
.filter-field {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 14px;
}
.filter-field .el-select { width: 220px; }
.filter-field--time :deep(.el-date-editor) { width: 360px; }
.other-mode__body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.chart-column {
  width: 58%;
  min-width: 480px;
  overflow: auto;
  padding: 12px 12px 16px;
}
.chart-empty {
  margin: 48px 0;
  color: #8b97ad;
  text-align: center;
}
.chart-card {
  height: 300px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: #061830;
}
.chart-card.is-rhi { height: 520px; }
.rhi-board { display: flex; height: 100%; min-height: 0; }
.rhi-files {
  display: flex;
  flex-direction: column;
  width: 220px;
  min-width: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}
.rhi-files header {
  height: auto;
  padding: 10px 10px 0;
  color: #d7ecff;
  font-size: 13px;
}
.rhi-files__sort {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  color: #8b97ad;
  font-size: 12px;
}
.rhi-files__sort .el-select { flex: 1; }
.rhi-files__list { flex: 1; overflow: auto; }
.rhi-files__empty { margin: 12px; color: #8b97ad; text-align: center; }
.rhi-file {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: transparent;
  color: #d7e4f5;
  text-align: left;
  cursor: pointer;
}
.rhi-file.is-active { background: rgba(32, 106, 255, 0.35); }
.rhi-main { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.rhi-switch { display: flex; justify-content: flex-end; padding: 8px 8px 0; }
.rhi-main .chart-plot { flex: 1; min-height: 0; }
.chart-card header {
  height: 32px;
  padding: 8px 12px 0;
  color: #d7ecff;
  font-size: 13px;
}
.chart-plot { height: calc(100% - 32px); }
.chart-plot :deep(.thi-chart),
.chart-plot :deep(.barb-chart),
.chart-plot :deep(.scan-chart) {
  width: 100%;
  height: 100%;
}
.map-column {
  position: relative;
  flex: 1;
  min-width: 0;
}
.other-mode__map {
  position: absolute;
  inset: 0;
}
.other-mode__map :deep(.leice-map-device) {
  border-radius: 50%;
  background: #3ec6ff;
  box-shadow: 0 0 0 2px rgba(7, 20, 28, 0.85);
}
.other-mode__map :deep(.leice-map-device.is-active) {
  background: #ffd446;
}
.other-mode__map :deep(.leice-map-device-label) {
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
.map-tools {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 500;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  max-width: calc(100% - 24px);
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(15, 21, 21, 0.78);
  color: #fff;
  font-size: 12px;
}
.map-tools :deep(.el-radio) { margin-right: 8px; color: #fff; }
.tile-field {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 180px;
}
.tile-field .el-input { width: 180px; }
</style>
