<template>
  <div class="map-preview">
    <div ref="stage" class="map-preview__stage">
      <real-map ref="map" :map-type="mapType" :note="$t('realMap.layers')" @ready="mapInstance = $event" />
      <div
        v-show="tools.drawEdit"
        class="draw-layer"
        :class="'is-' + (drawMode || 'idle')"
        @mousedown="onDrawDown"
        @mousemove="onDrawMove"
        @mouseup="onDrawUp"
        @mouseleave="onDrawUp"
      >
        <div
          v-for="item in drawings"
          :key="item.id"
          class="draw-item"
          :class="'is-' + item.type"
          :style="itemStyle(item)"
          @mousedown.stop="onItemDown(item, $event)"
        >
          <span v-if="item.type === 'text'">{{ item.text }}</span>
        </div>
        <div v-if="draft" class="draw-item" :class="'is-' + draft.type" :style="itemStyle(draft)"></div>
      </div>
    </div>

    <div v-show="tools.drawEdit" class="pic-btn-control">
      <div class="pic-btn-left">
        <button
          v-for="mode in drawModes"
          :key="mode"
          type="button"
          class="pic-btn"
          :class="{ 'is-active': drawMode === mode }"
          @click="toggleDrawMode(mode)"
        >
          {{ $t('widget.wind3d.picture.' + mode) }}
        </button>
      </div>
      <div class="pic-btn-right">
        <button type="button" class="pic-btn" @click="undoDraw">{{ $t('widget.wind3d.picture.undo') }}</button>
        <button type="button" class="pic-btn" @click="clearDraw">{{ $t('widget.wind3d.picture.clear') }}</button>
        <button type="button" class="pic-btn" @click="downloadDraw">{{ $t('widget.wind3d.picture.download') }}</button>
      </div>
    </div>

    <wind-field-layer-panel
      v-show="!tools.drawEdit"
      :height-hint="$t('widget.wind3d.heightHint')"
      :disabled-warn="['shearV']"
      @change="onWindChange"
    />

    <aside v-show="!tools.drawEdit" class="right-stack">
      <layer-control-panel
        v-model:map-type="mapType"
        v-model:display-switches="displaySwitches"
      />
      <section class="side-card">
        <header class="side-card__head">
          <strong>{{ $t('widget.selectedTime') }}</strong>
          <span>{{ selectedTime || '--' }}</span>
        </header>
        <p class="side-empty">{{ windSummary }}</p>
      </section>
    </aside>

    <p v-show="tools.verticalSection && !tools.drawEdit" class="section-hint">{{ $t('wind3d.sectionHint') }}</p>

    <wind-map-toolbar
      v-model:device-layer="tools.deviceLayer"
      v-model:profile-marker="tools.profileMarker"
      v-model:draw-edit="tools.drawEdit"
      v-model:vertical-section="tools.verticalSection"
      v-model:fullscreen="tools.fullscreen"
      :show-manual="false"
      :rotation="tools.rotation"
      @reset-view="onResetView"
    />

    <footer v-show="!tools.drawEdit" class="slider-container">
      <div class="time-wrap">
        <time-player-slider @change="onTimeChange" />
      </div>
      <div class="dataslider-wrap">
        <wind-color-bar
          :value-min="legendMin"
          :value-max="legendMax"
          unit="m/s"
          :colors="windColors"
          :domain-points="windDomain"
          :color-type="colorStyle"
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
import { ElMessageBox } from 'element-plus'
import RealMap from '@/components/RealMap/index.vue'
import { WIND_LEGEND_COLORS, WIND_LEGEND_MAX, WIND_LEGEND_MIN, uniformStops } from '@leice-map-3d/assets/logic/legend.mjs'
import LayerControlPanel from '@/components/LayerControlPanel/index.vue'
import TimePlayerSlider from '@/components/TimePlayerSlider/index.vue'
import WindColorBar from '@/components/WindColorBar/index.vue'
import WindColorScaleDialog from '@/components/WindColorScaleDialog/index.vue'
import WindFieldLayerPanel from '@/components/WindFieldLayerPanel/index.vue'
import WindMapToolbar from '@/components/WindMapToolbar/index.vue'

