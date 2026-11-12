<template>
  <div class="wind-map-toolbar">
    <el-tooltip
      v-for="item in items"
      :key="item.key"
      effect="dark"
      placement="left"
      :content="item.tip"
    >
      <button
        type="button"
        class="wind-map-toolbar__btn"
        :class="{ 'is-active': item.active }"
        :aria-label="item.tip"
        @click="toggle(item.key)"
      >
        <svg v-if="item.key === 'deviceLayer'" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 5.2 8 2.2l6 3v1.2L8 9.4 2 6.4V5.2Z" />
          <path d="M2 8.2 8 11.2l6-3" />
          <path d="M2 11 8 14l6-3" />
        </svg>
        <svg v-else-if="item.key === 'profileMarker'" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.6a4.2 4.2 0 0 0-4.2 4.2c0 3.2 4.2 8.6 4.2 8.6s4.2-5.4 4.2-8.6A4.2 4.2 0 0 0 8 1.6Z" />
          <circle cx="8" cy="5.8" r="1.4" />
        </svg>
        <svg v-else-if="item.key === 'drawEdit'" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.2 11.6 11.2 2.6l2.2 2.2-9 9H2.2v-2.2Z" />
          <path d="M9.6 4.2 11.8 6.4" />
        </svg>
        <svg v-else-if="item.key === 'verticalSection'" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 13.2h12" />
          <path d="M3.4 13.2V7.2M6.6 13.2V4.4M9.8 13.2V8.4M13 13.2V5.6" />
        </svg>
        <svg v-else-if="item.key === 'fullscreen'" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.4 6.2V2.4h3.8M13.6 6.2V2.4H9.8M2.4 9.8v3.8h3.8M13.6 9.8v3.8H9.8" />
        </svg>
        <svg v-else viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 2.2v2.2M8 11.6v2.2M2.2 8h2.2M11.6 8h2.2" />
          <circle cx="8" cy="8" r="2.3" />
        </svg>
      </button>
    </el-tooltip>
    <el-tooltip effect="dark" placement="left" :content="compassTip">
      <button
        type="button"
        class="wind-map-toolbar__compass"
        :class="{ 'is-north': isNorth }"
        :aria-label="compassTip"
        @click="resetView"
      >
        <span class="wind-map-toolbar__dial" :style="dialStyle">
          <span class="wind-map-toolbar__n">N</span>
          <span class="wind-map-toolbar__e">E</span>
          <span class="wind-map-toolbar__s">S</span>
          <span class="wind-map-toolbar__w">W</span>
          <i class="wind-map-toolbar__needle" aria-hidden="true"></i>
        </span>
      </button>
    </el-tooltip>
    <el-tooltip v-if="showManual" effect="dark" placement="left" :content="manualTip">
      <button
        type="button"
        class="wind-map-toolbar__btn"
        :class="{ 'is-active': manual }"
        :aria-label="manualTip"
        @click="toggle('manual')"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.2 8.2a4.8 4.8 0 0 1 8.2-3.4" />
          <path d="M11.4 2.6v2.6H8.8" />
          <path d="M12.8 7.8a4.8 4.8 0 0 1-8.2 3.4" />
          <path d="M4.6 13.4V10.8h2.6" />
        </svg>
      </button>
    </el-tooltip>
  </div>
</template>

