<template>
  <div class="wind3d-page" :class="{ 'is-drawing': tools.drawEdit }">
    <leice-map-3d
      v-if="mapReady"
      class="wind3d-page__map"
      :map-style="mapStyle"
      :satellite-tiles="tiles"
      :vector-tiles="vectorTiles"
      :center="mapView.center"
      :zoom="mapView.zoom"
      :zooms="mapView.zooms"
      :pitch="viewPitch"
      :rotation="viewRotation"
      @ready="onMapReady"
    >
      <wind-field-layer
        v-if="showField && sampleGeoreferenced"
        :levels="fieldLevels"
        :height-mode="wind.heightMode"
        :opacity="wind.fieldOpacity"
        :color-style="wind.colorStyle"
        :exaggeration="exaggeration"
        :legend-min="legendMin"
        :legend-max="legendMax"
        :colors="windColors"
      />
      <wind-barb-layer
        v-if="showVector && sampleGeoreferenced"
        :levels="fieldLevels"
        :height-mode="wind.heightMode"
        :density="wind.barbDensity"
        :map-style="mapStyle"
        :kind="vectorKind"
        :exaggeration="exaggeration"
      />
      <wind-particle-layer
        v-if="showParticle && sampleGeoreferenced"
        :levels="fieldLevels"
        :height-mode="wind.heightMode"
        :map-style="mapStyle"
        :exaggeration="exaggeration"
      />
      <volume-scale-layer
        v-if="wind.showRuler && sampleGeoreferenced"
        :levels="fieldLevels"
        :height-mode="wind.heightMode"
        :exaggeration="exaggeration"
        :map-style="mapStyle"
        :height-label="$t('wind3d.ruler.height')"
        :east-label="$t('wind3d.ruler.east')"
        :north-label="$t('wind3d.ruler.north')"
      />
      <warn-overlay-layer
        v-if="warnKind && sampleGeoreferenced"
        :levels="warnLevels"
        :warn-type="warnKind"
        :thresholds="alertThresholds"
        :height-mode="wind.heightMode"
        :exaggeration="exaggeration"
        :opacity="wind.fieldOpacity"
        :map-style="mapStyle"
      />
      <weather-observations3d :mode="observationMode" :enabled="observationsVisible" :language="$i18n.locale" :translate="$t" />
    </leice-map-3d>
    <p class="basemap-notice" role="status">{{ $t('realMap.threePreview') }}</p>
    <observation-controls class="wind3d-observation-controls" v-model:mode="observationMode" v-model:enabled="observationsVisible" />
    <span class="basemap-credit">&copy; 高德地图</span>

    <aside v-show="showHistogram" class="histogram-card" :class="{ 'is-off': tools.drawEdit }">
      <header class="side-card__head">
        <strong>{{ $t('wind3d.histogram.title') }}</strong>
      </header>
      <p v-if="!histogramBins.length" class="side-empty">{{ $t('wind3d.histogram.empty') }}</p>
      <div v-for="(bin, index) in histogramBins" :key="index" class="histogram-row">
        <span>{{ bin.label }}</span>
        <span class="histogram-track"><i :style="{ width: bin.percent + '%' }"></i></span>
        <span>{{ bin.percent }}%</span>
      </div>
    </aside>

    <div v-show="tip.show" class="wind-tip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
      <p>{{ $t('wind3d.tooltip.height') }} {{ tip.height }} m</p>
      <p>{{ $t('wind3d.tooltip.speed') }} {{ tip.speedText }}</p>
      <p>{{ $t('wind3d.tooltip.direction') }} {{ tip.directionText }}</p>
      <p v-if="tip.warnType">{{ $t('wind3d.tooltip.warnType') }} {{ tip.warnType }}</p>
      <p v-if="tip.warnLevel">{{ $t('wind3d.tooltip.warnLevel') }} <span :class="'is-' + tip.warnSeverity">{{ tip.warnLevel }}</span></p>
      <p v-if="tip.warnValue">{{ $t('wind3d.tooltip.warnValue') }} <span :class="'is-' + tip.warnSeverity">{{ tip.warnValue }}</span></p>
    </div>
    <wind-field-layer-panel
      v-show="panelsVisible"
      ref="windPanel"
      :height-hint="$t('widget.wind3d.heightHint')"
      :disabled-warn="disabledWarns"
      @change="onWindChange"
    />

    <aside v-show="panelsVisible" class="right-stack">
      <section class="side-card">
        <header class="side-card__head">
          <strong>{{ $t('wind3d.alertTitle') }}</strong>
          <span>{{ $t('wind3d.updated') }} {{ selectedTime || '--' }}</span>
        </header>
        <div class="alert-table">
          <div class="alert-row is-head">
            <span>{{ $t('wind3d.colHeight') }}</span>
            <span>{{ $t('wind3d.colType') }}</span>
            <span>{{ $t('wind3d.colLevel') }}</span>
          </div>
          <p v-if="!alerts.length" class="side-empty">{{ $t('wind3d.alertEmpty') }}</p>
          <button
            v-for="(row, index) in alerts"
            :key="index"
            type="button"
            class="alert-row"
            :class="'is-' + row.level"
            @dblclick="onAlertDblClick(row)"
          >
            <span>{{ row.height }}</span>
            <span>{{ $t('wind3d.types.' + row.type) }}</span>
            <span>{{ $t('wind3d.levels.' + row.level) }}</span>
          </button>
        </div>
      </section>
      <section class="side-card side-card--profile">
        <header class="side-card__head">
          <strong>{{ $t('wind3d.profileTitle') }}</strong>
          <span>{{ $t('wind3d.selectedTime') }} {{ selectedTime || '--' }}</span>
        </header>
        <div class="profile-plot">
          <profile-chart
            title="m/s"
            color="#8df7ff"
            :palette="profilePalette"
            :height-arr="profileHeights"
            :value="profileValues"
            :height-max="1600"
            unit="m/s"
            theme="dark"
          />
        </div>
      </section>
    </aside>

    <picture-edit-overlay :active="tools.drawEdit" />

    <wind-map-toolbar
      v-model:device-layer="tools.deviceLayer"
      v-model:profile-marker="tools.profileMarker"
      v-model:draw-edit="tools.drawEdit"
      v-model:fullscreen="tools.fullscreen"
      :show-device-layer="false"
      :show-profile-marker="false"
      :show-vertical-section="false"
      :show-manual="false"
      :rotation="viewRotation"
      :pitch="viewPitch"
      @reset-view="onResetView"
    />

    <label class="tile-field" :class="{ 'is-off': tools.drawEdit }">
      <span>{{ $t('wind3d.tileUrl') }}</span>
      <el-input v-model="activeTileUrl" clearable />
    </label>

    <footer class="slider-container">
      <div class="time-wrap">
        <time-player-slider :live="false" @change="onTimeChange" />
      </div>
      <div class="dataslider-wrap">
        <wind-color-bar
          :value-min="legendMin"
          :value-max="legendMax"
          unit="m/s"
          :colors="windColors"
          :domain-points="windDomain"
          :color-type="wind.colorStyle"
          @open-settings="legendOpen = true"
        />
      </div>
    </footer>
    <wind-color-scale-dialog
      v-model="legendOpen"
      :value-min="legendMin"
      :value-max="legendMax"
      :colors="windColors"
      :domain-points="windDomain"
      unit="m/s"
      @confirm="onLegendConfirm"
    />
  </div>
