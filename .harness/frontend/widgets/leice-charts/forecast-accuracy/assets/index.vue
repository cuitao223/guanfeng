<template>
  <section class="accuracy-chart">
    <header class="accuracy-chart__head">
      <span class="accuracy-chart__mark" />
      <span class="accuracy-chart__title">{{ titleText }}</span>
    </header>
    <div v-if="summary.length" class="accuracy-chart__summary">
      <span v-for="item in summary" :key="item.label">{{ item.label }}: {{ item.value }}</span>
    </div>
    <div class="accuracy-chart__legend">
      <span v-for="item in bars" :key="'b' + item.key"><i class="is-bar" :style="{ background: item.color }" />{{ item.name }}</span>
      <span v-for="item in lines" :key="'l' + item.key"><i :style="{ background: item.color }" />{{ item.name }}</span>
    </div>
    <div ref="plot" class="accuracy-chart__plot" @mousemove="onMove" @mouseleave="onLeave">
      <svg :width="width" :height="height">
        <line
          v-for="(line, index) in model.hGrid"
          :key="'g' + index"
          :x1="model.plot.x"
          :x2="model.plot.x + model.plot.w"
          :y1="line.y"
          :y2="line.y"
          class="accuracy-chart__grid"
        />
        <line
          :x1="model.plot.x"
          :x2="model.plot.x"
          :y1="model.plot.y"
          :y2="model.plot.y + model.plot.h"
          class="accuracy-chart__axis"
        />
        <line
          :x1="model.plot.x + model.plot.w"
          :x2="model.plot.x + model.plot.w"
          :y1="model.plot.y"
          :y2="model.plot.y + model.plot.h"
          class="accuracy-chart__axis"
        />
        <line
          :x1="model.plot.x"
          :x2="model.plot.x + model.plot.w"
          :y1="model.plot.y + model.plot.h"
          :y2="model.plot.y + model.plot.h"
          class="accuracy-chart__axis"
        />
        <rect
          v-for="bar in model.bars"
          :key="bar.key"
          :x="bar.x"
          :y="bar.y"
          :width="bar.w"
          :height="bar.h"
          :fill="bar.color"
        />
        <template v-for="item in model.paths" :key="item.key">
          <path v-for="(path, pathIndex) in item.d" :key="item.key + pathIndex" :d="path" fill="none" :stroke="item.color" stroke-width="2" />
          <circle v-for="(dot, dotIndex) in item.dots" :key="item.key + 'd' + dotIndex" :cx="dot.x" :cy="dot.y" r="3" :fill="item.color" />
        </template>
        <text
          v-for="(tick, index) in model.leftTicks"
          :key="'ly' + index"
          :x="model.plot.x - 6"
          :y="tick.y"
          :font-size="model.font"
          text-anchor="end"
          dominant-baseline="middle"
          class="accuracy-chart__tick"
        >{{ tick.text }}</text>
        <text
          v-for="(tick, index) in model.rightTicks"
          :key="'ry' + index"
          :x="model.plot.x + model.plot.w + 6"
          :y="tick.y"
          :font-size="model.font"
          text-anchor="start"
          dominant-baseline="middle"
          class="accuracy-chart__tick"
        >{{ tick.text }}</text>
        <text
          v-for="(tick, index) in model.xTicks"
          :key="'x' + index"
          :x="tick.x"
          :y="model.plot.y + model.plot.h + model.font + 4"
          :font-size="model.font"
          text-anchor="middle"
          class="accuracy-chart__tick"
        >{{ tick.text }}</text>
        <line
          v-if="tip.show && active"
          :x1="active.x"
          :x2="active.x"
          :y1="model.plot.y"
          :y2="model.plot.y + model.plot.h"
          class="accuracy-chart__guide"
        />
      </svg>
      <div v-show="model.empty" class="accuracy-chart__empty">{{ $t('widget.chart.empty') }}</div>
      <div v-show="tip.show" class="accuracy-chart__tip" :style="tipStyle">
        <div>{{ tip.time }}</div>
        <div v-for="row in tip.rows" :key="row.key"><i :style="{ background: row.color }" />{{ row.name }}: {{ row.text }}</div>
      </div>
    </div>
  </section>
