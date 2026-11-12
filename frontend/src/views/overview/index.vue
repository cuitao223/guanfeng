<template>
  <div class="overview">
    <nav class="overview__toc">
      <button type="button" @click="go('ui')">{{ $t('widget.gallery.ui') }}</button>
      <button type="button" @click="go('wind3d')">{{ $t('widget.gallery.wind3d') }}</button>
      <button type="button" @click="go('farm')">{{ $t('widget.gallery.farm') }}</button>
      <button type="button" @click="go('lidar')">{{ $t('widget.gallery.lidar') }}</button>
    </nav>

    <section :ref="'ui'" class="overview__stage">
      <h2>{{ $t('widget.gallery.ui') }}</h2>
      <div class="overview__stage-body">
        <layer-control-panel
          v-model:map-type="mapType"
          v-model:display-switches="displaySwitches"
        />
        <div class="overview__rings">
          <percent-ring :percent="10" />
          <percent-ring :percent="25" />
          <percent-ring :percent="75" />
        </div>
      </div>
      <p class="overview__meta">{{ $t('widget.selectedTime') }}: {{ selectedTime || '--' }} · {{ mapType }}</p>
      <time-player-slider @change="onTimeChange" />
    </section>

    <section :ref="'wind3d'">
      <h2>{{ $t('widget.gallery.wind3d') }}</h2>
      <div class="overview__map">
        <wind-field-layer-panel
          :height-hint="$t('widget.wind3d.heightHint')"
          :disabled-warn="['shearV']"
          @change="onWindChange"
        />
        <div class="overview__color-bar">
          <wind-color-bar
            :value-min="0"
            :value-max="20"
            unit="m/s"
            :colors="windColors"
            :domain-points="windDomain"
            :color-type="windState ? windState.colorStyle : 'smooth'"
            @open-settings="colorSettingsOpen = true"
          />
        </div>
        <wind-map-toolbar
          v-model:device-layer="tools.deviceLayer"
          v-model:profile-marker="tools.profileMarker"
          v-model:draw-edit="tools.drawEdit"
          v-model:vertical-section="tools.verticalSection"
          v-model:fullscreen="tools.fullscreen"
          v-model:manual="tools.manual"
          :rotation="tools.rotation"
          @reset-view="tools.rotation = 0"
        />
      </div>
      <p v-if="windState" class="overview__meta">{{ windSummary }}</p>
    </section>

    <section :ref="'farm'">
      <h2>{{ $t('widget.gallery.farm') }}</h2>
      <chart-preview />
    </section>

    <section :ref="'lidar'">
      <h2>{{ $t('widget.gallery.lidar') }}</h2>
      <lidar-gallery />
    </section>
  </div>
</template>

<script>
import ChartPreview from '@/views/chart-preview/index.vue'
import LayerControlPanel from '@/components/LayerControlPanel/index.vue'
import PercentRing from '@/components/PercentRing/index.vue'
import TimePlayerSlider from '@/components/TimePlayerSlider/index.vue'
import WindFieldLayerPanel from '@/components/WindFieldLayerPanel/index.vue'
import WindColorBar from '@/components/WindColorBar/index.vue'
import WindMapToolbar from '@/components/WindMapToolbar/index.vue'
import LidarGallery from './LidarGallery.vue'

export default {
  name: 'ComponentOverview',
  components: {
    ChartPreview,
    LayerControlPanel,
    PercentRing,
    TimePlayerSlider,
    WindColorBar,
    WindFieldLayerPanel,
    WindMapToolbar,
    LidarGallery
  },
  data() {
    return {
      selectedTime: '',
      mapType: 'img',
      windState: null,
      colorSettingsOpen: false,
      windColors: ['#1d4e89', '#7eb6d9', '#f2e6c2', '#e76f51', '#9b2226'],
      windDomain: [0, 4, 8, 12, 16, 20],
      tools: {
        deviceLayer: true,
        profileMarker: true,
        drawEdit: false,
        verticalSection: false,
        fullscreen: false,
        manual: false,
        rotation: 24
      },
      displaySwitches: { radarIcon: true, windfarmIcon: true, placeName: true }
    }
  },
  computed: {
    windSummary() {
      const state = this.windState
      if (!state) return ''
      const forms = state.forms.map((key) => this.$t(`widget.wind3d.forms.${key}`)).join(' / ')
      const heights = state.heights.join(', ')
      const color = this.$t(`widget.wind3d.colors.${state.colorStyle}`)
      const settings = this.colorSettingsOpen ? ` · ${this.$t('widget.wind3d.colorBarTitle')}` : ''
      return `${heights} m · ${forms} · ${color}${settings}`
    }
  },
  methods: {
    go(name) {
      const root = this.$el
      const target = this.$refs[name]
      const el = target && (target.nodeType ? target : target.$el)
      if (!root || !el) return
      root.scrollTop = el.offsetTop
    },
    onWindChange(state) {
      this.windState = state
    },
    onTimeChange(value) {
      this.selectedTime = value
    }
  }
}
</script>

<style lang="scss" scoped>
.overview {
  box-sizing: border-box;
  height: 100%;
  overflow: auto;
  padding-right: 4px;
}
.overview__toc {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 0;
  background: #111827;
}
.overview__toc button {
  height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: 8px;
  background: #206aff;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
.overview h2 {
  margin: 0 0 12px;
  color: #fff;
  font-size: 18px;
}
.overview__stage {
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(8, 28, 58, 0.2), rgba(8, 28, 58, 0.55)),
    #0b1d36;
}
.overview__stage-body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  min-height: 220px;
}
.overview__rings {
  display: flex;
  gap: 40px;
  padding: 24px 36px 18px;
  border-radius: 12px;
  background: #fff;
}
.overview__color-bar {
  position: absolute;
  right: 88px;
  bottom: 16px;
  left: 358px;
  z-index: 2;
}
.overview__map {
  position: relative;
  height: 640px;
  overflow: hidden;
  border: 1px solid rgba(48, 160, 164, 0.45);
  border-radius: 12px;
  background:
    radial-gradient(circle at 30% 40%, rgba(41, 219, 201, 0.16), transparent 42%),
    linear-gradient(180deg, #0c2430 0%, #07141c 100%);
}
.overview__meta {
  margin: 12px 0;
  color: rgba(255, 255, 255, 0.86);
  font-size: 13px;
}
.overview :deep(.chart-preview) {
  height: auto;
  overflow: visible;
}
</style>