</template>

<script>
import WeatherObservations3d from '@/components/WeatherObservations/ThreeDimensional.vue'
import ObservationControls from '@/components/WeatherObservations/Controls.vue'
import { ElMessage } from 'element-plus'
import LeiceMap3d from '@leice-map-3d/assets/layers/LeiceMap3d.vue'
import WarnOverlayLayer from '@leice-map-3d/assets/layers/WarnOverlayLayer.vue'
import WindFieldLayer from '@leice-map-3d/assets/layers/WindFieldLayer.vue'
import WindBarbLayer from '@leice-map-3d/assets/layers/WindBarbLayer.vue'
import WindParticleLayer from '@leice-map-3d/assets/layers/WindParticleLayer.vue'
import VolumeScaleLayer from '@leice-map-3d/assets/layers/VolumeScaleLayer.vue'
import { ProfileChart } from '@leice-charts/profile/assets/src'
import TimePlayerSlider from '@/components/TimePlayerSlider/index.vue'
import WindColorBar from '@/components/WindColorBar/index.vue'
import WindColorScaleDialog from '@/components/WindColorScaleDialog/index.vue'
import WindFieldLayerPanel from '@/components/WindFieldLayerPanel/index.vue'
import PictureEditOverlay from '@/components/PictureEditOverlay/index.vue'
import WindMapToolbar from '@/components/WindMapToolbar/index.vue'
import { WIND_LEGEND_COLORS, WIND_LEGEND_MAX, WIND_LEGEND_MIN, uniformStops } from '@leice-map-3d/assets/logic/legend.mjs'
import { decodeShearImage, decodeWindFieldImage } from '@leice-map-3d/assets/logic/windImage.mjs'
import { formatWarnValue, resolveThreshold, warnLevelKey, warnSeverity } from '@leice-map-3d/assets/logic/warn.mjs'
import { listWindAlerts } from '@/api/map/wind3d'

