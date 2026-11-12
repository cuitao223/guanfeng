<template>
  <section class="wind-scene" data-testid="real-wind-scene" :data-frame="frameIndex" :data-layers="selectedPressures.length">
    <leice-map3d v-if="ready" :key="viewKey" :center="center" :zoom="6.7" :zooms="[3,15]" :pitch="pitch" :rotation="-20" :map-style="mapStyle" :satellite-tiles="satellite" :vector-tiles="vector" @ready="onMapReady">
      <wind-field-layer v-if="forms.includes('field')" :levels="visibleLevels" height-mode="multi" :exaggeration="exaggeration" :opacity="opacity" :color-style="colorStyle" :legend-min="colorMin" :legend-max="colorMax" :colors="colors" :domain-points="colorDomain"/>
      <wind-barb-layer v-if="forms.includes('barbs')" :levels="visibleLevels" height-mode="multi" :exaggeration="exaggeration" :density="1.5" :zoom="7" :size-scale="8" :map-style="mapStyle"/>
      <wind-particle-layer v-if="forms.includes('particles')" :levels="visibleLevels" height-mode="multi" :exaggeration="exaggeration" :map-style="mapStyle"/>
      <volume-scale-layer v-if="showRuler" :levels="visibleLevels" height-mode="multi" :exaggeration="exaggeration" :map-style="mapStyle" height-label="gpm" height-unit="gpm"/>
      <warn-overlay-layer v-if="showExceedances" :levels="ruleLevels" warn-type="gale" :thresholds="ruleThresholds" height-mode="multi" :exaggeration="exaggeration" :opacity="0.6" :map-style="mapStyle"/>
    </leice-map3d>
    <aside class="wind-card wind-controls">
      <p class="portal-eyebrow">GFS · PRESSURE LEVELS</p><h1>{{ t('title') }}</h1><p class="wind-subtitle">{{ t('subtitle') }}</p>
      <div class="wind-badge">{{ t('kind') }}</div><p>{{ t('region') }}</p>
      <h3>{{ t('layers') }}</h3><el-checkbox-group v-model="selectedPressures" data-testid="pressure-controls"><el-checkbox v-for="level in currentFrame.levels" :key="level.pressure" :value="level.pressure" :label="level.pressure + ' hPa · ' + Math.round(level.height) + ' gpm'"/></el-checkbox-group>
      <h3>{{ t('forms') }}</h3><el-checkbox-group v-model="forms" data-testid="form-controls"><el-checkbox value="field" :label="t('field')"/><el-checkbox value="barbs" :label="t('barbs')"/><el-checkbox value="particles" :label="t('particles')"/></el-checkbox-group>
      <div class="wind-control-title"><span>{{ t('opacity') }}</span><b>{{ Math.round(opacity * 100) }}%</b></div><el-slider v-model="opacity" :min="0.1" :max="1" :step="0.05"/>
      <div class="wind-control-title"><span>{{ t('exaggeration') }}</span><b>×{{ exaggeration }}</b></div><el-slider v-model="exaggeration" :min="1" :max="60" :step="1"/>
      <div class="wind-control-title"><span>{{ t('pitch') }}</span><b>{{ pitch }}°</b></div><el-slider v-model="pitch" :min="25" :max="75"/>
      <el-radio-group v-model="colorStyle" size="small"><el-radio-button value="smooth">{{ t('smooth') }}</el-radio-button><el-radio-button value="contour">{{ t('contour') }}</el-radio-button></el-radio-group>
      <el-radio-group v-model="mapStyle" size="small"><el-radio-button value="satellite">{{ t('satellite') }}</el-radio-button><el-radio-button value="vector">{{ t('vector') }}</el-radio-button></el-radio-group>
      <div class="wind-tools-row"><el-checkbox v-model="showRuler" data-testid="wind-ruler">{{ t('ruler') }}</el-checkbox><el-button @click="analysisOpen=true" data-testid="wind-analysis-tools">{{ t('analysisTools') }}</el-button><el-button @click="drawActive=!drawActive" data-testid="wind-annotations">{{ t(drawActive?'closeAnnotations':'annotations') }}</el-button><el-button @click="toggleFullscreen">{{ t('fullscreen') }}</el-button><el-button @click="colorSettingsOpen=true">{{ t('colorSettings') }}</el-button><el-button @click="resetView">{{ t('reset') }}</el-button></div>
    </aside>
    <aside class="wind-card wind-values" data-testid="wind-values"><p class="portal-eyebrow">{{ t('readout') }}</p><h2>{{ t('details') }}</h2><p>{{ t('grid') }}：{{ sampleLongitude.toFixed(2) }}°E / {{ sampleLatitude.toFixed(2) }}°N</p><p class="wind-muted">{{ t('pickHint') }}</p><el-alert v-if="pickError" :title="pickError" type="warning" :closable="false"/>
      <table><thead><tr><th>{{ t('pressure') }}</th><th>{{ t('height') }}</th><th>{{ t('speed') }}</th><th>{{ t('direction') }}</th></tr></thead><tbody><tr v-for="level in currentFrame.levels" :key="level.pressure"><td>{{ level.pressure }} hPa</td><td>{{ level.geopotentialHeights[sampleIndex].toFixed(0) }} gpm</td><td>{{ level.speeds[sampleIndex].toFixed(1) }} m/s</td><td>{{ level.dirs[sampleIndex].toFixed(0) }}°</td></tr></tbody></table>
      <p class="wind-muted">{{ t('method') }}</p><p class="wind-muted">{{ t('particleNote') }}</p>
      <details><summary>{{ t('sourceDetail') }}</summary><p>{{ t('source') }}</p><p>{{ t('cycle') }}：{{ formatTime(data.cycle) }}</p><p>{{ t('stats') }}</p><p>u / v → √(u² + v²) · m/s</p><el-button text @click="downloadFrame">{{ t('download') }}</el-button></details>
    </aside>
    <div v-if="!selectedPressures.length" class="wind-empty">{{ t('empty') }}</div>
    <div v-if="error || !ready" class="wind-empty">{{ error || t('loading') }}</div>
    <footer class="wind-card wind-timeline"><div><strong>{{ t('valid') }}：{{ formatTime(currentFrame.validTime) }}</strong><span>{{ currentFrame.forecastHour === 0 ? t('analysis') : '+' + currentFrame.forecastHour + ' h' }}</span></div><div class="wind-time-buttons"><el-button :type="playing ? 'warning' : 'primary'" @click="togglePlay" data-testid="wind-play">{{ t(playing ? 'pause' : 'play') }}</el-button><el-button v-for="(frame,index) in data.frames" :key="frame.validTime" :type="frameIndex === index ? 'primary' : ''" @click="selectFrame(index)" :data-testid="'wind-time-' + index">{{ formatTime(frame.validTime).slice(5) }}</el-button></div><div class="wind-colorbar"><span>{{ t('legend') }}</span><i :style="{background:colorGradient}"/><span>{{ colorMin }} — {{ colorMax }}</span></div></footer>
    <picture-edit-overlay :active="drawActive"/>
    <wind-color-scale-dialog v-model="colorSettingsOpen" :colors="colors" :domain-points="colorDomain" :value-min="colorMin" :value-max="colorMax" @confirm="applyColors"/>
    <el-dialog v-model="analysisOpen" class="platform-form-dialog platform-form-dialog--md wind-analysis-dialog" :title="t('analysisTools')">
      <el-tabs v-model="analysisTab"><el-tab-pane name="profile" :label="t('profile')"><p>{{ t('profileHint') }}</p><div class="wind-profile-chart"><profile-chart :height-arr="profileHeights" :value="profileSpeeds" :height-max="6500" :title="t('profile')" unit="m/s" height-unit="gpm" theme="dark"/></div></el-tab-pane>
      <el-tab-pane name="histogram" :label="t('histogram')"><p>{{ t('histogramHint') }}</p><div class="wind-histogram"><div v-for="bin in histogram" :key="bin.min" class="wind-histogram-row"><span>{{ bin.min }}–{{ bin.max }} m/s</span><i :style="{width:bin.count / Math.max(...histogram.map(x=>x.count),1)*65+'%'}"/><b>{{ bin.count }}</b></div></div><p>{{ t('checked') }}：{{ checkedCount }}</p></el-tab-pane>
      <el-tab-pane name="rule" :label="t('rule')"><el-alert :title="t('ruleHint')" type="info" :closable="false"/><el-form class="wind-rule-form"><el-form-item :label="t('threshold')"><el-input-number v-model="speedThreshold" :min="0" :max="100" :step="1" data-testid="wind-rule-threshold"/></el-form-item><el-form-item><el-checkbox v-model="showExceedances" data-testid="wind-rule-overlay">{{ t('overlay') }}</el-checkbox></el-form-item></el-form><p data-testid="wind-rule-count">{{ t('exceed') }}：{{ exceedanceCount }} / {{ checkedCount }}</p><el-table :data="ruleRows"><el-table-column prop="pressure" :label="t('pressure')"/><el-table-column prop="count" :label="t('exceed')"/></el-table></el-tab-pane></el-tabs>
    </el-dialog>
    <small class="wind-credit">{{ t('credit') }}</small>
  </section>
