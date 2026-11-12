<template>
  <div class="observation-controls" data-testid="observation-controls">
    <div><strong>{{ $t('realMap.observationSnapshot') }}</strong> · {{ count }} {{ $t('realMap.stations') }}</div>
    <div class="observation-controls__time">{{ time }} · NOAA / METAR</div>
    <div class="observation-controls__actions">
      <button type="button" :aria-pressed="mode === 'temperature'" @click="$emit('update:mode', 'temperature')">{{ $t('realMap.temperature') }}</button>
      <button type="button" :aria-pressed="mode === 'wind'" @click="$emit('update:mode', 'wind')">{{ $t('realMap.windSpeed') }}</button>
      <button type="button" :aria-pressed="enabled" @click="$emit('update:enabled', !enabled)">{{ $t(enabled ? 'realMap.hideObservations' : 'realMap.showObservations') }}</button>
      <span>{{ $t('realMap.clickStation') }}</span>
    </div>
    <div class="observation-controls__legend">{{ $t(mode === 'wind' ? 'realMap.windLegend' : 'realMap.temperatureLegend') }}</div>
  </div>
</template>
<script>
import { snapshot, observationTime } from '@/utils/maps/observations'
export default {
  name: 'ObservationControls',
  props: { mode: { type: String, default: 'temperature' }, enabled: { type: Boolean, default: true } },
  emits: ['update:mode', 'update:enabled'],
  computed: { count() { return snapshot.observations.length }, time() { return observationTime(snapshot.source.timeStart) + ' — ' + observationTime(snapshot.source.timeEnd) } }
}
</script>
<style scoped>
.observation-controls { pointer-events: auto; background: #101d38; color: #d7e4f5; padding: 8px 12px; border-radius: 4px; font-size: 12px; line-height: 1.5; }
.observation-controls__time, .observation-controls__legend { font-size: 11px; color: #a7c4fc; }
.observation-controls__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 5px 0; }
.observation-controls button { cursor: pointer; background: #091329; border: 1px solid #206aff; color: #d7e4f5; border-radius: 4px; padding: 3px 8px; font-size: 12px; }
.observation-controls button[aria-pressed="true"] { background: #206aff; color: #fff; }
</style>