export default {
  name: 'MapWidgets',
  components: {
    RealMap,
    LayerControlPanel,
    TimePlayerSlider,
    WindColorBar,
    WindColorScaleDialog,
    WindFieldLayerPanel,
    WindMapToolbar
  },
  data() {
    return {
      mapInstance: null,
      selectedTime: '',
      mapType: 'vec',
      windState: null,
      legendOpen: false,
      legendMin: WIND_LEGEND_MIN,
      legendMax: WIND_LEGEND_MAX,
      windColors: WIND_LEGEND_COLORS.slice(),
      windDomain: uniformStops(WIND_LEGEND_MIN, WIND_LEGEND_MAX, WIND_LEGEND_COLORS.length),
      tools: {
        deviceLayer: true,
        profileMarker: true,
        drawEdit: false,
        verticalSection: false,
        fullscreen: false,
        rotation: 25.5
      },
      displaySwitches: { radarIcon: true, windfarmIcon: true, placeName: true },
      drawModes: ['text', 'marker', 'rect', 'circle', 'edit'],
      drawMode: '',
      drawings: [],
      draft: null,
      drag: null,
      drawSeq: 1
    }
  },
  computed: {
    colorStyle() {
      return this.windState && this.windState.colorStyle === 'contour' ? 'contour' : 'smooth'
    },
    windSummary() {
      const state = this.windState
      if (!state) return '--'
      const forms = (state.forms || []).map((key) => this.$t(`widget.wind3d.forms.${key}`)).join(' / ')
      const heights = (state.heights || []).join(', ')
      const color = this.$t(`widget.wind3d.colors.${state.colorStyle || 'smooth'}`)
      const mapLabel = this.$t(this.mapType === 'vec' ? 'widget.layer.mapTypeVec' : this.mapType === 'ter' ? 'widget.layer.mapTypeTer' : 'widget.layer.mapTypeImg')
      return `${heights} m · ${forms} · ${color} · ${mapLabel}`
    }
  },
  watch: {
    'tools.drawEdit'(value) {
      if (value) {
        if (!this.drawMode) this.drawMode = 'text'
        return
      }
      this.drawMode = ''
      this.drawings = []
      this.draft = null
      this.drag = null
    },
    'tools.fullscreen'(value) {
      const node = this.$el
      if (!node) return
      if (value && !document.fullscreenElement && node.requestFullscreen) {
        node.requestFullscreen().catch(() => {})
      } else if (!value && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  },
  methods: {
    onWindChange(state) {
      this.windState = state
      if (state.mapType === 'vector') this.mapType = 'vec'
      else if (state.mapType === 'satellite' && this.mapType === 'vec') this.mapType = 'img'
    },
    onTimeChange(value) {
      this.selectedTime = value
    },
    onResetView() {
      this.tools.rotation = 0
      this.mapInstance?.setView([35, 105], 4)
    },
    onLegendConfirm(payload) {
      this.legendMin = payload.valueMin
      this.legendMax = payload.valueMax
      this.windColors = payload.colors
      this.windDomain = payload.domainPoints
    },
    toggleDrawMode(mode) {
      this.drawMode = this.drawMode === mode ? '' : mode
      this.draft = null
      this.drag = null
    },
    stagePoint(event) {
      const node = this.$refs.stage
      if (!node) return null
      const rect = node.getBoundingClientRect()
      if (!rect.width || !rect.height) return null
      return {
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100
      }
    },
    itemStyle(item) {
      const style = { left: item.x + '%', top: item.y + '%' }
      if (item.w) style.width = item.w + '%'
      if (item.h) style.height = item.h + '%'
      return style
    },
    pushDrawing(item) {
      this.drawings.push({ ...item, id: this.drawSeq })
      this.drawSeq += 1
    },
    onDrawDown(event) {
      if (!this.tools.drawEdit || this.drawMode === 'edit') return
      const point = this.stagePoint(event)
      if (!point) return
      if (this.drawMode === 'text') {
        this.addDrawText(point)
        return
      }
      if (this.drawMode === 'marker') {
        this.pushDrawing({ type: 'marker', x: point.x, y: point.y })
        return
      }
      if (this.drawMode === 'rect' || this.drawMode === 'circle') {
        this.draft = { type: this.drawMode, x: point.x, y: point.y, w: 0, h: 0, originX: point.x, originY: point.y }
      }
    },
    onDrawMove(event) {
      const point = this.stagePoint(event)
      if (!point) return
      if (this.drag) {
        const item = this.drawings.find((row) => row.id === this.drag.id)
        if (!item) return
        item.x = point.x - this.drag.dx
        item.y = point.y - this.drag.dy
        return
      }
      if (!this.draft) return
      this.draft.x = Math.min(this.draft.originX, point.x)
      this.draft.y = Math.min(this.draft.originY, point.y)
      this.draft.w = Math.abs(point.x - this.draft.originX)
      this.draft.h = Math.abs(point.y - this.draft.originY)
    },
    onDrawUp() {
      if (this.drag) {
        this.drag = null
        return
      }
      if (!this.draft) return
      const shape = this.draft
      this.draft = null
      if (shape.w < 0.4 || shape.h < 0.4) return
      this.pushDrawing({ type: shape.type, x: shape.x, y: shape.y, w: shape.w, h: shape.h })
    },
    onItemDown(item, event) {
      if (this.drawMode !== 'edit') return
      const point = this.stagePoint(event)
      if (!point) return
      this.drag = { id: item.id, dx: point.x - item.x, dy: point.y - item.y }
    },
    addDrawText(point) {
      ElMessageBox.prompt(
        this.$t('widget.wind3d.picture.textPrompt'),
        this.$t('widget.wind3d.picture.textTitle'),
        {
          confirmButtonText: this.$t('widget.wind3d.legend.confirm'),
          cancelButtonText: this.$t('widget.wind3d.legend.cancel')
        }
      ).then(({ value }) => {
        const text = String(value || '').trim()
        if (!text) return
        this.pushDrawing({ type: 'text', x: point.x, y: point.y, text })
      }).catch(() => {})
    },
    undoDraw() {
      this.drawings.pop()
    },
    clearDraw() {
      this.drawings = []
      this.draft = null
    },
    downloadDraw() {
      const node = this.$refs.stage
      if (!node) return
      const rect = node.getBoundingClientRect()
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(rect.width))
      canvas.height = Math.max(1, Math.round(rect.height))
      const context = canvas.getContext('2d')
      context.fillStyle = '#0c2418'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.strokeStyle = '#46c4c8'
      context.fillStyle = '#ffffff'
      context.lineWidth = 2
      context.font = '16px sans-serif'
      this.drawings.forEach((item) => {
        const x = (item.x / 100) * canvas.width
        const y = (item.y / 100) * canvas.height
        if (item.type === 'text') {
          context.fillText(item.text, x, y)
          return
        }
        if (item.type === 'marker') {
          context.beginPath()
          context.arc(x, y, 6, 0, Math.PI * 2)
          context.fill()
          return
        }
        const w = ((item.w || 0) / 100) * canvas.width
        const h = ((item.h || 0) / 100) * canvas.height
        context.beginPath()
        if (item.type === 'circle') context.ellipse(x + w / 2, y + h / 2, Math.max(w, 1) / 2, Math.max(h, 1) / 2, 0, 0, Math.PI * 2)
        else context.rect(x, y, w, h)
        context.stroke()
      })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = 'map-sketch.png'
      link.click()
    }
  }
}
</script>

<style lang="scss" scoped>
.map-preview {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: #07141c;
  color: #d7e4f5;
}
.map-preview__stage {
  position: absolute;
  inset: 0;
}
.draw-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
}
.draw-layer.is-text,
.draw-layer.is-marker,
.draw-layer.is-rect,
.draw-layer.is-circle {
  cursor: crosshair;
}
.draw-layer.is-edit {
  cursor: default;
}
.draw-item {
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
}
.draw-layer.is-edit .draw-item {
  pointer-events: auto;
  cursor: move;
}
.draw-item.is-text {
  color: #ffffff;
  font-size: 16px;
  line-height: 22px;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
.draw-item.is-marker {
  width: 12px;
  height: 12px;
  margin-left: -6px;
  margin-top: -6px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #46c4c8;
}
.draw-item.is-rect,
.draw-item.is-circle {
  border: 2px solid #46c4c8;
  background: rgba(70, 196, 200, 0.16);
}
.draw-item.is-circle {
  border-radius: 50%;
}
.pic-btn-control {
  position: absolute;
  top: 16px;
  left: 50%;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 80%;
  height: 60px;
  padding: 0 16px;
  box-sizing: border-box;
  transform: translateX(-50%);
  border: 1px solid rgba(70, 196, 200, 0.45);
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(36px);
}
.pic-btn-left,
.pic-btn-right {
  display: flex;
  gap: 8px;
}
.pic-btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(70, 196, 200, 0.7);
  border-radius: 4px;
  background: rgba(70, 196, 200, 0.6);
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
}
.pic-btn:hover {
  background: rgba(70, 196, 200, 0.85);
}
.pic-btn.is-active {
  background: #0e6e72;
  border-color: #d7fffb;
}
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
}
.map-preview :deep(.wind-field-panel) {
  max-height: calc(100% - 144px);
}
.map-preview :deep(.layer-control) {
  align-items: stretch;
  width: 100%;
}
.map-preview :deep(.layer-card) {
  width: 100%;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #30a0a4;
  border-radius: 5px;
  box-shadow: 0 2px 6px rgba(255, 255, 255, 0.2), 0 4px 16px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(36px);
}
.side-card {
  padding: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #30a0a4;
  border-radius: 5px;
  box-shadow: 0 2px 6px rgba(255, 255, 255, 0.2), 0 4px 16px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(36px);
}
.side-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}
.side-card__head span,
.side-empty {
  color: #8b97ad;
  font-size: 12px;
}
.side-empty { margin: 0; }
.section-hint {
  position: absolute;
  top: 16px;
  left: 360px;
  z-index: 6;
  margin: 0;
  padding: 8px 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #30a0a4;
  border-radius: 5px;
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
}
.slider-container > * { pointer-events: auto; }
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
.map-preview :deep(.wind-map-toolbar) {
  right: 348px;
  bottom: 128px;
  z-index: 5;
}
</style>
