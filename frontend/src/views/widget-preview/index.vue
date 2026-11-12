<template>
  <div class="widget-preview">
    <layer-control-panel
      v-model:map-type="mapType"
      v-model:display-switches="displaySwitches"
    />
    <div class="ring-board">
      <percent-ring :percent="10" />
      <percent-ring :percent="25" />
      <percent-ring :percent="75" />
    </div>
    <div class="preview-status">
      <span>{{ $t('widget.selectedTime') }}: {{ selectedTime || '--' }}</span>
      <span>{{ mapType }}</span>
      <span>{{ displayText }}</span>
    </div>
    <time-player-slider class="preview-player" @change="onTimeChange" />
  </div>
</template>

<script>
import LayerControlPanel from '@/components/LayerControlPanel/index.vue'
import PercentRing from '@/components/PercentRing/index.vue'
import TimePlayerSlider from '@/components/TimePlayerSlider/index.vue'

export default {
  name: 'WidgetPreview',
  components: { LayerControlPanel, PercentRing, TimePlayerSlider },
  data() {
    return {
      selectedTime: '',
      mapType: 'img',
      displaySwitches: { radarIcon: true, windfarmIcon: true, placeName: true }
    }
  },
  computed: {
    displayText() {
      return Object.keys(this.displaySwitches)
        .filter((key) => this.displaySwitches[key])
        .join(', ')
    }
  },
  methods: {
    onTimeChange(value) {
      this.selectedTime = value
    }
  }
}
</script>

<style lang="scss" scoped>
.widget-preview {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 12px;
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(8, 28, 58, 0.2), rgba(8, 28, 58, 0.55)),
    #0b1d36;
}
.ring-board {
  position: absolute;
  left: 50%;
  top: 64px;
  transform: translateX(-50%);
  display: flex;
  gap: 56px;
  padding: 28px 48px 22px;
  border-radius: 12px;
  background: #fff;
}
.preview-status {
  position: absolute;
  left: 16px;
  top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #d7ecff;
  font-size: 13px;
}
.preview-player {
  position: absolute;
  left: 16px;
  right: 232px;
  bottom: 16px;
}
:deep(.layer-control) {
  position: absolute;
  top: 16px;
  right: 16px;
}
</style>