const SATELLITE_TILE = 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'
const VECTOR_TILE = 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}'
const PROFILE_HEIGHTS = [100, 200, 400, 600, 800, 1000, 1500]
const VIEW_PITCH = 56
const VIEW_ROTATION = 25.5
const MOCK_HEIGHTS = [0, 200, 400, 600]
const MOCK_STAMPS = [
  { id: '20261028_084000', at: '2026-10-28T08:40:00' },
  { id: '20261028_084200', at: '2026-10-28T08:42:00' },
  { id: '20261028_084300', at: '2026-10-28T08:43:00' }
]

function nearestStamp(value) {
  const stamps = MOCK_STAMPS.map((item) => ({ id: item.id, ms: Date.parse(item.at) }))
  const target = Date.parse(String(value || '').replace(' ', 'T'))
  if (!Number.isFinite(target)) return stamps[stamps.length - 1].id
  return stamps.slice().sort((a, b) => Math.abs(a.ms - target) - Math.abs(b.ms - target))[0].id
}

function zoomFor(header) {
  const span = Math.max(Math.abs(header.lo2 - header.lo1), Math.abs(header.la1 - header.la2))
  if (!span) return 11
  const fitted = Math.round(Math.log2((360 * 4) / span))
  return Math.max(3, Math.min(16, fitted - 1))
}

function readRaster(url, decode) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      context.drawImage(image, 0, 0)
      const frame = context.getImageData(0, 0, canvas.width, canvas.height)
      resolve(decode(frame.data, frame.width, frame.height))
    }
    image.onerror = () => resolve(null)
    image.src = url
  })
}

function ensureAmap() {
  if (window.AMap && window.AMap.Map) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/amap/AMap3.js?v=5'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('map script'))
    document.head.appendChild(script)
  })
}

function previewAlerts() {
  return [
    { height: '300 m', type: 'gale', level: 'light', threshold: '3.8,3.9,4.0', unit: 'm/s' },
    { height: '600 m', type: 'shearH', level: 'medium', threshold: '0.00005,0.00012,0.0002', unit: '1/s' },
    { height: '900 m', type: 'shearV', level: 'severe', threshold: '0.002,0.005,0.008', unit: '1/s' }
  ]
}

function thresholdOf(row) {
  const parts = String(row && row.threshold || '').split(',').map((item) => Number(String(item).trim()))
  if (parts.length < 3 || parts.some((item) => !Number.isFinite(item))) return null
  return { min: parts[0], medium: parts[1], max: parts[2], unit: row.unit || '' }
}

