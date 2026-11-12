<template>
  <section class="operations-scene"><leice-map3d v-if="ready" :center="[105,35]" :zoom="5" :zooms="[2,18]" :pitch="50" :rotation="10" :map-style="mapStyle" :satellite-tiles="satellite" :vector-tiles="vector"><weather-observations3d :mode="mode" :enabled="visible" :language="$i18n.locale" :translate="$t"/></leice-map3d>
    <aside class="operations-scene-panel"><p class="portal-eyebrow">GEOGRAPHIC VIEW</p><h1>{{ $t('portal.scene') }}</h1><p>{{ $t('portal.sceneIntro') }}</p><el-radio-group v-model="mapStyle"><el-radio value="satellite">{{ $t('realMap.satellite') }}</el-radio><el-radio value="vector">{{ $t('realMap.vector') }}</el-radio></el-radio-group><observation-controls v-model:mode="mode" v-model:enabled="visible"/><p class="portal-muted">{{ $t('portal.source') }}<br>NOAA Aviation Weather Center</p><el-button @click="$router.push('/operations')">← {{ $t('portal.backOverview') }}</el-button><el-alert v-if="error" type="error" :title="error" :closable="false"/><p v-if="!ready && !error">{{ $t('portal.loading') }}</p></aside><span class="operations-map-credit">© 高德地图</span>
  </section>
</template>
<script>
import LeiceMap3d from '@leice-map-3d/assets/layers/LeiceMap3d.vue'
import WeatherObservations3d from '@/components/WeatherObservations/ThreeDimensional.vue'
import ObservationControls from '@/components/WeatherObservations/Controls.vue'
import { BASEMAPS } from '@/utils/maps/basemaps'
import { loadAmap } from '@/utils/maps/loadAmap'
export default { name:'OperationsScene',components:{LeiceMap3d,WeatherObservations3d,ObservationControls},data(){return{ready:false,error:'',mode:'temperature',visible:true,mapStyle:'satellite',satellite:{base:BASEMAPS.satellite.url,label:BASEMAPS.satellite.label},vector:{base:BASEMAPS.vector.url}}},async mounted(){try{await loadAmap();this.ready=true}catch(e){this.error=e.message}} }
</script>
