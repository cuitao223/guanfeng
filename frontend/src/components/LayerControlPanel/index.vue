<template>
  <aside class="layer-control">
    <section class="layer-card" :class="{ 'is-open': panels.map }">
      <button type="button" class="layer-card-head" @click="toggle('map')">
        <span class="head-left">
          <svg class="head-icon" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M1 3.2 5 1.5l4 1.7 4-1.7V11l-4 1.7-4-1.7L1 12.5V3.2Z" fill="none" stroke="currentColor" stroke-width="1.2" />
            <path d="M5 1.5v9.5M9 3.2v9.5" fill="none" stroke="currentColor" stroke-width="1.2" />
          </svg>
          <span class="head-title">{{ $t('widget.layer.mapSwitch') }}</span>
        </span>
        <span class="head-arrow" :class="{ 'is-collapsed': !panels.map }">⌄</span>
      </button>
      <div class="layer-card-collapse" :class="{ 'is-open': panels.map }">
        <div class="layer-card-collapse-inner">
          <div class="layer-card-body">
            <div class="map-category-title">{{ $t('widget.layer.mapCategory') }}</div>
            <div class="map-type-row">
              <button
                v-for="item in mapTypes"
                :key="item.value"
                type="button"
                class="map-type-item"
                :class="{ 'is-active': mapType === item.value }"
                @click="selectMapType(item.value)"
              >
                <img class="map-type-thumb" :src="item.thumb" alt="" />
                <span class="map-type-label">{{ $t(item.labelKey) }}</span>
                <span v-if="mapType === item.value" class="map-type-check" aria-hidden="true">
                  <i class="map-type-check-mark" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="layer-card" :class="{ 'is-open': panels.display }">
      <button type="button" class="layer-card-head" @click="toggle('display')">
        <span class="head-left">
          <svg class="head-icon" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M1.5 7s2.2-3.5 5.5-3.5S12.5 7 12.5 7s-2.2 3.5-5.5 3.5S1.5 7 1.5 7Z" fill="none" stroke="currentColor" stroke-width="1.2" />
            <circle cx="7" cy="7" r="1.6" fill="currentColor" />
          </svg>
          <span class="head-title">{{ $t('widget.layer.displaySwitch') }}</span>
        </span>
        <span class="head-arrow" :class="{ 'is-collapsed': !panels.display }">⌄</span>
      </button>
      <div class="layer-card-collapse" :class="{ 'is-open': panels.display }">
        <div class="layer-card-collapse-inner">
          <div class="layer-card-body is-display-switch">
            <div class="display-switch-list">
              <div v-for="item in displayOptions" :key="item.key" class="display-switch-row">
                <span class="display-switch-label">{{ $t(item.labelKey) }}</span>
                <el-checkbox
                  :model-value="displaySwitches[item.key]"
                  @change="(value) => updateDisplaySwitch(item.key, value)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </aside>
</template>

<script>
import mapImgThumb from './thumbs/img.png'
import mapVecThumb from './thumbs/vec.png'
import mapTerThumb from './thumbs/ter.png'

export default {
  name: 'LayerControlPanel',
  props: {
    mapType: { type: String, default: 'img' },
    displaySwitches: {
      type: Object,
      default() {
        return { radarIcon: true, windfarmIcon: true, placeName: true }
      }
    }
  },
  emits: ['update:mapType', 'update:displaySwitches'],
  data() {
    return {
      panels: { map: true, display: false },
      mapTypes: [
        { value: 'img', labelKey: 'widget.layer.mapTypeImg', thumb: mapImgThumb },
        { value: 'vec', labelKey: 'widget.layer.mapTypeVec', thumb: mapVecThumb },
        { value: 'ter', labelKey: 'widget.layer.mapTypeTer', thumb: mapTerThumb }
      ],
      displayOptions: [
        { key: 'radarIcon', labelKey: 'widget.layer.displayRadarIcon' },
        { key: 'windfarmIcon', labelKey: 'widget.layer.displayWindfarmIcon' },
        { key: 'placeName', labelKey: 'widget.layer.displayPlaceName' }
      ]
    }
  },
  methods: {
    toggle(key) {
      this.panels[key] = !this.panels[key]
    },
    selectMapType(type) {
      if (type === this.mapType) return
      this.$emit('update:mapType', type)
    },
    updateDisplaySwitch(key, value) {
      this.$emit('update:displaySwitches', {
        ...this.displaySwitches,
        [key]: !!value
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.layer-control {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  width: 200px;
}
.layer-card {
  width: 200px;
  border-radius: 8px;
  background: rgba(17, 24, 39, 0.8);
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
}
.layer-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 48px;
  padding: 0 12px;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
}
.head-left {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.head-icon {
  width: 14px;
  height: 14px;
  color: rgba(255, 255, 255, 0.85);
}
.head-title {
  font-size: 14px;
  font-weight: 600;
}
.head-arrow {
  color: rgba(255, 255, 255, 0.85);
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}
.head-arrow.is-collapsed {
  transform: rotate(180deg);
}
.layer-card-collapse {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}
.layer-card-collapse.is-open {
  grid-template-rows: 1fr;
}
.layer-card-collapse-inner {
  min-height: 0;
  overflow: hidden;
}
.layer-card-body {
  padding: 20px 10px 24px;
  border-top: 2px solid rgba(255, 255, 255, 0.3);
}
.layer-card-body.is-display-switch {
  padding-left: 20px;
  padding-right: 20px;
}
.map-category-title {
  margin-bottom: 14px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}
.map-type-row {
  display: flex;
  gap: 8px;
}
.map-type-item {
  position: relative;
  width: 52px;
  height: 54px;
  padding: 0;
  overflow: hidden;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}
.map-type-item.is-active::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 3;
  border: 2px solid #fff;
  border-radius: 8px;
  pointer-events: none;
}
.map-type-thumb {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 75px;
  height: 60px;
  max-width: none;
  object-fit: cover;
  transform: translate(-50%, -50%);
}
.map-type-label {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 10px;
  z-index: 1;
  font-size: 12px;
  text-align: center;
  color: rgba(17, 24, 39, 0.8);
}
.map-type-item.is-active .map-type-label {
  color: #fff;
}
.map-type-check {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  width: 17px;
  height: 17px;
  background: #206aff;
}
.map-type-check-mark {
  position: absolute;
  top: 5px;
  left: 4px;
  width: 8px;
  height: 4px;
  border-left: 1.5px solid #fff;
  border-bottom: 1.5px solid #fff;
  transform: rotate(-45deg);
}
.display-switch-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.display-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
}
.display-switch-label {
  font-size: 12px;
  color: #fff;
}
.display-switch-row :deep(.el-checkbox) {
  height: auto;
  margin: 0;
}
.display-switch-row :deep(.el-checkbox__inner) {
  width: 16px;
  height: 16px;
  border-color: rgba(255, 255, 255, 0.45);
  background: transparent;
}
.display-switch-row :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  border-color: #206aff;
  background: #206aff;
}
</style>
