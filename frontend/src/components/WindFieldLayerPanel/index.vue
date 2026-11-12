<template>
  <aside class="wind-field-panel" :class="{ 'is-disabled': disabled }">
    <wind-option-group
      :title="$t('widget.wind3d.height')"
      :hint="heightHint"
      :options="heightOptions"
      :mode="heightMode"
      :model-value="heightValue"
      show-mode
      show-select-all
      :disabled="disabled"
      :single-text="$t('widget.wind3d.single')"
      :multi-text="$t('widget.wind3d.multi')"
      :select-all-text="$t('widget.wind3d.selectAll')"
      @update:mode="heightMode = $event"
      @update:model-value="setHeightValue"
    />
    <wind-option-group
      :title="$t('widget.wind3d.form')"
      :options="formOptions"
      mode="multi"
      :model-value="forms"
      :exclusive-groups="vectorGroups"
      :disabled="disabled"
      @update:model-value="setForms"
    />
    <div v-show="hasVector" class="wind-field-panel__slider">
      <div class="wind-field-panel__slider-row">
        <span class="wind-field-panel__slider-label">{{ $t('widget.wind3d.density') }}</span>
        <el-slider
          v-model="barbDensity"
          class="wind-field-panel__slider-bar"
          :min="0.25"
          :max="1"
          :step="0.05"
          :show-tooltip="true"
          :format-tooltip="formatTenth"
          :disabled="disabled"
          @change="emitChange"
        />
        <span class="wind-field-panel__slider-value">{{ formatTenth(barbDensity) }}</span>
      </div>
    </div>
    <div v-show="hasField" class="wind-field-panel__slider">
      <div class="wind-field-panel__slider-row">
        <span class="wind-field-panel__slider-label">{{ $t('widget.wind3d.opacity') }}</span>
        <el-slider
          v-model="fieldOpacity"
          class="wind-field-panel__slider-bar"
          :min="0.1"
          :max="1"
          :step="0.05"
          :show-tooltip="true"
          :format-tooltip="formatTenth"
          :disabled="disabled"
          @change="emitChange"
        />
        <span class="wind-field-panel__slider-value">{{ formatTenth(fieldOpacity) }}</span>
      </div>
    </div>
    <wind-option-group
      :title="$t('widget.wind3d.warn')"
      :hint="$t('widget.wind3d.warnHint')"
      :options="warnOptions"
      mode="single"
      :columns="1"
      allow-deselect
      :model-value="warn"
      :disabled-values="disabledWarn"
      :disabled="disabled"
      @update:model-value="setWarn"
    />
    <wind-option-group
      :title="$t('widget.wind3d.color')"
      :options="colorOptions"
      mode="single"
      :model-value="colorStyle"
      :disabled="disabled"
      @update:model-value="setColorStyle"
    />
    <wind-option-group :title="$t('widget.wind3d.vertical')" :options="[]">
      <div class="wind-field-panel__vertical">
        <el-checkbox v-model="showRuler" :disabled="disabled" @change="emitChange">
          {{ $t('widget.wind3d.ruler') }}
        </el-checkbox>
        <div class="wind-field-panel__slider-row">
          <span class="wind-field-panel__slider-label">{{ $t('widget.wind3d.exaggeration') }}</span>
          <el-slider
            v-model="exaggeration"
            class="wind-field-panel__slider-bar"
            :min="0"
            :max="100"
            :step="1"
            :show-tooltip="true"
            :disabled="disabled"
            @change="emitChange"
          />
          <span class="wind-field-panel__slider-value">{{ exaggeration }}</span>
        </div>
      </div>
    </wind-option-group>
    <wind-option-group
      :title="$t('widget.wind3d.histogram')"
      :options="histogramOptions"
      mode="single"
      :model-value="histogram"
      :disabled="disabled"
      @update:model-value="setHistogram"
    />
    <wind-option-group
      :title="$t('widget.wind3d.map')"
      :options="mapOptions"
      mode="single"
      :model-value="mapType"
      :disabled="disabled"
      @update:model-value="setMapType"
    />
  </aside>
</template>

<script>
import WindOptionGroup from './OptionGroup.vue'

