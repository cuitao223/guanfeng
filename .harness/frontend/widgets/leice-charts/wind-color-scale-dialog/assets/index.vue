<template>
  <el-dialog
    v-model="visible"
    class="platform-form-dialog platform-form-dialog--md"
    :title="$t('widget.wind3d.legend.title')"
    append-to-body
    :close-on-click-modal="false"
    @open="onOpen"
  >
    <div class="legend-settings">
      <section class="legend-settings__section">
        <div class="legend-settings__title">{{ $t('widget.wind3d.legend.range') }}</div>
        <div class="legend-settings__range">
          <span>{{ $t('widget.wind3d.legend.min') }}</span>
          <el-input-number v-model="form.min" :step="0.1" @change="onRangeChange" />
          <span>{{ $t('widget.wind3d.legend.max') }}</span>
          <el-input-number v-model="form.max" :step="0.1" @change="onRangeChange" />
          <span class="legend-settings__unit">{{ unit }}</span>
        </div>
      </section>

      <section class="legend-settings__section">
        <div class="legend-settings__title">{{ $t('widget.wind3d.legend.mode') }}</div>
        <el-radio-group v-model="form.mode" @change="onModeChange">
          <el-radio-button value="uniform">{{ $t('widget.wind3d.legend.uniform') }}</el-radio-button>
          <el-radio-button value="manual">{{ $t('widget.wind3d.legend.manual') }}</el-radio-button>
        </el-radio-group>
      </section>

      <section class="legend-settings__section">
        <div class="legend-settings__title">{{ $t('widget.wind3d.legend.presets') }}</div>
        <div class="legend-settings__presets">
          <button
            v-for="preset in presets"
            :key="preset.id"
            type="button"
            class="legend-settings__preset"
            :class="{ 'is-active': form.presetId === preset.id }"
            @click="applyPreset(preset)"
          >
            <span class="legend-settings__swatch" :style="swatchStyle(preset.colors)"></span>
            <span>{{ $t('widget.wind3d.legend.presetNames.' + preset.id) }}</span>
          </button>
        </div>
      </section>

      <section class="legend-settings__section">
        <div class="legend-settings__title">{{ $t('widget.wind3d.legend.colors') }}</div>
        <div class="legend-settings__preview" :style="swatchStyle(form.colors)"></div>
        <div class="legend-settings__bands">
          <div v-for="(color, index) in form.colors" :key="'band-' + index" class="legend-settings__band">
            <el-input-number
              v-if="form.mode === 'manual' && index > 0 && index < form.breakpoints.length - 1"
              v-model="form.breakpoints[index]"
              :step="0.1"
              :min="manualMin(index)"
              :max="manualMax(index)"
              @change="onManualChange(index)"
            />
            <span v-else class="legend-settings__stop">{{ stopLabel(index) }}</span>
            <el-color-picker v-model="form.colors[index]" @change="onColorChange" />
          </div>
        </div>
      </section>

      <p v-if="error" class="legend-settings__error">{{ error }}</p>
    </div>
    <template #footer>
      <el-button @click="visible = false">{{ $t('widget.wind3d.legend.cancel') }}</el-button>
      <el-button type="primary" @click="confirm">{{ $t('widget.wind3d.legend.confirm') }}</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { WIND_LEGEND_COLORS } from '@leice-map-3d/assets/logic/legend.mjs'

const PRESETS = [
  { id: 'spectrum', colors: WIND_LEGEND_COLORS.slice() },
  {
    id: 'coldWarm',
    colors: ['#053061', '#2166ac', '#4393c3', '#92c5de', '#d1e5f0', '#fddbc7', '#f4a582', '#d6604d', '#b2182b', '#67001f', '#400004']
  },
  {
    id: 'greenYellow',
    colors: ['#00441b', '#1b7837', '#5aae61', '#a6dba0', '#d9f0d3', '#ffffbf', '#fee08b', '#fdae61', '#f46d43', '#d73027', '#a50026']
  },
  {
    id: 'grayscale',
    colors: ['#0d0d0d', '#262626', '#404040', '#595959', '#737373', '#8c8c8c', '#a6a6a6', '#bfbfbf', '#d9d9d9', '#f2f2f2', '#ffffff']
  },
  {
    id: 'hikvision',
    colors: ['#001529', '#002140', '#003a70', '#0050b3', '#096dd9', '#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff', '#e6f7ff']
  },
  {
    id: 'turbo',
    colors: ['#30123b', '#4145ab', '#4675ed', '#39a2fc', '#1bc8e1', '#25d2b8', '#6be453', '#b4ec32', '#f5c936', '#f79031', '#ca2220']
  }
]

function sameColors(left, right) {
  if (!left || !right || left.length !== right.length) return false
  return left.every((color, index) => String(color).toLowerCase() === String(right[index]).toLowerCase())
}

function roundStop(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.round(number * 10) / 10
}

function uniformStops(min, max, count) {
  const size = Math.max(2, count)
  const stops = []
  for (let index = 0; index < size; index += 1) {
    const ratio = size === 1 ? 0 : index / (size - 1)
    stops.push(roundStop(min + (max - min) * ratio))
  }
  stops[0] = roundStop(min)
  stops[stops.length - 1] = roundStop(max)
  return stops
}

