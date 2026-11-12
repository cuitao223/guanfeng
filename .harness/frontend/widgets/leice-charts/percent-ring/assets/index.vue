<template>
  <div class="percent-ring" :aria-label="display + '%'">
    <div class="percent-ring__wrap">
      <svg class="percent-ring__svg" viewBox="0 0 100 100" aria-hidden="true">
        <circle
          class="percent-ring__track"
          cx="50"
          cy="50"
          :r="radius"
          fill="none"
          :stroke="theme.track"
          :stroke-width="stroke"
        />
        <g v-if="arc.segments.length" :style="glowStyle">
          <path
            v-for="seg in arc.segments"
            :key="seg.key"
            :d="seg.d"
            fill="none"
            :stroke="seg.color"
            :stroke-width="stroke"
            stroke-linecap="butt"
          />
          <circle
            v-if="arc.endCap"
            :cx="arc.endCap.cx"
            :cy="arc.endCap.cy"
            :r="capRadius"
            :fill="theme.gradTo"
          />
        </g>
      </svg>
      <div class="percent-ring__center">
        <div class="percent-ring__row">
          <span class="percent-ring__num" :style="{ color: theme.centerColor }">{{ display }}</span>
          <span class="percent-ring__unit" :style="{ color: theme.centerColor }">%</span>
        </div>
        <div v-if="captionText" class="percent-ring__caption">{{ captionText }}</div>
      </div>
    </div>
    <div v-if="showLegend" class="percent-ring__legend">
      <span class="percent-ring__legend-item">
        <i class="percent-ring__dot" :style="{ background: theme.usedLegend }" />
        {{ filledText }}
      </span>
      <span class="percent-ring__legend-item">
        <i class="percent-ring__dot" :style="{ background: theme.track }" />
        {{ trackText }}
      </span>
    </div>
  </div>
</template>

<script>
import {
  RING_RADIUS,
  RING_STROKE,
  arcRatio,
  buildArc,
  displayPercent,
  hexToRgba,
  lerpColor,
  tierIndex
} from './ring.js'

const TIERS = [
  {
    gradFrom: '#FF9A52',
    gradTo: '#DC1313',
    track: '#FFD3D3',
    usedLegend: '#EB2E19',
    centerColor: '#DC1313'
  },
  {
    gradFrom: '#FFF0A2',
    gradTo: '#EE4718',
    track: '#FEC8AB',
    usedLegend: '#F97B41',
    centerColor: '#EE4718'
  },
  {
    gradFrom: '#A2E8FF',
    gradTo: '#389FFF',
    track: '#D0E4FF',
    usedLegend: '#1687FF',
    centerColor: '#389FFF'
  }
]

export default {
  name: 'PercentRing',
  props: {
    percent: { type: Number, default: 0 },
    mode: { type: String, default: 'remaining' },
    filledLabel: { type: String, default: '' },
    trackLabel: { type: String, default: '' },
    showLegend: { type: Boolean, default: true },
    caption: { type: String, default: undefined }
  },
  data() {
    return {
      radius: RING_RADIUS,
      stroke: RING_STROKE
    }
  },
  computed: {
    display() {
      return displayPercent(this.percent)
    },
    theme() {
      return TIERS[tierIndex(this.percent)]
    },
    capRadius() {
      return this.stroke / 2
    },
    arc() {
      const ratio = arcRatio(this.percent, this.mode)
      const built = buildArc(ratio, this.radius)
      return {
        segments: built.segments.map((seg) => ({
          key: seg.key,
          d: seg.d,
          color: lerpColor(this.theme.gradFrom, this.theme.gradTo, seg.t)
        })),
        startCap: built.startCap,
        endCap: built.endCap
      }
    },
    glowStyle() {
      return { filter: `drop-shadow(0 0 3px ${hexToRgba(this.theme.gradTo, 0.55)})` }
    },
    filledText() {
      return this.filledLabel || this.$t('widget.percentRing.used')
    },
    trackText() {
      return this.trackLabel || this.$t('widget.percentRing.remaining')
    },
    captionText() {
      if (this.caption != null) return this.caption
      if (this.mode === 'progress') return ''
      return this.$t('widget.percentRing.remaining')
    }
  }
}
</script>

<style lang="scss" scoped>
.percent-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.percent-ring__wrap {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
}

.percent-ring__svg {
  display: block;
  width: 100%;
  height: 100%;
}

.percent-ring__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  text-align: center;
}

.percent-ring__row {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: center;
  gap: 1px;
  line-height: 1;
}

.percent-ring__num {
  font-size: 22px;
  font-weight: 700;
}

.percent-ring__unit {
  font-size: 12px;
  font-weight: 600;
}

.percent-ring__caption {
  margin-top: 4px;
  max-width: 72px;
  font-size: 11px;
  line-height: 1.2;
  color: #8c8c8c;
}

.percent-ring__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  font-size: 12px;
  color: #8c8c8c;
}

.percent-ring__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.percent-ring__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