export default {
  name: 'WindFieldLayerPanel',
  components: { WindOptionGroup },
  props: {
    heights: {
      type: Array,
      default() {
        return [0, 100, 200, 300, 400, 500, 600, 800, 1000]
      }
    },
    heightHint: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    disabledWarn: { type: Array, default() { return [] } }
  },
  emits: ['change'],
  data() {
    return {
      heightMode: 'multi',
      heightValue: [0, 200, 400, 600],
      forms: ['field', 'particle'],
      barbDensity: 1,
      fieldOpacity: 1,
      warn: null,
      colorStyle: 'smooth',
      showRuler: true,
      exaggeration: 20,
      histogram: 'hide',
      mapType: 'satellite',
      vectorGroups: [['barb', 'arrow']]
    }
  },
  computed: {
    heightOptions() {
      return this.heights.map((height) => ({ value: height, label: `${height}m` }))
    },
    formOptions() {
      return ['field', 'barb', 'arrow', 'particle'].map((key) => ({
        value: key,
        label: this.$t(`widget.wind3d.forms.${key}`)
      }))
    },
    warnOptions() {
      return ['shearH', 'shearV', 'gale'].map((key) => ({
        value: key,
        label: this.$t(`widget.wind3d.warns.${key}`)
      }))
    },
    colorOptions() {
      return ['smooth', 'contour'].map((key) => ({
        value: key,
        label: this.$t(`widget.wind3d.colors.${key}`)
      }))
    },
    histogramOptions() {
      return ['hide', 'show'].map((key) => ({
        value: key,
        label: this.$t(`widget.wind3d.histograms.${key}`)
      }))
    },
    mapOptions() {
      return ['vector', 'satellite'].map((key) => ({
        value: key,
        label: this.$t(`widget.wind3d.maps.${key}`)
      }))
    },
    hasVector() {
      return this.forms.includes('barb') || this.forms.includes('arrow')
    },
    hasField() {
      return this.forms.includes('field')
    }
  },
  watch: {
    heights: {
      immediate: true,
      handler(next) {
        const allowed = new Set(next)
        if (Array.isArray(this.heightValue)) {
          this.heightValue = this.heightValue.filter((item) => allowed.has(item))
          return
        }
        if (this.heightValue != null && !allowed.has(this.heightValue)) this.heightValue = null
      }
    }
  },
  mounted() {
    this.emitChange()
  },
  methods: {
    formatTenth(value) {
      const number = Number(value)
      return Number.isFinite(number) ? number.toFixed(1) : ''
    },
    setHeightValue(value) {
      this.heightValue = value
      this.emitChange()
    },
    setForms(value) {
      this.forms = value
      this.emitChange()
    },
    setWarn(value) {
      this.warn = value
      this.emitChange()
    },
    setColorStyle(value) {
      this.colorStyle = value
      this.emitChange()
    },
    setHistogram(value) {
      this.histogram = value
      this.emitChange()
    },
    setMapType(value) {
      this.mapType = value
      this.emitChange()
    },
    applyLinkage(height, warn) {
      const nextHeight = Number(height)
      if (!Number.isFinite(nextHeight)) return
      if (this.heightMode === 'single') {
        this.heightValue = nextHeight
      } else {
        const current = Array.isArray(this.heightValue) ? this.heightValue.map(Number) : []
        if (!current.includes(nextHeight)) {
          this.heightValue = current.concat(nextHeight).sort((a, b) => a - b)
        }
      }
      if (!this.disabledWarn.includes(warn)) this.warn = warn
      this.emitChange()
    },
    selectedHeights() {
      if (this.heightMode === 'multi') return Array.isArray(this.heightValue) ? this.heightValue : []
      return this.heightValue == null ? [] : [this.heightValue]
    },
    emitChange() {
      this.$emit('change', {
        heightMode: this.heightMode,
        heights: this.selectedHeights(),
        forms: this.forms,
        barbDensity: this.barbDensity,
        fieldOpacity: this.fieldOpacity,
        warn: this.warn,
        colorStyle: this.colorStyle,
        showRuler: this.showRuler,
        exaggeration: this.exaggeration,
        histogram: this.histogram,
        mapType: this.mapType
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.wind-field-panel {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 2;
  box-sizing: border-box;
  width: 326px;
  max-height: calc(100% - 32px);
  padding: 8px 0 12px;
  overflow: auto;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #30a0a4;
  border-radius: 5px;
  box-shadow: 0 2px 6px rgba(255, 255, 255, 0.2), 0 4px 16px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(36px);
  scrollbar-width: thin;
  scrollbar-color: rgba(93, 247, 252, 0.35) transparent;
  user-select: none;
}
.wind-field-panel::-webkit-scrollbar {
  width: 6px;
}
.wind-field-panel::-webkit-scrollbar-thumb {
  background: rgba(93, 247, 252, 0.35);
  border-radius: 3px;
}
.wind-field-panel__slider {
  padding: 4px 20px 8px;
  border-top: 1px solid rgba(48, 160, 164, 0.35);
}
.wind-field-panel__vertical {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.wind-field-panel__slider-row {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.wind-field-panel__slider-label {
  flex: 0 0 auto;
  min-width: 72px;
  color: rgba(255, 255, 255, 0.88);
  font-size: 13px;
}
.wind-field-panel__vertical .wind-field-panel__slider-label {
  min-width: 56px;
}
.wind-field-panel__slider-bar {
  flex: 1;
  min-width: 0;
}
.wind-field-panel__slider-value {
  flex: 0 0 auto;
  min-width: 32px;
  color: rgba(41, 219, 201, 0.95);
  font-size: 12px;
  text-align: right;
}
.wind-field-panel :deep(.el-checkbox) {
  color: #fff;
}
.wind-field-panel :deep(.el-checkbox__label) {
  color: #fff;
  font-size: 14px;
}
.wind-field-panel :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background: #29dbc9;
  border-color: #29dbc9;
}
.wind-field-panel :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #29dbc9;
}
.wind-field-panel :deep(.wind-field-panel__slider-bar .el-slider__runway) {
  background: rgba(255, 255, 255, 0.12);
}
.wind-field-panel :deep(.wind-field-panel__slider-bar .el-slider__bar) {
  background: linear-gradient(90deg, #29dbc9, #30a0a4);
}
.wind-field-panel :deep(.wind-field-panel__slider-bar .el-slider__button) {
  width: 4px;
  height: 12px;
  background: #30a0a4;
  border: 2px solid #30a0a4;
  border-radius: 31px;
}
</style>
