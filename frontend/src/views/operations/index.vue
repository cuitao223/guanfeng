<template>
  <section class="operations-overview">
    <aside class="operations-sidebar"><div><p class="portal-eyebrow">WEATHER OPERATIONS</p><h1>{{ t('stationTitle') }}</h1><p class="portal-muted">{{ t('stationIntro') }}</p></div><div class="operations-mini-stats"><div><strong>{{ observations.length }}</strong><span>{{ t('stations') }}</span></div><div><strong>{{ temperatureRange }}</strong><span>°C</span></div></div><p class="portal-source-note">{{ t('snapshotHint') }}</p><el-input v-model="search" clearable :placeholder="t('stationSearch')" :aria-label="t('stationSearch')"/>
      <div class="operations-station-list"><button v-for="row in filtered" :key="row.id" type="button" class="operations-station" :class="{'is-active':selectedId === row.id}" @click="selectedId=row.id" :data-station-row="row.id"><span><strong>{{ row.name }}</strong><small>{{ row.id }}</small></span><span>{{ row.temperatureC === null ? '—' : row.temperatureC.toFixed(1) }} °C<small>{{ row.windSpeedMs === null ? '—' : row.windSpeedMs.toFixed(1) }} m/s</small></span></button></div>
      <section class="operations-data-link"><strong>{{ t('radarData') }}</strong><p>{{ datasets.length }} {{ $t('portal.availableDatasets') }}</p><el-button type="primary" @click="$router.push('/operations/analysis')">{{ t('openAnalysis') }} →</el-button></section>
    </aside>
    <div class="operations-map"><real-map :selected-station="selectedId" @select-station="selectedId=$event" :note="t('stationType')"/></div>
  </section>
</template>
<script>
import RealMap from '@/components/RealMap/index.vue'
import { snapshot } from '@/utils/maps/observations'
import { wb } from '@/api/workbench'
export default {
  name: 'OperationsOverview', components: { RealMap },
  data() { return { observations: snapshot.observations, search: '', selectedId: '', datasets: [] } },
  computed: { filtered() { const q=this.search.trim().toLowerCase();return this.observations.filter(r=>r.name.toLowerCase().includes(q)||r.id.toLowerCase().includes(q)) }, temperatureRange() { const values=this.observations.map(r=>r.temperatureC).filter(Number.isFinite);return values.length ? `${Math.min(...values)} ~ ${Math.max(...values)}` : '—' } },
  created() { wb('/datasets').then(d=>this.datasets=d).catch(()=>{}) },
  methods: { t(k) { return this.$t('portal.'+k) } }
}
</script>
