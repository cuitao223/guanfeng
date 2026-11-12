<template>
  <div
    class="wind-color-bar"
    :title="$t('widget.wind3d.colorBarTitle')"
    @dblclick="$emit('open-settings')"
  >
    <div class="wind-color-bar__main">
      <div class="wind-color-bar__strip" :style="stripStyle"></div>
      <div class="wind-color-bar__ticks" :class="{ 'is-dense': tickItems.length >= 7 }">
        <div class="wind-color-bar__ruler" aria-hidden="true"></div>
        <span
          v-for="(item, index) in tickItems"
          :key="'tick-' + index"
          class="wind-color-bar__tick"
          :class="'is-' + item.align"
          :style="tickStyle(item)"
        >{{ item.label }}</span>
      </div>
    </div>
    <div v-if="unit" class="wind-color-bar__unit" :title="$t('widget.wind3d.unitTitle', { unit })">{{ unit }}</div>
  </div>
</template>

<script>
function colorToCss(color) {
  if (color == null) return '#cccccc'
  if (Array.isArray(color) && color.length >= 3) {
    const alpha = color.length >= 4 ? color[3] : 1
    if (alpha !== 1) return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`
    return `rgb(${color[0]},${color[1]},${color[2]})`
  }
  const text = String(color).trim()
  if (text.startsWith('#')) return text
  if (/^[0-9a-fA-F]{3,8}$/.test(text)) return `#${text}`
  return text
}

function inferDecimals(step) {
  const size = Math.abs(Number(step))
  if (!Number.isFinite(size) || size === 0) return 2
  if (Math.abs(size - Math.round(size)) < 1e-9) return 0
  for (let digits = 1; digits <= 4; digits += 1) {
    const scaled = size * (10 ** digits)
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return digits
  }
  if (size >= 0.1) return 1
  if (size >= 0.01) return 2
  return 3
}

function formatTickValue(value, decimals) {
  if (!Number.isFinite(value)) return ''
  const digits = Math.max(0, Math.min(6, decimals))
  if (digits === 0) return String(Math.round(value))
  return value.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

export default {
  name: 'WindColorBar',
  props: {
    valueMin: { type: Number, required: true },
    valueMax: { type: Number, required: true },
    unit: { type: String, default: '' },
    colors: { type: Array, required: true },
    domainPoints: { type: Array, default() { return [] } },
    scaleMode: {
      type: String,
      default: 'ordinal',
      validator: (value) => value === 'ordinal' || value === 'linear'
    },
    colorType: { type: String, default: 'smooth' },
    tickCount: { type: Number, default: 5 }
  },
  emits: ['open-settings'],
  computed: {
    normalizedColors() {
      return (Array.isArray(this.colors) ? this.colors : []).map(colorToCss)
    },
    normalizedDomainPoints() {
      return (this.domainPoints || []).map((value) => Number(value)).filter((value) => Number.isFinite(value))
    },
    useOrdinalScale() {
      return this.scaleMode === 'ordinal' && this.normalizedDomainPoints.length >= 2
    },
    useThresholdOrdinalScale() {
      return this.colorType === 'contour'
        && this.useOrdinalScale
        && this.normalizedColors.length === this.normalizedDomainPoints.length
        && this.normalizedDomainPoints.length >= 2
    },
    stripStyle() {
      const list = this.normalizedColors
      if (!list.length) return { background: '#666' }
      const min = Number(this.valueMin)
      const max = Number(this.valueMax)
      const span = max - min
      const domain = this.normalizedDomainPoints
      const useDomainStops = domain.length >= 2
        && list.length >= 2
        && (domain.length === list.length || domain.length === list.length + 1)
      const stepped = this.colorType === 'contour'
      const toPercent = (value, index) => {
        if (this.useOrdinalScale) {
          const count = domain.length
          if (count <= 1) return 0
          const found = Number.isFinite(index) && index >= 0 && index < count
            ? index
            : domain.findIndex((item) => item === value)
          const ratio = this.useThresholdOrdinalScale ? found / count : found / (count - 1)
          return Math.min(100, Math.max(0, ratio * 100))
        }
        if (!Number.isFinite(span) || span <= 0) return 0
        return Math.min(100, Math.max(0, ((value - min) / span) * 100))
      }
      if (useDomainStops && stepped) {
        const stops = []
        if (this.useThresholdOrdinalScale) {
          list.forEach((color, index) => {
            stops.push(`${color} ${toPercent(domain[index], index)}%`, `${color} ${toPercent(domain[index + 1], index + 1)}%`)
          })
        } else {
          const bandCount = Math.min(list.length, domain.length - 1)
          for (let index = 0; index < bandCount; index += 1) {
            stops.push(
              `${list[index]} ${toPercent(domain[index], index)}%`,
              `${list[index]} ${toPercent(domain[index + 1], index + 1)}%`
            )
          }
        }
        return { background: `linear-gradient(to right, ${stops.join(', ')})` }
      }
      if (useDomainStops) {
        const count = Math.min(list.length, domain.length)
        const stops = []
        for (let index = 0; index < count; index += 1) {
          stops.push(`${list[index]} ${toPercent(domain[index], index)}%`)
        }
        return { background: `linear-gradient(to right, ${stops.join(', ')})` }
      }
      if (stepped) {
        const step = 100 / list.length
        const stops = list.map((color, index) => `${color} ${index * step}%, ${color} ${(index + 1) * step}%`)
        return { background: `linear-gradient(to right, ${stops.join(', ')})` }
      }
      return { background: `linear-gradient(to right, ${list.join(', ')})` }
    },
    tickItems() {
      const domain = this.normalizedDomainPoints
      if (this.useOrdinalScale) {
        const count = domain.length
        const gaps = []
        for (let index = 1; index < count; index += 1) gaps.push(Math.abs(domain[index] - domain[index - 1]))
        const positive = gaps.filter((gap) => gap > 0)
        const decimals = inferDecimals(positive.length ? Math.min(...positive) : 1)
        return domain.map((value, index) => {
          const positionPct = this.useThresholdOrdinalScale
            ? (index / count) * 100
            : (count <= 1 ? 50 : (index / (count - 1)) * 100)
          let align = 'center'
          if (index === 0) align = 'left'
          else if (!this.useThresholdOrdinalScale && index === count - 1) align = 'right'
          return { label: formatTickValue(value, decimals), positionPct, align }
        })
      }
      const min = Number(this.valueMin)
      const max = Number(this.valueMax)
      if (!Number.isFinite(min) || !Number.isFinite(max)) return []
      const count = Math.max(2, Math.min(8, Math.floor(Number(this.tickCount)) || 5))
      const span = max - min
      const step = count > 1 ? span / (count - 1) : 0
      const decimals = inferDecimals(step)
      const items = []
      for (let index = 0; index < count; index += 1) {
        const ratio = count <= 1 ? 0 : index / (count - 1)
        const value = min + span * ratio
        let align = 'center'
        if (index === 0) align = 'left'
        else if (index === count - 1) align = 'right'
        items.push({
          label: formatTickValue(value, decimals),
          positionPct: !Number.isFinite(span) || span === 0 ? 50 : ((value - min) / span) * 100,
          align
        })
      }
      return items
    }
  },
  methods: {
    tickStyle(item) {
      const percent = Number(item.positionPct)
      const position = Number.isFinite(percent) ? percent : 0
      if (item.align === 'left') return { left: '0%', transform: 'translateX(0)' }
      if (item.align === 'right') return { left: '100%', transform: 'translateX(-100%)' }
      return { left: `${position}%`, transform: 'translateX(-50%)' }
    }
  }
}
</script>

<style lang="scss" scoped>
.wind-color-bar {
  display: flex;
  align-items: stretch;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  padding: 8px 12px 4px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #30a0a4;
  border-radius: 5px;
  box-shadow: 0 2px 6px rgba(255, 255, 255, 0.2), 0 4px 16px rgba(255, 255, 255, 0.08);
  cursor: pointer;
  backdrop-filter: blur(36px);
}
.wind-color-bar:hover {
  border-color: #46c4c8;
}
.wind-color-bar__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.wind-color-bar__strip {
  width: 100%;
  height: 20px;
  overflow: hidden;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px rgba(103, 213, 223, 0.22);
}
.wind-color-bar__ticks {
  position: relative;
  width: 100%;
  color: #e8f4f8;
  font-size: 11px;
  line-height: 1.25;
  user-select: none;
}
.wind-color-bar__ticks.is-dense {
  font-size: 10px;
}
.wind-color-bar__ruler {
  display: block;
  width: 100%;
  height: 1.35em;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
}
.wind-color-bar__tick {
  position: absolute;
  top: 0;
  z-index: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
  pointer-events: none;
}
.wind-color-bar__unit {
  flex: 0 0 auto;
  align-self: center;
  padding: 4px 10px;
  color: rgb(0, 255, 229);
  font-size: 13px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(48, 160, 164, 0.35);
  border-radius: 4px;
  user-select: none;
}
</style>
