<template>
  <section class="power-chart">
    <header class="power-chart__head">
      <span class="power-chart__mark" />
      <span class="power-chart__title">{{ titleText }}</span>
      <span v-if="updated" class="power-chart__time">{{ $t('widget.farm.updated') }}: {{ updated }}</span>
    </header>
    <div class="power-chart__checks">
      <el-checkbox v-model="checkAll" :indeterminate="indeterminate" @change="toggleAll">{{ $t('widget.farm.selectAll') }}</el-checkbox>
      <el-checkbox-group v-model="checked" @change="syncAll">
        <el-checkbox v-for="item in series" :key="item.key" :value="item.key">
          <i class="power-chart__swatch" :style="{ background: item.color }" />{{ item.name }}
        </el-checkbox>
      </el-checkbox-group>
    </div>
    <div ref="plot" class="power-chart__plot" @mousemove="onMove" @mouseleave="onLeave">
      <svg class="power-chart__svg" :width="width" :height="height">
        <line
          v-for="(line, index) in model.hGrid"
          :key="'g' + index"
          :x1="model.plot.x"
          :x2="model.plot.x + model.plot.w"
          :y1="line.y"
          :y2="line.y"
          class="power-chart__grid"
        />
        <line
          :x1="model.plot.x"
          :x2="model.plot.x + model.plot.w"
          :y1="model.plot.y + model.plot.h"
          :y2="model.plot.y + model.plot.h"
          class="power-chart__axis"
        />
        <text
          v-for="(tick, index) in model.leftTicks"
          :key="'y' + index"
          :x="model.plot.x - 6"
          :y="tick.y"
          :font-size="model.font"
          text-anchor="end"
          dominant-baseline="middle"
          class="power-chart__tick"
        >{{ tick.text }}</text>
        <text
          v-for="(tick, index) in model.xTicks"
          :key="'x' + index"
          :x="tick.x"
          :y="model.plot.y + model.plot.h + model.font + 4"
          :font-size="model.font"
          text-anchor="middle"
          class="power-chart__tick"
        >{{ tick.text }}</text>
        <template v-for="item in model.paths" :key="item.key">
          <path v-for="(path, pathIndex) in item.d" :key="item.key + pathIndex" :d="path" fill="none" :stroke="item.color" stroke-width="2" />
          <circle v-for="(dot, dotIndex) in item.dots" :key="item.key + 'd' + dotIndex" :cx="dot.x" :cy="dot.y" r="2.5" :fill="item.color" />
        </template>
        <line
          v-if="tip.show && active"
          :x1="active.x"
          :x2="active.x"
          :y1="model.plot.y"
          :y2="model.plot.y + model.plot.h"
          class="power-chart__guide"
        />
      </svg>
      <div v-show="model.empty" class="power-chart__empty">{{ $t('widget.chart.empty') }}</div>
      <div v-show="tip.show" class="power-chart__tip" :style="tipStyle">
        <div>{{ tip.time }}</div>
        <div v-for="row in tip.rows" :key="row.key"><i :style="{ background: row.color }" />{{ row.name }}: {{ row.text }} {{ unit }}</div>
      </div>
    </div>
  </section>
</template>

<script>
import { buildLinePlot, formatNumber, nearestIndex } from '@/utils/chart/series'

export default {
  name: 'PowerForecastChart',
  props: {
    title: { type: String, default: '' },
    updated: { type: String, default: '' },
    unit: { type: String, default: 'MW' },
    times: { type: Array, default: () => [] },
    series: { type: Array, default: () => [] }
  },
  data() {
    return {
      width: 0,
      height: 0,
      checked: [],
      checkAll: true,
      indeterminate: false,
      tip: { show: false, x: 0, y: 0, time: '', rows: [], index: -1 },
      checksReady: false
    }
  },
  computed: {
    titleText() {
      return this.title || this.$t('widget.farm.todayPower')
    },
    visibleSeries() {
      return this.series.filter((item) => this.checked.includes(item.key))
    },
    model() {
      return buildLinePlot({
        width: this.width,
        height: this.height,
        times: this.times,
        series: this.visibleSeries
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
  watch: {
    series: {
      immediate: true,
      handler(list) {
        const keys = (list || []).map((item) => item.key)
        if (!this.checksReady) {
          this.checked = keys.slice()
          this.checkAll = keys.length > 0
          this.indeterminate = false
          this.checksReady = true
          return
        }
        const next = this.checked.filter((key) => keys.includes(key))
        this.checked = next
        this.checkAll = next.length > 0 && next.length === keys.length
        this.indeterminate = next.length > 0 && next.length < keys.length
      }
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
    toggleAll(checked) {
      this.checked = checked ? this.series.map((item) => item.key) : []
      this.indeterminate = false
    },
    syncAll(values) {
      const total = this.series.length
      this.checkAll = values.length === total
      this.indeterminate = values.length > 0 && values.length < total
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
      this.tip.rows = this.visibleSeries.map((item, rowIndex) => ({
        key: item.key,
        name: item.name,
        color: item.color,
        text: sample.values[rowIndex] == null ? this.$t('widget.chart.missing') : formatNumber(sample.values[rowIndex], 2)
      }))
      this.tip.x = Math.min(Math.max(8, x + 12), Math.max(8, this.width - 190))
      this.tip.y = Math.max(8, Math.min(y, this.height - 96))
    },
    onLeave() {
      this.tip.show = false
    }
  }
}
</script>

<style lang="scss" scoped>
.power-chart {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  min-height: 320px;
  padding: 12px;
  border-radius: 8px;
  background: #fff;
}
.power-chart__head {
  display: flex;
  align-items: center;
}
.power-chart__mark {
  width: 2px;
  height: 14px;
  margin-right: 6px;
  background: #206df1;
}
.power-chart__title {
  color: #171717;
  font-size: 16px;
  font-weight: 800;
}
.power-chart__time {
  margin-left: 8px;
  color: #767676;
  font-size: 12px;
}
.power-chart__checks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-top: 8px;
}
.power-chart__swatch {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 4px;
  border-radius: 50%;
}
.power-chart__plot {
  position: relative;
  flex: 1;
  min-height: 220px;
}
.power-chart__svg {
  display: block;
  width: 100%;
  height: 100%;
}
.power-chart__grid {
  stroke: #e5e5e5;
  stroke-dasharray: 4 4;
}
.power-chart__axis,
.power-chart__guide {
  stroke: #ced1d6;
}
.power-chart__guide {
  stroke-dasharray: 3 3;
}
.power-chart__tick {
  fill: #666;
}
.power-chart__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8c8c8c;
  font-size: 14px;
}
.power-chart__tip {
  position: absolute;
  z-index: 2;
  min-width: 160px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(17, 24, 39, 0.92);
  color: #fff;
  font-size: 12px;
  line-height: 1.6;
  pointer-events: none;
}
.power-chart__tip i {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
}
</style>
