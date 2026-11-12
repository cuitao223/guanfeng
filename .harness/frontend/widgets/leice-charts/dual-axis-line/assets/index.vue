<template>
  <div class="dual-axis">
    <div class="dual-axis__head">
      <span class="dual-axis__title">{{ titleText }}</span>
      <div class="dual-axis__legend">
        <span><i :style="{ background: leftColor }" />{{ leftNameText }} ({{ leftUnit }})</span>
        <span><i :style="{ background: rightColor }" />{{ rightNameText }} ({{ rightUnit }})</span>
      </div>
    </div>
    <div ref="plot" class="dual-axis__plot" @mousemove="onMove" @mouseleave="onLeave">
      <svg class="dual-axis__svg" :width="width" :height="height">
        <line
          v-for="(line, index) in model.hGrid"
          :key="'h' + index"
          :x1="model.plot.x"
          :x2="model.plot.x + model.plot.w"
          :y1="line.y"
          :y2="line.y"
          class="dual-axis__grid"
        />
        <line
          :x1="model.plot.x"
          :x2="model.plot.x"
          :y1="model.plot.y"
          :y2="model.plot.y + model.plot.h"
          class="dual-axis__axis"
        />
        <line
          :x1="model.plot.x + model.plot.w"
          :x2="model.plot.x + model.plot.w"
          :y1="model.plot.y"
          :y2="model.plot.y + model.plot.h"
          class="dual-axis__axis"
        />
        <line
          :x1="model.plot.x"
          :x2="model.plot.x + model.plot.w"
          :y1="model.plot.y + model.plot.h"
          :y2="model.plot.y + model.plot.h"
          class="dual-axis__axis"
        />
        <text
          v-for="(tick, index) in model.leftTicks"
          :key="'lt' + index"
          :x="model.plot.x - 6"
          :y="tick.y"
          :font-size="model.font"
          text-anchor="end"
          dominant-baseline="middle"
          class="dual-axis__tick dual-axis__tick--left"
        >{{ tick.text }}</text>
        <text
          v-for="(tick, index) in model.rightTicks"
          :key="'rt' + index"
          :x="model.plot.x + model.plot.w + 6"
          :y="tick.y"
          :font-size="model.font"
          text-anchor="start"
          dominant-baseline="middle"
          class="dual-axis__tick dual-axis__tick--right"
        >{{ tick.text }}</text>
        <text
          v-for="(tick, index) in model.xTicks"
          :key="'xt' + index"
          :x="tick.x"
          :y="model.plot.y + model.plot.h + model.font + 4"
          :font-size="model.font"
          text-anchor="middle"
          class="dual-axis__tick"
        >{{ tick.text }}</text>
        <path
          v-for="(path, index) in model.leftPaths"
          :key="'lp' + index"
          :d="path"
          fill="none"
          :stroke="leftColor"
          stroke-width="2"
        />
        <path
          v-for="(path, index) in model.rightPaths"
          :key="'rp' + index"
          :d="path"
          fill="none"
          :stroke="rightColor"
          stroke-width="2"
        />
        <circle
          v-for="(dot, index) in model.leftDots"
          :key="'ld' + index"
          :cx="dot.x"
          :cy="dot.y"
          r="2.5"
          :fill="leftColor"
        />
        <circle
          v-for="(dot, index) in model.rightDots"
          :key="'rd' + index"
          :cx="dot.x"
          :cy="dot.y"
          r="2.5"
          :fill="rightColor"
        />
        <line
          v-if="tip.show && active"
          :x1="active.x"
          :x2="active.x"
          :y1="model.plot.y"
          :y2="model.plot.y + model.plot.h"
          class="dual-axis__guide"
        />
      </svg>
      <div v-show="model.empty" class="dual-axis__empty">{{ $t('widget.chart.empty') }}</div>
      <div v-show="tip.show" class="dual-axis__tip" :style="tipStyle">
        <div>{{ tip.time }}</div>
        <div><i :style="{ background: leftColor }" />{{ leftNameText }}: {{ tip.left }} {{ leftUnit }}</div>
        <div><i :style="{ background: rightColor }" />{{ rightNameText }}: {{ tip.right }} {{ rightUnit }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { buildDualPlot, formatNumber, nearestIndex } from '@/utils/chart/series'

export default {
  name: 'DualAxisLine',
  props: {
    title: { type: String, default: '' },
    times: { type: Array, default: () => [] },
    leftName: { type: String, default: '' },
    leftUnit: { type: String, default: '°C' },
    leftColor: { type: String, default: '#E76F51' },
    leftValues: { type: Array, default: () => [] },
    rightName: { type: String, default: '' },
    rightUnit: { type: String, default: '%' },
    rightColor: { type: String, default: '#206DF1' },
    rightValues: { type: Array, default: () => [] }
  },
  data() {
    return {
      width: 0,
      height: 0,
      tip: { show: false, x: 0, y: 0, time: '', left: '', right: '', index: -1 }
    }
  },
  computed: {
    titleText() {
      return this.title || this.$t('widget.dualAxis.title')
    },
    leftNameText() {
      return this.leftName || this.$t('widget.dualAxis.temperature')
    },
    rightNameText() {
      return this.rightName || this.$t('widget.dualAxis.humidity')
    },
    model() {
      return buildDualPlot({
        width: this.width,
        height: this.height,
        times: this.times,
        leftValues: this.leftValues,
        rightValues: this.rightValues
      })
    },
    active() {
      if (!this.tip.show || this.tip.index < 0) return null
      return this.model.samples[this.tip.index] || null
    },
    tipStyle() {
      return { left: `${this.tip.x}px`, top: `${this.tip.y}px` }
    }
  },
  mounted() {
    this.measure()
    this.observer = new ResizeObserver(() => this.measure())
    if (this.$refs.plot) this.observer.observe(this.$refs.plot)
  },
  beforeUnmount() {
    this.observer?.disconnect()
  },
  methods: {
    measure() {
      const host = this.$refs.plot
      if (!host) return
      this.width = host.clientWidth
      this.height = host.clientHeight
    },
    textOf(value) {
      return value == null ? this.$t('widget.chart.missing') : formatNumber(value, 1)
    },
    onMove(event) {
      const host = this.$refs.plot
      const samples = this.model.samples
      if (!host || !samples.length || this.model.empty) return
      const rect = host.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const plot = this.model.plot
      if (x < plot.x || x > plot.x + plot.w || y < plot.y || y > plot.y + plot.h) {
        this.tip.show = false
        return
      }
      const index = nearestIndex(x, plot, samples.length)
      const sample = samples[index]
      this.tip.show = true
      this.tip.index = index
      this.tip.time = sample.time
      this.tip.left = this.textOf(sample.left)
      this.tip.right = this.textOf(sample.right)
      this.tip.x = Math.min(Math.max(8, x + 12), Math.max(8, this.width - 168))
      this.tip.y = Math.max(8, y - 28)
    },
    onLeave() {
      this.tip.show = false
    }
  }
}
</script>

<style lang="scss" scoped>
.dual-axis {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 280px;
  padding: 12px 12px 8px;
  border-radius: 8px;
  background: #fff;
  color: #404040;
}
.dual-axis__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 24px;
}
.dual-axis__title {
  color: #171717;
  font-size: 16px;
  font-weight: 700;
}
.dual-axis__legend {
  display: flex;
  gap: 16px;
  color: #666;
  font-size: 12px;
}
.dual-axis__legend span {
  display: inline-flex;
  align-items: center;
}
.dual-axis__legend i,
.dual-axis__tip i {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
}
.dual-axis__plot {
  position: relative;
  flex: 1;
  min-height: 220px;
}
.dual-axis__svg {
  display: block;
  width: 100%;
  height: 100%;
}
.dual-axis__grid {
  stroke: #e5e5e5;
  stroke-dasharray: 4 4;
}
.dual-axis__axis {
  stroke: #ced1d6;
}
.dual-axis__tick {
  fill: #666;
}
.dual-axis__tick--left {
  fill: #e76f51;
}
.dual-axis__tick--right {
  fill: #206df1;
}
.dual-axis__guide {
  stroke: #8c8c8c;
  stroke-dasharray: 3 3;
}
.dual-axis__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8c8c8c;
  font-size: 14px;
}
.dual-axis__tip {
  position: absolute;
  z-index: 2;
  min-width: 148px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(17, 24, 39, 0.92);
  color: #fff;
  font-size: 12px;
  line-height: 1.6;
  pointer-events: none;
}
</style>
