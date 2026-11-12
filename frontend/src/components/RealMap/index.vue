<template>
  <div class="real-map">
    <leice-map-2d ref="base" :tile-url="source.url" :label-url="source.label || ''" :attribution="source.attribution" :center="center" :zoom="zoom" :min-zoom="minZoom" :max-zoom="maxZoom" :max-bounds="maxBounds" @ready="$emit('ready', $event)" @tile-status="status = $event">
      <weather-observations :selected-id="selectedStation" @select="$emit('select-station', $event)" :mode="observationMode" :enabled="observationsVisible" :gcj="usesGcj" :language="$i18n.locale" :translate="$t" />
      <slot />
    </leice-map-2d>
    <div class="real-map__status" :class="{ 'is-error': status === 'error' }" role="status">
      <span>{{ $t('realMap.' + status) }} &middot; {{ source.name }}</span>
      <button v-if="status === 'error'" type="button" @click="$refs.base.retryTiles()">{{ $t('realMap.retry') }}</button>
      <span v-if="note" class="real-map__note">{{ note }}</span>
      <observation-controls v-model:mode="observationMode" v-model:enabled="observationsVisible" />
    </div>
  </div>
</template>

<script>
import 'leaflet/dist/leaflet.css'
import WeatherObservations from '@/components/WeatherObservations/index.vue'
import ObservationControls from '@/components/WeatherObservations/Controls.vue'
import LeiceMap2d from '@leice-map-2d/assets/layers/LeiceMap2d.vue'
import { BASEMAPS, DEFAULT_MAP_CENTER, basemapFor } from '@/utils/maps/basemaps'

export default {
  name: 'RealMap',
  components: { LeiceMap2d, WeatherObservations, ObservationControls },
  props: {
    selectedStation: { type: String, default: '' },
    mapType: { type: String, default: 'vector' },
    tileUrl: { type: String, default: '' },
    center: { type: Array, default: () => DEFAULT_MAP_CENTER.slice() },
    zoom: { type: Number, default: 4 },
    minZoom: { type: Number, default: 2 },
    maxZoom: { type: Number, default: 18 },
    maxBounds: { type: Array, default: () => [[-85, -180], [85, 180]] },
    note: { type: String, default: '' }
  },
  emits: ['ready', 'select-station'],
  data() { return { status: 'loading', observationMode: 'temperature', observationsVisible: true } },
  computed: {
    usesGcj() { return this.source.url.includes('autonavi.com') },
    source() { return this.tileUrl.trim() ? { url: this.tileUrl.trim(), name: this.$t('realMap.custom'), attribution: this.$t('realMap.custom') } : { ...basemapFor(this.mapType), name: this.$t('realMap.' + (BASEMAPS[this.mapType] ? this.mapType : ({img:'satellite',vec:'vector',ter:'terrain'}[this.mapType] || 'vector'))) } }
  }
}
</script>

<style scoped>
.real-map { isolation: isolate; position: relative; width: 100%; height: 100%; }
.real-map__status { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); z-index: 600; max-width: 60%; padding: 8px 14px; background: #101d38; color: #d7e4f5; font-size: 13px; border-radius: 4px; pointer-events: none; }
.real-map__status.is-error { color: #ffbb66; }
.real-map__status button { pointer-events: auto; cursor: pointer; margin-left: 10px; color: #fff; background: #206aff; border: 0; border-radius: 4px; padding: 3px 8px; }
.real-map__note { display: block; margin-top: 4px; }
</style>