</template>

<script>
import { buildBarLinePlot, formatNumber, nearestIndex } from '@/utils/chart/series'

export default {
  name: 'ForecastAccuracyChart',
  props: {
    title: { type: String, default: '' },
    categories: { type: Array, default: () => [] },
    bars: { type: Array, default: () => [] },
    lines: { type: Array, default: () => [] },
    barUnit: { type: String, default: 'MWh' },
    lineUnit: { type: String, default: '%' },
    summary: { type: Array, default: () => [] }
  },
  data() {
    return {
      width: 0,
      height: 0,
      tip: { show: false, x: 0, y: 0, time: '', rows: [], index: -1 }
    }
  },
  computed: {
    titleText() {
      return this.title || this.$t('widget.farm.accuracy')
    },
    model() {
      return buildBarLinePlot({
        width: this.width,
        height: this.height,
        categories: this.categories,
        bars: this.bars,
        lines: this.lines
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
      const rows = []
      this.bars.forEach((item, rowIndex) => {
        const value = sample.bars[rowIndex]
        rows.push({
          key: item.key,
          name: item.name,
          color: item.color,
          text: `${value == null ? this.$t('widget.chart.missing') : formatNumber(value, 1)} ${this.barUnit}`
        })
      })
      this.lines.forEach((item, rowIndex) => {
        const value = sample.lines[rowIndex]
        rows.push({
          key: item.key,
          name: item.name,
          color: item.color,
          text: `${value == null ? this.$t('widget.chart.missing') : formatNumber(value, 1)} ${this.lineUnit}`
        })
      })
      this.tip.show = true
      this.tip.index = index
      this.tip.time = sample.time
      this.tip.rows = rows
      this.tip.x = Math.min(Math.max(8, x + 12), Math.max(8, this.width - 200))
      this.tip.y = Math.max(8, Math.min(y, this.height - 120))
    },
    onLeave() {
      this.tip.show = false
    }
  }
}
</script>

<style lang="scss" scoped>
.accuracy-chart {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  min-height: 320px;
  padding: 12px;
  border-radius: 8px;
  background: #fff;
}
.accuracy-chart__head {
  display: flex;
  align-items: center;
}
.accuracy-chart__mark {
  width: 2px;
  height: 14px;
  margin-right: 6px;
  background: #206df1;
}
.accuracy-chart__title {
  color: #171717;
  font-size: 16px;
  font-weight: 800;
}
.accuracy-chart__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 10px;
  color: #404040;
  font-size: 13px;
}
.accuracy-chart__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 8px;
  color: #666;
  font-size: 12px;
}
.accuracy-chart__legend span {
  display: inline-flex;
  align-items: center;
}
.accuracy-chart__legend i,
.accuracy-chart__tip i {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
}
.accuracy-chart__legend i.is-bar {
  border-radius: 1px;
}
.accuracy-chart__plot {
  position: relative;
  flex: 1;
  min-height: 220px;
}
.accuracy-chart__plot svg {
  display: block;
  width: 100%;
  height: 100%;
}
.accuracy-chart__grid {
  stroke: #e5e5e5;
  stroke-dasharray: 4 4;
}
.accuracy-chart__axis {
  stroke: #ced1d6;
}
.accuracy-chart__guide {
  stroke: #8c8c8c;
  stroke-dasharray: 3 3;
}
.accuracy-chart__tick {
  fill: #666;
}
.accuracy-chart__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8c8c8c;
  font-size: 14px;
}
.accuracy-chart__tip {
  position: absolute;
  z-index: 2;
  min-width: 168px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(17, 24, 39, 0.92);
  color: #fff;
  font-size: 12px;
  line-height: 1.6;
  pointer-events: none;
}
</style>