</template>
<script>
import { markRaw } from 'vue'
import LeiceMap3d from '@leice-map-3d/assets/layers/LeiceMap3d.vue'
import WindFieldLayer from '@leice-map-3d/assets/layers/WindFieldLayer.vue'
import WindBarbLayer from '@leice-map-3d/assets/layers/WindBarbLayer.vue'
import WindParticleLayer from '@leice-map-3d/assets/layers/WindParticleLayer.vue'
import VolumeScaleLayer from '@leice-map-3d/assets/layers/VolumeScaleLayer.vue'
import WarnOverlayLayer from '@leice-map-3d/assets/layers/WarnOverlayLayer.vue'
import PictureEditOverlay from '@/components/PictureEditOverlay/index.vue'
import WindColorScaleDialog from '@/components/WindColorScaleDialog/index.vue'
import { ProfileChart } from '@leice-charts/profile/assets/src'
import sourceData from '@/data/gfs-wind.json' 
import { loadAmap } from '@/utils/maps/loadAmap'
import { displayCoordinates } from '@/utils/maps/coordinates'
import { BASEMAPS } from '@/utils/maps/basemaps'
const projectedFrames = sourceData.frames.map(frame => ({ ...frame, levels: frame.levels.map(level => {
  const h = level.header
  const displayPoints = level.speeds.map((_,i) => displayCoordinates(h.lo1 + i % h.nx * h.dx, h.la1 - Math.floor(i / h.nx) * h.dy))
  const corners = {tl:displayPoints[0],tr:displayPoints[h.nx - 1],bl:displayPoints[(h.ny-1)*h.nx],br:displayPoints[h.nx*h.ny-1]}
  return { ...level, header: {...h,pointGrid:true,displayCoordinates:displayPoints,displayCorners:corners}, uvs:level.u.flatMap((u,i) => [u,-level.v[i]]) }
}) }))
export default {
  name: 'OperationsWind', components: {LeiceMap3d,WindFieldLayer,WindBarbLayer,WindParticleLayer,VolumeScaleLayer,WarnOverlayLayer,PictureEditOverlay,WindColorScaleDialog,ProfileChart},
  data() { return {analysisOpen:false,analysisTab:'profile',showRuler:false,drawActive:false,showExceedances:false,speedThreshold:15,colorSettingsOpen:false,colorMin:0,colorMax:30,colorDomain:[0,4.3,8.6,12.9,17.1,21.4,25.7,30],data:markRaw(sourceData),frames:markRaw(projectedFrames),ready:false,error:'',frameIndex:0,selectedPressures:[925,850,700,500],forms:['field','particles'],opacity:0.7,exaggeration:35,pitch:60,colorStyle:'smooth',mapStyle:'satellite',playing:false,timer:null,viewKey:0,context:null,pointMarker:null,pickError:'',sampleIndex:544,center:displayCoordinates(116,32),satellite:{base:BASEMAPS.satellite.url,label:BASEMAPS.satellite.label},vector:{base:BASEMAPS.vector.url},colors:['#1745cc','#008ed4','#00c4b4','#49d656','#d6e944','#ffbc32','#f36727','#cf243c']} },
  computed: {
    colorGradient() {const points=this.colorDomain.length===this.colors.length?this.colorDomain:this.colors.map((_,i)=>this.colorMin+i/(this.colors.length-1)*(this.colorMax-this.colorMin));return 'linear-gradient(90deg,'+this.colors.map((c,i)=>c+' '+((points[i]-this.colorMin)/(this.colorMax-this.colorMin)*100)+'%').join(',')+')'},
    profileHeights() {return this.currentFrame.levels.map(l=>l.geopotentialHeights[this.sampleIndex])},
    profileSpeeds() {return this.currentFrame.levels.map(l=>l.speeds[this.sampleIndex])},
    checkedCount() {return this.visibleLevels.reduce((n,l)=>n+l.speeds.length,0)},
    ruleRows() {return this.visibleLevels.map(l=>({pressure:l.pressure+' hPa',count:l.speeds.filter(v=>v>=this.speedThreshold).length}))},
    exceedanceCount() {return this.ruleRows.reduce((n,l)=>n+l.count,0)},
    ruleLevels() {return this.visibleLevels.map(l=>({...l,values:l.speeds}))},
    ruleThresholds() {return {gale:{min:this.speedThreshold,medium:this.speedThreshold+5,max:this.speedThreshold+10,unit:'m/s'}}},
    histogram() {return Array.from({length:7},(_,i)=>({min:i*5,max:(i+1)*5,count:this.visibleLevels.reduce((n,l)=>n+l.speeds.filter(v=>v>=i*5 && (i===6?v<=35:v<(i+1)*5)).length,0)}))},
    currentFrame() { return this.frames[this.frameIndex] },
    visibleLevels() { return this.currentFrame.levels.filter(l => this.selectedPressures.includes(l.pressure)) },
    sampleLongitude() { const h=this.currentFrame.levels[0].header;return h.lo1 + this.sampleIndex % h.nx * h.dx },
    sampleLatitude() { const h=this.currentFrame.levels[0].header;return h.la1 - Math.floor(this.sampleIndex/h.nx) * h.dy }
  },
  async mounted() { try { await loadAmap();this.ready=true } catch(e) { this.error=this.t('error') + ': ' + e.message } },
  beforeUnmount() { clearInterval(this.timer); if(this.pointMarker)this.pointMarker.setMap(null); if(this.context?.map) this.context.map.off('click',this.pickPoint) },
  methods: {
    async toggleFullscreen() {if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()},
    applyColors(config) {this.colors=config.colors;this.colorMin=config.valueMin;this.colorMax=config.valueMax;this.colorDomain=config.domainPoints},
    t(key) { return this.$t('windScene.'+key) },
    formatTime(value) { return new Intl.DateTimeFormat(this.$i18n.locale === 'En' ? 'en-GB' : 'sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)) + ' UTC+8' },
    onMapReady(ctx) { this.context=markRaw(ctx);ctx.map.on('click',this.pickPoint);this.syncPointMarker() },
    pickPoint(event) { if(!event.lnglat)return;const lng=event.lnglat.getLng(),lat=event.lnglat.getLat();const points=this.currentFrame.levels[0].header.displayCoordinates;const corners=this.currentFrame.levels[0].header.displayCorners;if(lng<Math.min(corners.tl[0],corners.bl[0]) || lng>Math.max(corners.tr[0],corners.br[0]) || lat<Math.min(corners.bl[1],corners.br[1]) || lat>Math.max(corners.tl[1],corners.tr[1])){this.pickError=this.t('outside');return}this.pickError='';let best=0,distance=Infinity;points.forEach(([x,y],i)=>{const d=(x-lng)**2+(y-lat)**2;if(d<distance){distance=d;best=i}});this.sampleIndex=best;this.syncPointMarker() },
    syncPointMarker() {if(!this.context?.map)return;if(this.pointMarker)this.pointMarker.setMap(null);this.pointMarker=markRaw(new window.AMap.Marker({position:this.currentFrame.levels[0].header.displayCoordinates[this.sampleIndex],title:this.t('point'),content:'<span class="wind-selected-point">＋</span>',anchor:'center',zIndex:600}));this.pointMarker.setMap(this.context.map)},
    resetView() { this.pitch=60;this.viewKey++ },
    selectFrame(index) { this.frameIndex=index },
    togglePlay() { this.playing=!this.playing;clearInterval(this.timer);if(this.playing)this.timer=setInterval(()=>{this.frameIndex=(this.frameIndex+1)%this.frames.length},3500) },
    downloadFrame() { const raw=this.data.frames[this.frameIndex];const blob=new Blob([JSON.stringify({source:this.data.source,cycle:this.data.cycle,bounds:this.data.bounds,units:{wind:'m/s',height:'gpm',pressure:'hPa'},...raw},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='gfs-wind-f'+raw.forecastHour+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000) }
  }
}
</script>
<style scoped lang="scss">
.wind-scene { position:relative;height:100%;min-height:650px;background:#091329;overflow:hidden;color:#fff; }
.wind-card { position:absolute;z-index:3;background:rgba(9,19,41,.94);border:1px solid #294e78;border-radius:12px;box-shadow:0 10px 32px rgba(0,0,0,.25);padding:22px; }
.wind-controls { left:24px;top:24px;width:310px;max-height:calc(100% - 215px);overflow:auto; }
.wind-card h1 { margin:6px 0 10px;font-size:28px; }.wind-card h2 {font-size:19px;margin:6px 0 14px;}.wind-card h3 {font-size:15px;margin:22px 0 10px;color:#a7c4fc;}.wind-card p {font-size:13px;line-height:1.65;margin:8px 0;}
.wind-subtitle,.wind-muted {color:#9fb7d9;}.wind-badge {border-left:3px solid #32ceba;background:rgba(0,196,180,.1);color:#73e5d8;padding:9px;font-size:12px;line-height:1.6;}.wind-control-title {display:flex;justify-content:space-between;margin-top:18px;font-size:14px;}.wind-controls :deep(.el-checkbox-group) {display:flex;flex-wrap:wrap;}.wind-controls :deep(.el-checkbox) {margin-right:18px;}.wind-controls :deep(.el-radio-group) {margin-top:14px;margin-right:8px;}.wind-reset {margin-top:18px;}
.wind-values {max-height:calc(100% - 215px);overflow:auto;right:24px;top:24px;width:370px;}.wind-values table {width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;}.wind-values th {color:#a7c4fc;text-align:left;font-weight:400;padding:10px 0;}.wind-values td {padding:12px 0;border-top:1px solid #233c60;}.wind-values td:nth-child(3) {color:#79eadc;font-weight:700;}.wind-values summary {font-size:13px;cursor:pointer;color:#77b7ff;margin-top:15px;}.wind-values details p {font-size:12px;}
.wind-timeline {bottom:34px;left:50%;transform:translateX(-50%);min-width:710px;padding:16px 24px;}.wind-timeline>div:first-child {display:flex;justify-content:space-between;font-size:15px;}.wind-timeline>div:first-child span {color:#73e5d8;}.wind-time-buttons {display:flex;gap:8px;margin:14px 0;}.wind-time-buttons .el-button+.el-button {margin-left:0;}.wind-colorbar {display:flex;align-items:center;gap:14px;font-size:12px;color:#a7c4fc;}.wind-colorbar i {height:10px;flex:1;border-radius:5px;background:linear-gradient(90deg,#1745cc,#008ed4,#00c4b4,#49d656,#d6e944,#ffbc32,#f36727,#cf243c);}.wind-credit {position:absolute;bottom:8px;right:18px;z-index:3;font-size:11px;color:#ddd;background:rgba(0,0,0,.65);padding:4px 8px;}.wind-empty {position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:4;background:#091329;padding:20px;border-radius:8px;}
.wind-tools-row {display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;}.wind-tools-row .el-button+.el-button {margin-left:0;}.wind-controls:has(.picture-edit) {z-index:5;}.wind-controls {z-index:5;}.wind-profile-chart {height:340px;}.wind-histogram-row {display:flex;align-items:center;gap:12px;margin:14px 0;font-size:13px;}.wind-histogram-row>span {width:95px;flex-shrink:0;}.wind-histogram-row>i {height:18px;background:#2484f9;border-radius:4px;}.wind-histogram-row>b {min-width:30px;}.wind-rule-form {margin-top:24px;}
.wind-scene :deep(.wind-selected-point) {display:flex;align-items:center;justify-content:center;color:#fff;background:#206aff;border:2px solid #fff;border-radius:50%;width:22px;height:22px;font-size:19px;box-shadow:0 0 10px #091329;}
</style>
