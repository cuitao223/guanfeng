<template>
  <div class="device-overview" :class="{ 'is-detail-open': !!selected, 'is-search-collapsed': collapsed }">
    <leice-map-2d
      class="device-overview__map"
      :tile-url="tileUrl"
      :center="mapView.center"
      :zoom="mapView.zoom"
      :min-zoom="mapView.minZoom"
      :max-zoom="mapView.maxZoom"
      :max-bounds="mapView.maxBounds"
    >
      <device-markers
        v-if="displaySwitches.radarIcon"
        :devices="mapDevices"
        :marker-types="['2']"
        :active-ids="activeIds"
        @toggle="onMarkerToggle"
      />
    </leice-map-2d>

    <aside class="search-panel">
      <button v-if="collapsed" type="button" class="search-expand" @click="collapsed = false">{{ $t('deviceOverview.expand') }}</button>
      <div v-else class="search-card">
        <header class="search-head">
          <span>{{ $t('deviceOverview.title') }}</span>
          <b>{{ $t('deviceOverview.count', { count: filtered.length }) }}</b>
          <button type="button" @click="collapsed = true">{{ $t('deviceOverview.collapse') }}</button>
        </header>
        <el-input v-model="filters.deviceNo" clearable :placeholder="$t('deviceOverview.deviceNo')" @keyup.enter="applySearch" @clear="applySearch" />
        <div class="search-grid">
          <el-select v-model="filters.model" clearable filterable :placeholder="$t('deviceOverview.model')" @change="applySearch">
            <el-option v-for="item in modelOptions" :key="item" :label="item" :value="item" />
          </el-select>
          <el-select v-model="filters.station" clearable filterable :placeholder="$t('deviceOverview.station')" @change="applySearch">
            <el-option v-for="item in stationOptions" :key="item" :label="item" :value="item" />
          </el-select>
          <el-select v-model="filters.project" clearable filterable :placeholder="$t('deviceOverview.project')" @change="applySearch">
            <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
          </el-select>
          <el-select v-model="filters.status" clearable :placeholder="$t('deviceOverview.status')" @change="applySearch">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="search-actions">
          <el-checkbox v-model="filters.onlyFiltered">{{ $t('deviceOverview.onlyFiltered') }}</el-checkbox>
          <el-button type="primary" @click="resetFilters">{{ $t('deviceOverview.reset') }}</el-button>
        </div>
        <div class="device-table">
          <div class="device-row is-head">
            <span>{{ $t('deviceOverview.colDevice') }}</span>
            <span>{{ $t('deviceOverview.colStation') }}</span>
            <span>{{ $t('deviceOverview.colStatus') }}</span>
            <span>{{ $t('deviceOverview.colDeploy') }}</span>
          </div>
          <div class="device-scroll">
            <p v-if="!filtered.length" class="device-empty">{{ $t('deviceOverview.empty') }}</p>
            <button
              v-for="row in filtered"
              :key="row.deviceId"
              type="button"
              class="device-row"
              :class="{ 'is-active': selected && selected.deviceId === row.deviceId }"
              @click="selectDevice(row)"
            >
              <span>{{ row.deviceNo }}</span>
              <span>{{ row.stationName || '-' }}</span>
              <span :class="statusClass(row)">{{ statusText(row) }}</span>
              <span>{{ deployText(row) }}</span>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <aside class="layer-panel">
      <section class="radar-card">
        <h2>{{ $t('deviceOverview.statusTitle') }}</h2>
        <div class="deploy-row">
          <button type="button" :class="{ 'is-active': deployFilter === 'all' }" @click="deployFilter = 'all'">
            <b>{{ source.length }}</b>
            <span>{{ $t('deviceOverview.deployAll') }}</span>
          </button>
          <button type="button" :class="{ 'is-active': deployFilter === 'deployed' }" @click="deployFilter = 'deployed'">
            <b>{{ deployCounts.deployed }}</b>
            <span>{{ $t('deviceOverview.deployed') }}</span>
          </button>
          <button type="button" :class="{ 'is-active': deployFilter === 'planned' }" @click="deployFilter = 'planned'">
            <b>{{ deployCounts.planned }}</b>
            <span>{{ $t('deviceOverview.planned') }}</span>
          </button>
        </div>
        <div class="status-grid" :class="{ 'is-disabled': deployFilter === 'planned' }">
          <button v-for="item in statusOptions" :key="item.value" type="button" :disabled="deployFilter === 'planned'" :class="{ 'is-active': statusFilter === item.value }" @click="toggleStatus(item.value)">
            <span>{{ item.label }}</span>
            <b :class="item.className">{{ statusCounts[item.value] || 0 }}</b>
          </button>
        </div>
      </section>
      <label class="tile-field">
        <span>{{ $t('deviceOverview.tileUrl') }}</span>
        <el-input v-model="tileUrl" clearable />
      </label>
      <layer-control-panel v-model:map-type="mapType" v-model:display-switches="displaySwitches" />
    </aside>

    <section v-if="selected" class="detail-panel" :aria-label="$t('deviceOverview.detailTitle')">
      <header class="detail-head">
        <strong>{{ selected.deviceNo }}</strong>
        <button type="button" @click="selected = null">{{ $t('deviceOverview.close') }}</button>
      </header>
      <div class="detail-body">
        <dl class="detail-fields">
          <div v-for="item in detailFields" :key="item.key">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
        <div class="detail-main">
          <div v-if="activeTab !== 'status'" class="detail-date">
            <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              value-format="YYYY-MM-DD HH:mm:ss"
              :range-separator="$t('deviceOverview.dateTo')"
              :start-placeholder="$t('deviceOverview.startDate')"
              :end-placeholder="$t('deviceOverview.endDate')"
            />
          </div>
          <div class="detail-tabs">
            <button
              v-for="tab in tabs"
              :key="tab"
              type="button"
              :class="{ 'is-active': activeTab === tab }"
              @click="activeTab = tab"
            >{{ $t('deviceOverview.tabs.' + tab) }}</button>
          </div>
          <div v-if="activeTab === 'status'" class="status-sheet">
            <p><span>{{ $t('deviceOverview.fields.status') }}</span>{{ statusText(selected) }}</p>
            <p><span>{{ $t('deviceOverview.fields.owner') }}</span>{{ selected.owner || '-' }}</p>
            <p><span>{{ $t('deviceOverview.fields.deployTime') }}</span>{{ selected.deployTime || '-' }}</p>
            <p><span>{{ $t('deviceOverview.fields.updateTime') }}</span>{{ selected.updateTime || '-' }}</p>
            <p><span>{{ $t('deviceOverview.fields.windfarm') }}</span>{{ selected.stationName || '-' }}</p>
          </div>
          <p v-else class="chart-empty">{{ $t('deviceOverview.chartEmpty') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import LeiceMap2d from '@leice-map-2d/assets/layers/LeiceMap2d.vue'
import DeviceMarkers from '@leice-map-2d/assets/layers/DeviceMarkers.vue'
import LayerControlPanel from '@/components/LayerControlPanel/index.vue'
import { listOverviewDevices, listOverviewModels, listOverviewProjects, listOverviewWindfarms } from './api'
import 'leaflet/dist/leaflet.css'

const TABS = ['status', 'windBarb', 'verticalWind', 'snr', 'uploadRate', 'completeness', 'heightFetchRate', 'tempHumidity']

function previewDevices() {
  return [
    { deviceId: 'preview-1', deviceNo: 'WM-01', modelName: 'type1', stationName: 'A1', projectName: 'P1', status: 1, deployStatus: 'deployed', owner: 'Demo', latitude: 0.35, longitude: -0.4 },
    { deviceId: 'preview-2', deviceNo: 'WM-02', modelName: 'type2', stationName: 'A2', projectName: 'P1', status: 2, deployStatus: 'deployed', owner: 'Demo', latitude: -0.2, longitude: 0.45 },
    { deviceId: 'preview-3', deviceNo: 'WM-03', modelName: 'type1', stationName: 'A1', projectName: 'P2', status: 4, deployStatus: 'planned', owner: 'Demo', latitude: 0.15, longitude: 0.55 },
    { deviceId: 'preview-4', deviceNo: 'WM-04', modelName: 'type3', stationName: 'A3', projectName: 'P2', status: 3, deployStatus: 'deployed', owner: 'Demo', latitude: -0.3, longitude: -0.15 }
  ]
}

function normalizePoint(point, index) {
  const latitude = Number(point.latitude != null ? point.latitude : point.latitudePlan)
  const longitude = Number(point.longitude != null ? point.longitude : point.longitudePlan)
  return {
    deviceId: point.deviceId || point.id || 'device-' + index,
    deviceNo: point.deviceNo || point.stationNo || '-',
    modelName: point.modelName || point.model || '',
    stationName: point.stationName || point.windfarmName || '',
    projectName: point.projectName || point.project || '',
    status: Number(point.status) || 1,
    deployStatus: point.deployStatus === 'planned' || point.deployStatus === 0 ? 'planned' : 'deployed',
    owner: point.owner || point.deviceOwner || '',
    address: point.address || point.region || '',
    altitude: point.altitude,
    deployTime: point.deployTime || '',
    updateTime: point.updateTime || '',
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null
  }
}

export default {
  name: 'DeviceOverview',
  components: { DeviceMarkers, LayerControlPanel, LeiceMap2d },
  data() {
    return {
      tileUrl: '',
      mapType: 'img',
      collapsed: false,
      source: previewDevices(),
      selected: null,
      activeTab: 'status',
      dateRange: [],
      deployFilter: 'all',
      statusFilter: null,
      filters: { deviceNo: '', model: '', station: '', project: '', status: '', onlyFiltered: true },
      displaySwitches: { radarIcon: true, windfarmIcon: true, placeName: true },
      mapView: {
        center: [0, 0],
        zoom: 8,
        minZoom: 2,
        maxZoom: 18,
        maxBounds: [[-85, -180], [85, 180]]
      },
      tabs: TABS
    }
  },
  computed: {
    statusOptions() {
      return [
        { value: 1, label: this.$t('deviceOverview.normal'), className: 'is-normal' },
        { value: 4, label: this.$t('deviceOverview.error'), className: 'is-error' },
        { value: 2, label: this.$t('deviceOverview.offline'), className: 'is-offline' },
        { value: 3, label: this.$t('deviceOverview.warning'), className: 'is-warning' }
      ]
    },
    modelOptions() {
      return unique(this.source.map((item) => item.modelName))
    },
    stationOptions() {
      return unique(this.source.map((item) => item.stationName))
    },
    projectOptions() {
      return unique(this.source.map((item) => item.projectName))
    },
    searched() {
      const deviceNo = this.filters.deviceNo.trim().toLowerCase()
      return this.source.filter((item) => {
        if (deviceNo && !String(item.deviceNo).toLowerCase().includes(deviceNo)) return false
        if (this.filters.model && item.modelName !== this.filters.model) return false
        if (this.filters.station && item.stationName !== this.filters.station) return false
        if (this.filters.project && item.projectName !== this.filters.project) return false
        if (this.filters.status !== '' && Number(item.status) !== Number(this.filters.status)) return false
        return true
      })
    },
    filtered() {
      return this.searched.filter((item) => this.passRadar(item))
    },
    mapDevices() {
      const rows = this.filters.onlyFiltered ? this.filtered : this.source.filter((item) => this.passRadar(item))
      return rows.filter((item) => item.latitude != null && item.longitude != null).map((item) => ({
        latitude: item.latitude,
        longitude: item.longitude,
        stationNo: item.deviceNo,
        type: 'lidar',
        status: 2
      }))
    },
    activeIds() {
      return this.selected ? [this.selected.deviceNo] : []
    },
    deployCounts() {
      return {
        deployed: this.source.filter((item) => item.deployStatus === 'deployed').length,
        planned: this.source.filter((item) => item.deployStatus === 'planned').length
      }
    },
    statusCounts() {
      return this.source.reduce((counts, item) => {
        counts[item.status] = (counts[item.status] || 0) + 1
        return counts
      }, {})
    },
    detailFields() {
      const row = this.selected || {}
      const coords = row.latitude == null ? '-' : row.longitude + ', ' + row.latitude
      return [
        { key: 'project', label: this.$t('deviceOverview.fields.project'), value: row.projectName || '-' },
        { key: 'model', label: this.$t('deviceOverview.fields.model'), value: row.modelName || '-' },
        { key: 'coords', label: this.$t('deviceOverview.fields.coords'), value: coords },
        { key: 'address', label: this.$t('deviceOverview.fields.address'), value: row.address || '-' },
        { key: 'altitude', label: this.$t('deviceOverview.fields.altitude'), value: row.altitude == null || row.altitude === '' ? '-' : row.altitude + 'm' }
      ]
    }
  },
  created() {
    this.loadRemote()
  },
  methods: {
    loadRemote() {
      listOverviewDevices({}).then((res) => {
        const data = res.data || {}
        const points = Array.isArray(data.points) ? data.points : (res.rows || [])
        if (points.length) this.source = points.map(normalizePoint)
      }).catch(() => {})
      listOverviewModels().catch(() => {})
      listOverviewWindfarms().catch(() => {})
      listOverviewProjects().catch(() => {})
    },
    applySearch() {
      const params = {}
      if (this.filters.deviceNo) params.deviceNo = this.filters.deviceNo.trim()
      if (this.filters.model) params.modelType = this.filters.model
      if (this.filters.station) params.windfarm = this.filters.station
      if (this.filters.project) params.project = this.filters.project
      if (this.filters.status !== '') params.status = this.filters.status
      listOverviewDevices(params).then((res) => {
        const data = res.data || {}
        const points = Array.isArray(data.points) ? data.points : []
        if (points.length) this.source = points.map(normalizePoint)
      }).catch(() => {})
    },
    resetFilters() {
      this.filters = { deviceNo: '', model: '', station: '', project: '', status: '', onlyFiltered: true }
      this.deployFilter = 'all'
      this.statusFilter = null
      this.loadRemote()
    },
    passRadar(item) {
      if (this.deployFilter === 'deployed' && item.deployStatus !== 'deployed') return false
      if (this.deployFilter === 'planned' && item.deployStatus !== 'planned') return false
      if (this.deployFilter !== 'planned' && this.statusFilter != null && Number(item.status) !== this.statusFilter) return false
      return true
    },
    toggleStatus(value) {
      this.statusFilter = this.statusFilter === value ? null : value
    },
    selectDevice(row) {
      this.selected = row
      this.activeTab = 'status'
    },
    onMarkerToggle(device) {
      const row = this.source.find((item) => item.deviceNo === device.stationNo)
      if (row) this.selectDevice(row)
    },
    statusText(row) {
      const match = this.statusOptions.find((item) => item.value === Number(row.status))
      return match ? match.label : '-'
    },
    statusClass(row) {
      const match = this.statusOptions.find((item) => item.value === Number(row.status))
      return match ? match.className : ''
    },
    deployText(row) {
      return row.deployStatus === 'planned' ? this.$t('deviceOverview.planned') : this.$t('deviceOverview.deployed')
    }
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}
</script>

<style scoped>
.device-overview {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: #07111c;
  color: #d7e4f5;
}
.device-overview__map {
  position: absolute;
  inset: 0;
}
.search-panel,
.layer-panel,
.detail-panel {
  position: absolute;
  z-index: 500;
}
.search-panel {
  top: 16px;
  bottom: 16px;
  left: 16px;
  width: 380px;
}
.is-detail-open .search-panel { bottom: 292px; }
.is-search-collapsed .search-panel { width: auto; bottom: auto; }
.search-card,
.radar-card,
.detail-panel,
.tile-field {
  border-radius: 8px;
  background: rgba(17, 24, 39, 0.88);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
}
.search-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  padding: 14px;
}
.search-head,
.detail-head,
.search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-head b {
  min-width: 36px;
  padding: 0 8px;
  border-radius: 10px;
  background: rgba(32, 106, 255, 0.7);
  color: #fff;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
}
.search-head button,
.search-expand,
.detail-head button {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: #8b97ad;
  cursor: pointer;
}
.search-expand {
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(17, 24, 39, 0.88);
}
.search-grid,
.deploy-row,
.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.deploy-row { grid-template-columns: repeat(3, 1fr); }
.search-actions { justify-content: space-between; }
.device-table {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}
.device-scroll { flex: 1; min-height: 0; overflow: auto; }
.device-row {
  display: grid;
  grid-template-columns: 1.1fr 1fr 0.7fr 0.8fr;
  gap: 6px;
  width: 100%;
  padding: 8px 4px;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.device-row.is-head { color: #8b97ad; cursor: default; }
.device-row.is-active { background: rgba(32, 106, 255, 0.24); }
.device-empty { margin: 16px 0; color: #8b97ad; text-align: center; }
.layer-panel {
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  width: 220px;
}
.radar-card,
.tile-field { width: 220px; padding: 12px; }
.radar-card h2,
.tile-field span { margin: 0 0 8px; color: #fff; font-size: 14px; }
.radar-card button {
  border: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: #d7e4f5;
  cursor: pointer;
}
.radar-card button.is-active { outline: 1px solid #206aff; }
.radar-card b { display: block; font-size: 18px; }
.status-grid.is-disabled { opacity: 0.45; }
.is-normal { color: #2cd1a2; }
.is-error { color: #de2727; }
.is-offline { color: #aaaaaa; }
.is-warning { color: #f16c2f; }
.detail-panel {
  right: 16px;
  bottom: 16px;
  left: 16px;
  height: 260px;
  padding: 12px 16px;
}
.detail-body {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  height: calc(100% - 32px);
}
.detail-fields {
  display: grid;
  gap: 6px;
  margin: 0;
}
.detail-fields div { display: flex; gap: 8px; }
.detail-fields dt { color: #8b97ad; }
.detail-fields dd { margin: 0; }
.detail-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.detail-tabs button {
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: #d7e4f5;
  cursor: pointer;
}
.detail-tabs button.is-active { background: #206aff; }
.status-sheet p { display: flex; gap: 8px; margin: 6px 0; }
.status-sheet span { color: #8b97ad; }
.chart-empty { margin: 24px 0; color: #8b97ad; }
</style>