export default {
  name: 'WindColorScaleDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    valueMin: { type: Number, default: 0 },
    valueMax: { type: Number, default: 20 },
    colors: { type: Array, default: () => [] },
    domainPoints: { type: Array, default: () => [] },
    unit: { type: String, default: 'm/s' }
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      presets: PRESETS,
      error: '',
      form: {
        min: 0,
        max: 20,
        mode: 'uniform',
        colors: [],
        breakpoints: [],
        presetId: ''
      }
    }
  },
  computed: {
    visible: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      }
    }
  },
  methods: {
    onOpen() {
      const colors = (this.colors || []).map((item) => String(item))
      const domain = (this.domainPoints || []).map(Number).filter((item) => Number.isFinite(item))
      const min = Number(this.valueMin)
      const max = Number(this.valueMax)
      const breakpoints = domain.length === colors.length || domain.length === colors.length + 1
        ? domain.map(roundStop)
        : uniformStops(min, max, Math.max(colors.length, 2))
      if (breakpoints.length) {
        breakpoints[0] = roundStop(min)
        breakpoints[breakpoints.length - 1] = roundStop(max)
      }
      this.form = {
        min: roundStop(min),
        max: roundStop(max),
        mode: 'uniform',
        colors: colors.slice(),
        breakpoints,
        presetId: (PRESETS.find((preset) => sameColors(preset.colors, colors)) || {}).id || ''
      }
      this.error = ''
    },
    swatchStyle(colors) {
      const list = (colors || []).filter(Boolean)
      if (!list.length) return { background: '#666' }
      return { background: 'linear-gradient(to right, ' + list.join(', ') + ')' }
    },
    stopLabel(index) {
      const value = this.form.breakpoints[index]
      return Number.isFinite(Number(value)) ? String(roundStop(value)) : ''
    },
    manualMin(index) {
      return roundStop(Number(this.form.breakpoints[index - 1]) + 0.1)
    },
    manualMax(index) {
      return roundStop(Number(this.form.breakpoints[index + 1]) - 0.1)
    },
    onRangeChange() {
      const previous = this.form.breakpoints.slice()
      const oldMin = previous[0]
      const oldMax = previous[previous.length - 1]
      if (this.form.mode === 'uniform') {
        this.form.breakpoints = uniformStops(this.form.min, this.form.max, previous.length || this.form.colors.length)
      } else {
        const span = Number(oldMax) - Number(oldMin) || 1
        this.form.breakpoints = previous.map((value) => {
          const ratio = (Number(value) - Number(oldMin)) / span
          return roundStop(Number(this.form.min) + ratio * (Number(this.form.max) - Number(this.form.min)))
        })
        this.form.breakpoints[0] = roundStop(this.form.min)
        this.form.breakpoints[this.form.breakpoints.length - 1] = roundStop(this.form.max)
      }
      this.form.presetId = ''
    },
    onModeChange(mode) {
      if (mode === 'uniform') {
        this.form.breakpoints = uniformStops(this.form.min, this.form.max, this.form.breakpoints.length || this.form.colors.length)
      }
    },
    onManualChange(index) {
      const points = this.form.breakpoints.map(Number)
      const low = points[index - 1] + 0.1
      const high = points[index + 1] - 0.1
      points[index] = roundStop(Math.min(high, Math.max(low, points[index])))
      this.form.breakpoints = points
      this.form.mode = 'manual'
      this.form.presetId = ''
    },
    onColorChange() {
      this.form.presetId = ''
    },
    applyPreset(preset) {
      this.form.colors = preset.colors.slice()
      this.form.presetId = preset.id
      this.form.mode = 'uniform'
      this.form.breakpoints = uniformStops(this.form.min, this.form.max, preset.colors.length)
      this.error = ''
    },
    confirm() {
      const min = Number(this.form.min)
      const max = Number(this.form.max)
      if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min)) {
        this.error = this.$t('widget.wind3d.legend.invalidRange')
        return
      }
      const points = this.form.breakpoints.map(Number)
      points[0] = roundStop(min)
      points[points.length - 1] = roundStop(max)
      for (let index = 1; index < points.length; index += 1) {
        if (!(points[index] > points[index - 1])) {
          this.error = this.$t('widget.wind3d.legend.invalidStops')
          return
        }
      }
      if (!this.form.colors.length || this.form.colors.some((color) => !color)) {
        this.error = this.$t('widget.wind3d.legend.invalidColor')
        return
      }
      this.error = ''
      this.$emit('confirm', {
        valueMin: roundStop(min),
        valueMax: roundStop(max),
        colors: this.form.colors.slice(),
        domainPoints: points
      })
      this.visible = false
    }
  }
}
</script>

<style scoped>
.legend-settings__section + .legend-settings__section { margin-top: 16px; }
.legend-settings__title { margin-bottom: 8px; font-size: 14px; }
.legend-settings__range,
.legend-settings__presets,
.legend-settings__bands {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.legend-settings__unit { opacity: 0.8; }
.legend-settings__preset {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 140px;
  padding: 6px;
  border: 1px solid rgba(86, 108, 149, 0.8);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.legend-settings__preset.is-active { border-color: #206aff; }
.legend-settings__swatch,
.legend-settings__preview {
  height: 14px;
  border-radius: 7px;
}
.legend-settings__preview { margin-bottom: 10px; }
.legend-settings__bands { max-height: 240px; overflow: auto; }
.legend-settings__band { display: flex; align-items: center; gap: 8px; }
.legend-settings__stop { min-width: 48px; }
.legend-settings__error { margin: 12px 0 0; color: #ff1919; }
</style>