export default {
  name: 'Wind3dPage',
  props: { referenceMode: {type:Boolean,default:false} },
  components: {
    WeatherObservations3d, ObservationControls,
    LeiceMap3d,
    ProfileChart,
    TimePlayerSlider,
    WindBarbLayer,
    WindColorBar,
    WindColorScaleDialog,
    WindFieldLayer,
    PictureEditOverlay,
    WindFieldLayerPanel,
    WindMapToolbar,
    WindParticleLayer,
    VolumeScaleLayer,
    WarnOverlayLayer
  },
  data() {
    return {
      satelliteTileUrl: SATELLITE_TILE,
      vectorTileUrl: VECTOR_TILE,
      mapReady: false,
      centerLocked: false,
      activeStamp: MOCK_STAMPS[MOCK_STAMPS.length - 1].id,
      levelCache: {},
      mapCtx: null,
      selectedTime: '',
      alerts: previewAlerts(),
      profilePalette: {
        plotBg: 'transparent',
        frameBg: 'transparent',
        frameBorder: 'transparent',
        axis: 'rgba(141, 247, 255, 0.72)',
        grid: 'rgba(48, 160, 164, 0.35)',
        label: 'rgba(255, 255, 255, 0.82)',
        title: '#ffffff',
        cross: 'rgba(141, 247, 255, 0.7)',
        tooltipBg: 'rgba(0, 0, 0, 0.82)',
        tooltipBorder: '#30a0a4',
        tooltipText: '#ffffff',
        tipTitle: '#8df7ff',
        focusDotStroke: '#ffffff',
        series: '#8df7ff'
      },
      profileHeights: PROFILE_HEIGHTS,
      tools: {
        deviceLayer: true,
        profileMarker: true,
        drawEdit: false,
        verticalSection: false,
        fullscreen: false
      },
      deviceMarker: null,
      viewPitch: VIEW_PITCH,
      viewRotation: VIEW_ROTATION,
      profilePoint: null,
      profileMarker: null,
      tip: { show: false, x: 0, y: 0, height: '--', speedText: '--', directionText: '--', warnType: '', warnLevel: '', warnSeverity: '', warnValue: '' },
      wind: {
        heightMode: 'multi',
        heights: [0, 200, 400, 600],
        forms: ['field', 'particle'],
        barbDensity: 1,
        fieldOpacity: 1,
        colorStyle: 'smooth',
        exaggeration: 20,
        showRuler: true,
        histogram: 'hide',
        mapType: 'satellite'
      },
      legendOpen: false,
      legendMin: WIND_LEGEND_MIN,
      legendMax: WIND_LEGEND_MAX,
      windColors: WIND_LEGEND_COLORS.slice(),
      windDomain: uniformStops(WIND_LEGEND_MIN, WIND_LEGEND_MAX, WIND_LEGEND_COLORS.length),
      observationMode: 'temperature',
      observationsVisible: true,
      sampleGeoreferenced: false,
      mapView: { center: [105, 35], zoom: 5, zooms: [2, 18] }
    }
  },
  computed: {
    activeTileUrl: {
      get() {
        return this.mapStyle === 'vector' ? this.vectorTileUrl : this.satelliteTileUrl
      },
      set(value) {
        if (this.mapStyle === 'vector') this.vectorTileUrl = value
        else this.satelliteTileUrl = value
      }
    },
    tiles() {
      return { base: this.satelliteTileUrl, label: this.satelliteTileUrl === SATELLITE_TILE ? 'https://webst01.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}' : '' }
    },
    vectorTiles() {
      return { base: this.vectorTileUrl, label: '' }
    },
    mapStyle() {
      return this.wind.mapType === 'vector' ? 'vector' : 'satellite'
    },
    panelsVisible() {
      return !this.tools.verticalSection
    },
    disabledWarns() {
      const present = new Set(this.alerts.map((row) => row.type))
      return ['shearH', 'shearV', 'gale'].filter((type) => !present.has(type))
    },
    warnKind() {
      return { shearH: 'horizontal', shearV: 'vertical', gale: 'gale' }[this.wind.warn] || ''
    },
    alertThresholds() {
      const mapped = { shearH: 'horizontal', shearV: 'vertical', gale: 'gale' }
      const thresholds = {}
      this.alerts.forEach((row) => {
        const key = mapped[row.type]
        if (!key || thresholds[key]) return
        const parsed = thresholdOf(row)
        if (parsed) thresholds[key] = parsed
      })
      return thresholds
    },
    warnLevels() {
      if (!this.warnKind) return []
      return this.fieldLevels.map((level) => ({
        height: level.height,
        header: level.header,
        values: this.warnValues(level)
      }))
    },
    exaggeration() {
      const level = Number(this.wind.exaggeration)
      return Number.isFinite(level) && level > 0 ? level : 1
    },
    showField() {
      return this.wind.forms.includes('field')
    },
    showVector() {
      return this.wind.forms.includes('barb') || this.wind.forms.includes('arrow')
    },
    vectorKind() {
      return this.wind.forms.includes('arrow') ? 'arrow' : 'barb'
    },
    showParticle() {
      return this.wind.forms.includes('particle')
    },
    showHistogram() {
      return this.wind.histogram === 'show'
    },
    fieldLevels() {
      const selected = new Set(this.wind.heights.map(Number))
      return MOCK_HEIGHTS
        .filter((height) => selected.has(height))
        .map((height) => this.levelCache[this.activeStamp + ':' + height])
        .filter(Boolean)
    },
    fieldCenter() {
      const level = this.fieldLevels[0]
      if (!level || !level.header) return null
      const header = level.header
      return [(header.lo1 + header.lo2) / 2, (header.la1 + header.la2) / 2]
    },
    profileAnchor() {
      if (this.profilePoint) return [this.profilePoint.lng, this.profilePoint.lat]
      const level = this.fieldLevels[0]
      if (!level || !level.header) return null
      const header = level.header
      return [(header.lo1 + header.lo2) / 2, (header.la1 + header.la2) / 2]
    },
    profileValues() {
      const anchor = this.profileAnchor
      return PROFILE_HEIGHTS.map((height) => {
        const level = this.levelCache[this.activeStamp + ':' + height]
        const sample = level && anchor ? this.sampleLevel(level, anchor[0], anchor[1]) : null
        const speed = sample ? sample.speed : (level && level.speeds.length ? level.speeds[Math.floor(level.speeds.length / 2)] : null)
        return speed === 9999 || !Number.isFinite(speed) ? 999 : Math.round(speed * 10) / 10
      })
    },
    histogramBins() {
      const speeds = []
      this.fieldLevels.forEach((level) => {
        level.speeds.forEach((speed) => {
          if (speed !== 9999 && Number.isFinite(speed)) speeds.push(speed)
        })
      })
      if (!speeds.length) return []
      let min = speeds[0]
      let max = speeds[0]
      speeds.forEach((speed) => {
        if (speed < min) min = speed
        if (speed > max) max = speed
      })
      const span = Math.max(max - min, 0.1)
      const count = 8
      const bins = Array.from({ length: count }, (_, index) => ({
        from: min + (span * index) / count,
        to: min + (span * (index + 1)) / count,
        total: 0
      }))
      speeds.forEach((speed) => {
        let index = Math.floor(((speed - min) / span) * count)
        if (index >= count) index = count - 1
        bins[index].total += 1
      })
      return bins.map((bin) => ({
        label: `${bin.from.toFixed(1)}-${bin.to.toFixed(1)}`,
        percent: Math.round((bin.total / speeds.length) * 1000) / 10
      }))
    }
  },
  watch: {
    'tools.fullscreen'(value) {
      const node = this.$el
      if (!node) return
      if (value && !document.fullscreenElement && node.requestFullscreen) {
        node.requestFullscreen().catch(() => {})
      } else if (!value && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    },
    profileAnchor() {
      this.syncProfileMarker()
    },
    'tools.profileMarker'() {
      this.syncProfileMarker()
    },
    'tools.deviceLayer'() {
      this.syncDeviceMarker()
    },
    fieldCenter() {
      this.syncDeviceMarker()
    }
  },
  mounted() {
    this.prepareMap()
  },
    beforeUnmount() {
      const map = this.mapCtx && this.mapCtx.map
      if (map) {
        map.off('mousemove', this.onMapMove)
        map.off('click', this.onMapClick)
        if (this.onViewChange) {
          map.off('rotatechange', this.onViewChange)
          map.off('rotateend', this.onViewChange)
          map.off('pitchchange', this.onViewChange)
          map.off('viewchange', this.onViewChange)
        }
        if (this.profileMarker) map.remove(this.profileMarker)
        if (this.deviceMarker) map.remove(this.deviceMarker)
      }
    },
  methods: {
    async prepareMap() {
      await Promise.all([
        this.ensureLevels(),
        ensureAmap().catch(() => {})
      ])
      this.mapReady = true
    },
    applyCenter(header) {
      if (!this.sampleGeoreferenced || this.centerLocked || !header) return
      const lng = (header.lo1 + header.lo2) / 2
      const lat = (header.la1 + header.la2) / 2
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return
      this.mapView = { center: [lng, lat], zoom: zoomFor(header), zooms: this.mapView.zooms }
      this.centerLocked = true
    },
    async loadLevel(stamp, height) {
      const key = stamp + ':' + height
      if (this.levelCache[key]) return this.levelCache[key]
      const [decoded, shear] = await Promise.all([
        readRaster('/wind-3d/wind_rgb_' + height + 'm_' + stamp + '.png', decodeWindFieldImage),
        readRaster('/wind-3d/ws_rgb_' + height + 'm_' + stamp + '.png', decodeShearImage)
      ])
      if (!decoded || !decoded.header) return null
      const sameGrid = shear && shear.horizontal && shear.horizontal.length === decoded.speeds.length
      const level = {
        height,
        header: decoded.header,
        speeds: decoded.speeds,
        dirs: decoded.dirs,
        uvs: decoded.uvs,
        horizontal: sameGrid ? shear.horizontal : [],
        vertical: sameGrid ? shear.vertical : []
      }
      this.levelCache = { ...this.levelCache, [key]: level }
      this.applyCenter(decoded.header)
      return level
    },
    async ensureLevels() {
      const stamp = this.activeStamp
      const heights = this.wind.heights.map(Number).filter((height) => MOCK_HEIGHTS.includes(height))
      await Promise.all(heights.map((height) => this.loadLevel(stamp, height)))
    },
    onMapReady(ctx) {
      this.mapCtx = ctx
      const map = ctx && ctx.map
      if (!map) return
      map.on('mousemove', this.onMapMove)
      map.on('click', this.onMapClick)
      this.onViewChange = () => {
        if (this.viewHold) return
        if (typeof map.getRotation === 'function') {
          const rotation = Number(map.getRotation())
          if (Number.isFinite(rotation)) this.viewRotation = rotation
        }
        if (typeof map.getPitch === 'function') {
          const pitch = Number(map.getPitch())
          if (Number.isFinite(pitch)) this.viewPitch = pitch
        }
      }
      map.on('rotatechange', this.onViewChange)
      map.on('rotateend', this.onViewChange)
      map.on('pitchchange', this.onViewChange)
      map.on('viewchange', this.onViewChange)
      this.onViewChange()
      this.syncProfileMarker()
      this.syncDeviceMarker()
    },
    onResetView() {
      this.viewHold = true
      this.viewPitch = 0
      this.viewRotation = 0
      const map = this.mapCtx && this.mapCtx.map
      if (map) {
        if (map.setRotation) map.setRotation(0, true)
        if (map.setPitch) map.setPitch(0, true)
      }
      window.setTimeout(() => {
        this.viewHold = false
      }, 300)
    },
    sampleLevel(level, lng, lat) {
      const header = level.header
      if (!header || !header.dx || !header.dy) return null
      const col = Math.round((lng - header.lo1) / header.dx)
      const row = Math.round((header.la1 - lat) / header.dy)
      if (col < 0 || row < 0 || col >= header.nx || row >= header.ny) return null
      const index = row * header.nx + col
      return {
        height: level.height,
        speed: level.speeds[index],
        dir: level.dirs ? level.dirs[index] : null
      }
    },
    onMapMove(event) {
      if(!this.sampleGeoreferenced) { this.tip.show=false;return }
      const lnglat = event && event.lnglat
      const pixel = event && event.pixel
      if (!lnglat || !pixel || !this.fieldLevels.length) {
        this.tip.show = false
        return
      }
      const lng = lnglat.getLng()
      const lat = lnglat.getLat()
      const samples = this.fieldLevels
        .map((level) => this.sampleHover(level, lng, lat))
        .filter((item) => item && (item.wind || item.warn))
      if (!samples.length) {
        this.tip.show = false
        return
      }
      const sample = samples[samples.length - 1]
      const speed = sample.wind ? Math.round(sample.wind.speed * 10) / 10 : null
      const direction = sample.wind && Number.isFinite(Number(sample.wind.dir))
        ? `${Math.round(Number(sample.wind.dir))}°`
        : this.$t('wind3d.tooltip.missing')
      const warn = sample.warn
      this.tip = {
        show: true,
        x: pixel.x + 16,
        y: pixel.y + 16,
        height: sample.height,
        speedText: speed == null ? this.$t('wind3d.tooltip.missing') : `${speed} m/s`,
        directionText: direction,
        warnType: warn ? this.$t('wind3d.types.' + warn.typeKey) : '',
        warnLevel: warn ? this.$t('wind3d.levels.' + warn.levelKey) : '',
        warnSeverity: warn ? warn.levelKey : '',
        warnValue: warn ? `${warn.valueText} ${warn.unit}` : ''
      }
    },
    onMapClick(event) {
      if (!this.tools.verticalSection || !event || !event.lnglat) return
      this.profilePoint = { lng: event.lnglat.getLng(), lat: event.lnglat.getLat() }
    },
    sampleHover(level, lng, lat) {
      const wind = this.sampleLevel(level, lng, lat)
      const windHit = wind && wind.speed !== 9999 && Number.isFinite(wind.speed) ? wind : null
      const warn = this.sampleWarn(level, lng, lat)
      if (!windHit && !warn) return null
      return { height: level.height, wind: windHit, warn }
    },
    sampleWarn(level, lng, lat) {
      if (!this.warnKind) return null
      const header = level.header
      const values = this.warnSeries(level)
      if (!header || !header.dx || !header.dy || !values || values.length !== header.nx * header.ny) return null
      const col = Math.round((lng - header.lo1) / header.dx)
      const row = Math.round((header.la1 - lat) / header.dy)
      if (col < 0 || row < 0 || col >= header.nx || row >= header.ny) return null
      const value = values[row * header.nx + col]
      const configured = this.alertThresholds[this.warnKind]
      if (!configured) return null
      const threshold = resolveThreshold(this.warnKind, configured)
      const severity = warnSeverity(value, threshold)
      if (severity < 0) return null
      const typeKey = { horizontal: 'shearH', vertical: 'shearV', gale: 'gale' }[this.warnKind]
      return {
        typeKey,
        levelKey: warnLevelKey(severity),
        valueText: formatWarnValue(value, this.warnKind),
        unit: threshold.unit
      }
    },
    warnSeries(level) {
      if (this.warnKind === 'gale') return level.speeds || []
      if (this.warnKind === 'vertical') return level.vertical || []
      if (this.warnKind === 'horizontal') return level.horizontal || []
      return []
    },
    warnValues(level) {
      return this.warnSeries(level).slice()
    },
    onAlertDblClick(row) {
      const height = Number(String(row.height).match(/-?\d+(?:\.\d+)?/))
      const warn = row.type
      if (!Number.isFinite(height)) {
        ElMessage.warning({ message: this.$t('wind3d.alertHeightMissing'), offset: 120 })
        return
      }
      if (!['shearH', 'shearV', 'gale'].includes(warn)) {
        ElMessage.warning({ message: this.$t('wind3d.alertTypeMissing'), offset: 120 })
        return
      }
      const available = (this.$refs.windPanel && this.$refs.windPanel.heights) || []
      if (!available.some((item) => Number(item) === height)) {
        ElMessage.warning({ message: this.$t('wind3d.alertHeightUnavailable', { height }), offset: 120 })
        return
      }
      if (this.$refs.windPanel) this.$refs.windPanel.applyLinkage(height, warn)
    },
    syncDeviceMarker() {
      const map = this.mapCtx && this.mapCtx.map
      const anchor = this.fieldCenter
      if (!this.sampleGeoreferenced || !map || !window.AMap || !this.tools.deviceLayer || !anchor) {
        if (this.deviceMarker && map) map.remove(this.deviceMarker)
        this.deviceMarker = null
        return
      }
      if (!this.deviceMarker) {
        this.deviceMarker = new window.AMap.Marker({
          position: anchor,
          title: this.$t('wind3d.deviceMark'),
          zIndex: 210
        })
        map.add(this.deviceMarker)
        return
      }
      this.deviceMarker.setPosition(anchor)
    },
    syncProfileMarker() {
      const map = this.mapCtx && this.mapCtx.map
      const anchor = this.profileAnchor
      if (!this.sampleGeoreferenced || !map || !window.AMap || !this.tools.profileMarker || !anchor) {
        if (this.profileMarker && map) map.remove(this.profileMarker)
        this.profileMarker = null
        return
      }
      if (!this.profileMarker) {
        this.profileMarker = new window.AMap.CircleMarker({
          center: anchor,
          radius: 6,
          strokeColor: '#30a0a4',
          strokeWeight: 2,
          fillColor: '#ffffff',
          fillOpacity: 1,
          zIndex: 200,
          bubble: true
        })
        map.add(this.profileMarker)
        return
      }
      this.profileMarker.setCenter(anchor)
    },
    onLegendConfirm(payload) {
      this.legendMin = payload.valueMin
      this.legendMax = payload.valueMax
      this.windColors = payload.colors
      this.windDomain = payload.domainPoints
    },
    onWindChange(state) {
      this.wind = { ...this.wind, ...state }
      this.ensureLevels()
    },
    onTimeChange(value) {
      const stamp = nearestStamp(value)
      this.selectedTime = this.referenceMode ? MOCK_STAMPS.find(item=>item.id===stamp).at.replace('T',' ') : value
      if (stamp !== this.activeStamp) {
        this.activeStamp = stamp
        this.ensureLevels()
      }
      if(this.referenceMode)return
      listWindAlerts({ time: value }).then((res) => {
        const rows = Array.isArray(res.rows) ? res.rows : (Array.isArray(res.data) ? res.data : [])
        if (!rows.length) return
        this.alerts = rows.map((row) => ({
          height: row.alertHeightText || (row.alertHeight != null ? row.alertHeight + ' m' : '-'),
          type: row.alertType || 'gale',
          level: row.level || 'light',
          threshold: row.alertThreshold || row.threshold || '',
          unit: row.alertUnit || row.unit || ''
        }))
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.wind3d-page {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: #07141c;
  color: #d7e4f5;
}
.wind3d-page__map {
  position: absolute;
  inset: 0;
}
.section-hint,
.histogram-card,
.wind-tip {
  position: absolute;
  z-index: 6;
  color: #fff;
}
.section-hint {
  top: 16px;
  left: 360px;
  margin: 0;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #30a0a4;
  border-radius: 5px;
}
.histogram-card {
  top: 64px;
  left: 360px;
  width: 280px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #30a0a4;
  border-radius: 5px;
  transition: transform 0.35s ease;
}
.histogram-card.is-off {
  transform: translateX(calc(-100% - 380px));
  pointer-events: none;
}
.histogram-row {
  display: grid;
  grid-template-columns: 72px 1fr 42px;
  gap: 8px;
  align-items: center;
  margin-top: 6px;
  font-size: 12px;
}
.histogram-track {
  height: 8px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}
.histogram-track i {
  display: block;
  height: 100%;
  background: #30a0a4;
  border-radius: 4px;
}
.wind-tip {
  min-width: 140px;
  padding: 8px 10px;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.72);
  border: 1px solid #30a0a4;
  border-radius: 4px;
}
.wind-tip p { margin: 0; line-height: 1.5; font-size: 12px; }
.right-stack {
  position: absolute;
  top: 16px;
  right: 16px;
  bottom: 128px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 320px;
  transition: transform 0.35s ease;
}
.wind3d-page.is-drawing .right-stack {
  transform: translateX(calc(100% + 60px));
  pointer-events: none;
}
.wind3d-page.is-drawing .wind-tip { display: none; }
.wind3d-page :deep(.wind-field-panel) {
  z-index: 5;
  max-height: calc(100% - 144px);
  transition: transform 0.35s ease;
}
.wind3d-page.is-drawing :deep(.wind-field-panel) {
  transform: translateX(calc(-100% - 60px));
  pointer-events: none;
}
.side-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #30a0a4;
  border-radius: 5px;
  box-shadow: 0 2px 6px rgba(255, 255, 255, 0.2), 0 4px 16px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(36px);
}
.side-card--profile { flex: 1; }
.side-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  color: #fff;
  font-size: 14px;
}
.side-card__head span { color: #8b97ad; font-size: 12px; }
.alert-table {
  overflow-x: hidden;
  overflow-y: auto;
}
.alert-row {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 0.7fr);
  gap: 6px;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 8px 4px;
  border: 0;
  border-bottom: 1px solid rgba(48, 160, 164, 0.35);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.alert-row.is-head { color: #8b97ad; cursor: default; }
.alert-row:hover:not(.is-head) { background: rgba(48, 160, 164, 0.28); }
.is-light { color: #ffd446; }
.is-medium { color: #f78b1f; }
.is-severe { color: #ff3131; }
.side-empty { margin: 12px 0; color: #8b97ad; text-align: center; }
.profile-plot { flex: 1; min-height: 220px; }
.profile-plot :deep(.profile-chart) {
  background: transparent;
  border: 0;
}
.slider-container {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 6;
  display: flex;
  flex-flow: row nowrap;
  align-items: stretch;
  box-sizing: border-box;
  width: 100%;
  padding: 20px;
  pointer-events: none;
  transition: transform 0.35s ease;
}
.wind3d-page.is-drawing .slider-container {
  transform: translateY(120%);
}
.slider-container > * { pointer-events: auto; }
.wind3d-page.is-drawing .slider-container > * { pointer-events: none; }
.time-wrap {
  display: flex;
  flex: 1;
  align-items: stretch;
  min-width: 0;
  margin-right: 20px;
}
.time-wrap :deep(.time-player-slider) { width: 100%; }
.dataslider-wrap {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  width: 360px;
  max-width: 360px;
}
.wind3d-page :deep(.wind-map-toolbar) {
  right: 348px;
  bottom: 128px;
  z-index: 7;
}
.wind3d-page.is-drawing :deep(.wind-map-toolbar) {
  right: 16px;
}
.tile-field {
  position: absolute;
  top: 16px;
  left: 358px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 420px;
  color: #d7e4f5;
  font-size: 12px;
  transition: transform 0.35s ease;
}
.tile-field.is-off {
  transform: translateX(calc(-100% - 380px));
  pointer-events: none;
}
.tile-field .el-input { flex: 1; }
</style>

<style scoped>
.basemap-notice { position: absolute; top: 44px; left: 50%; transform: translateX(-50%); z-index: 8; background: #101d38; color: #d7e4f5; padding: 8px 12px; font-size: 13px; max-width: 50%; }
.basemap-credit { position: absolute; bottom: 3px; right: 5px; z-index: 8; color: #fff; background: #101d38; font-size: 11px; }
</style>

<style scoped>
.wind3d-observation-controls { position: absolute; left: 50%; top: 90px; transform: translateX(-50%); z-index: 8; max-width: 50%; }
</style>