<script>
export default {
  name: 'WindMapToolbar',
  props: {
    deviceLayer: { type: Boolean, default: true },
    profileMarker: { type: Boolean, default: true },
    drawEdit: { type: Boolean, default: false },
    verticalSection: { type: Boolean, default: false },
    fullscreen: { type: Boolean, default: false },
    manual: { type: Boolean, default: false },
    showDeviceLayer: { type: Boolean, default: true },
    showProfileMarker: { type: Boolean, default: true },
    showVerticalSection: { type: Boolean, default: true },
    showManual: { type: Boolean, default: true },
    rotation: { type: Number, default: 0 },
    pitch: { type: Number, default: 0 }
  },
  emits: [
    'update:deviceLayer',
    'update:profileMarker',
    'update:drawEdit',
    'update:verticalSection',
    'update:fullscreen',
    'update:manual',
    'reset-view'
  ],
  computed: {
    items() {
      const rows = []
      if (this.showDeviceLayer) {
        rows.push({ key: 'deviceLayer', active: this.deviceLayer, tip: this.$t(this.deviceLayer ? 'widget.wind3d.deviceOn' : 'widget.wind3d.deviceOff') })
      }
      if (this.showProfileMarker) {
        rows.push({ key: 'profileMarker', active: this.profileMarker, tip: this.$t(this.profileMarker ? 'widget.wind3d.markerOn' : 'widget.wind3d.markerOff') })
      }
      rows.push({ key: 'drawEdit', active: this.drawEdit, tip: this.$t(this.drawEdit ? 'widget.wind3d.drawOn' : 'widget.wind3d.drawOff') })
      if (this.showVerticalSection) {
        rows.push({ key: 'verticalSection', active: this.verticalSection, tip: this.$t(this.verticalSection ? 'widget.wind3d.sectionOn' : 'widget.wind3d.sectionOff') })
      }
      rows.push({ key: 'fullscreen', active: this.fullscreen, tip: this.$t(this.fullscreen ? 'widget.wind3d.fullOn' : 'widget.wind3d.fullOff') })
      return rows
    },
    manualTip() {
      return this.$t(this.manual ? 'widget.wind3d.manualOn' : 'widget.wind3d.manualOff')
    },
    isNorth() {
      const turn = ((this.rotation % 360) + 360) % 360
      const rotationOk = turn < 0.5 || turn > 359.5
      const pitchOk = Math.abs(Number(this.pitch) || 0) < 0.5
      return rotationOk && pitchOk
    },
    compassTip() {
      return this.$t(this.isNorth ? 'widget.wind3d.compassNorth' : 'widget.wind3d.compassReset')
    },
    dialStyle() {
      return { transform: `rotate(${this.rotation}deg)` }
    }
  },
  methods: {
    toggle(key) {
      this.$emit(`update:${key}`, !this[key])
    },
    resetView() {
      this.$emit('reset-view')
    }
  }
}
</script>

<style lang="scss" scoped>
.wind-map-toolbar {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: rgba(8, 24, 32, 0.9);
  border: 1px solid rgba(48, 160, 164, 0.55);
  border-radius: 10px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition: right 0.35s ease;
}
.wind-map-toolbar__btn,
.wind-map-toolbar__compass {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin: 0;
  padding: 0;
  color: #d8e8f0;
  background: rgba(4, 16, 22, 0.82);
  border: 1px solid rgba(93, 247, 252, 0.32);
  border-radius: 50%;
  cursor: pointer;
}
.wind-map-toolbar__btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.wind-map-toolbar__btn:hover,
.wind-map-toolbar__btn:focus-visible,
.wind-map-toolbar__compass:hover,
.wind-map-toolbar__compass:focus-visible {
  color: #5df7fc;
  background: rgba(41, 219, 201, 0.18);
  border-color: rgba(93, 247, 252, 0.62);
}
.wind-map-toolbar__btn.is-active {
  color: #5df7fc;
  background: rgba(41, 219, 201, 0.24);
  border-color: #5df7fc;
  box-shadow: 0 0 12px rgba(93, 247, 252, 0.22);
}
.wind-map-toolbar__compass {
  position: relative;
  overflow: hidden;
}
.wind-map-toolbar__dial {
  position: relative;
  width: 100%;
  height: 100%;
}
.wind-map-toolbar__n,
.wind-map-toolbar__e,
.wind-map-toolbar__s,
.wind-map-toolbar__w {
  position: absolute;
  color: #f0f6fa;
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
}
.wind-map-toolbar__n {
  top: 3px;
  left: 50%;
  color: #ff4d4d;
  transform: translateX(-50%);
}
.wind-map-toolbar__e {
  top: 50%;
  right: 3px;
  transform: translateY(-50%);
}
.wind-map-toolbar__s {
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
}
.wind-map-toolbar__w {
  top: 50%;
  left: 3px;
  transform: translateY(-50%);
}
.wind-map-toolbar__needle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 12px;
  margin-top: -11px;
  margin-left: -1px;
  background: linear-gradient(to bottom, #ff4d4d 0%, #ff4d4d 55%, #5df7fc 100%);
  border-radius: 1px;
  pointer-events: none;
}
</style>
