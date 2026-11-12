<template>
  <section class="wind-layer">
    <header class="wind-layer__head">
      <span class="wind-layer__mark" />
      <span class="wind-layer__title">{{ titleText }}</span>
      <el-switch v-model="showTable" :active-text="$t('widget.farm.valueMode')" :inactive-text="$t('widget.farm.profileMode')" />
    </header>
    <div v-if="location" class="wind-layer__location">{{ location }}</div>
    <div class="wind-layer__env">
      <span>{{ $t('widget.dualAxis.temperature') }}(°C): {{ textOf(temperature, 1) }}</span>
      <span>{{ $t('widget.dualAxis.humidity') }}(%): {{ textOf(humidity, 1) }}</span>
      <span>{{ $t('widget.farm.pressure') }}(hPa): {{ textOf(pressure, 2) }}</span>
    </div>
    <div v-if="showTable" class="wind-layer__table">
      <div class="wind-layer__row wind-layer__row--head">
        <span>{{ $t('widget.farm.height') }}</span>
        <span>{{ $t('widget.farm.speed') }}</span>
        <span>{{ $t('widget.farm.direction') }}</span>
      </div>
      <div
        v-for="(row, index) in tableRows"
        :key="row.height + '-' + index"
        class="wind-layer__row"
        :class="index % 2 === 0 ? 'is-odd' : 'is-even'"
      >
        <span>{{ row.heightText }}</span>
        <span>{{ row.speedText }}</span>
        <span>{{ row.directionText }}</span>
      </div>
      <div v-if="!tableRows.length" class="wind-layer__empty">{{ $t('widget.chart.empty') }}</div>
    </div>
    <div v-else class="wind-layer__charts" @mousemove="onMove" @mouseleave="onLeave">
      <div class="wind-layer__pane">
        <div class="wind-layer__pane-title">{{ $t('widget.farm.speed') }}(m/s)</div>
        <div ref="speed" class="wind-layer__plot">
          <svg :width="speedBox.width" :height="speedBox.height">
            <line
              v-for="(line, index) in speedModel.vGrid"
              :key="'sg' + index"
              :x1="line.x"
              :x2="line.x"
              :y1="speedModel.plot.y"
              :y2="speedModel.plot.y + speedModel.plot.h"
              class="wind-layer__grid"
            />
            <line
              v-if="speedModel.maxLine != null"
              :x1="speedModel.maxLine"
              :x2="speedModel.maxLine"
              :y1="speedModel.plot.y"
              :y2="speedModel.plot.y + speedModel.plot.h"
              class="wind-layer__max"
            />
            <path :d="speedModel.path" fill="none" stroke="#206DF1" stroke-width="2" stroke-dasharray="6 4" />
            <circle v-for="(dot, index) in speedModel.dots" :key="'sd' + index" :cx="dot.x" :cy="dot.y" r="3" fill="#206DF1" />
            <text
              v-for="(tick, index) in speedModel.yTicks"
              :key="'sy' + index"
              :x="tick.x"
              :y="tick.y"
              :font-size="speedModel.font"
              text-anchor="end"
              dominant-baseline="middle"
              class="wind-layer__tick"
            >{{ tick.text }}</text>
            <text
              v-for="(tick, index) in speedModel.xTicks"
              :key="'sx' + index"
              :x="tick.x"
              :y="tick.y"
              :font-size="speedModel.font"
              text-anchor="middle"
              class="wind-layer__tick"
            >{{ tick.text }}</text>
            <line
              v-if="tip.show && speedActive"
              :x1="speedModel.plot.x"
              :x2="speedModel.plot.x + speedModel.plot.w"
              :y1="speedActive.y"
              :y2="speedActive.y"
              class="wind-layer__guide"
            />
          </svg>
        </div>
      </div>
      <div class="wind-layer__pane">
        <div class="wind-layer__pane-title">{{ $t('widget.farm.direction') }}(°)</div>
        <div ref="direction" class="wind-layer__plot">
          <svg :width="directionBox.width" :height="directionBox.height">
            <line
              v-for="(line, index) in directionModel.vGrid"
              :key="'dg' + index"
              :x1="line.x"
              :x2="line.x"
              :y1="directionModel.plot.y"
              :y2="directionModel.plot.y + directionModel.plot.h"
              class="wind-layer__grid"
            />
            <path :d="directionModel.path" fill="none" stroke="#206DF1" stroke-width="2" stroke-dasharray="6 4" />
            <circle v-for="(dot, index) in directionModel.dots" :key="'dd' + index" :cx="dot.x" :cy="dot.y" r="3" fill="#206DF1" />
            <text
              v-for="(tick, index) in directionModel.xTicks"
              :key="'dx' + index"
              :x="tick.x"
              :y="tick.y"
              :font-size="directionModel.font"
              text-anchor="middle"
              class="wind-layer__tick"
            >{{ tick.text }}</text>
            <line
              v-if="tip.show && directionActive"
              :x1="directionModel.plot.x"
              :x2="directionModel.plot.x + directionModel.plot.w"
              :y1="directionActive.y"
              :y2="directionActive.y"
              class="wind-layer__guide"
            />
          </svg>
        </div>
      </div>
      <div v-show="speedModel.empty && directionModel.empty" class="wind-layer__empty">{{ $t('widget.chart.empty') }}</div>
      <div v-show="tip.show" class="wind-layer__tip" :style="tipStyle">
        <div>{{ $t('widget.farm.height') }}: {{ tip.height }}</div>
        <div>{{ $t('widget.farm.speed') }}: {{ tip.speed }}</div>
        <div>{{ $t('widget.farm.direction') }}: {{ tip.direction }}</div>
      </div>
    </div>
  </section>
</template>

<script>
import { buildHeightPlot, formatNumber, isMissing } from '@/utils/chart/series'

export default {
  name: 'WindLayerChart',
  props: {
    title: { type: String, default: '' },
    location: { type: String, default: '' },
    temperature: { type: [Number, String], default: null },
    humidity: { type: [Number, String], default: null },
    pressure: { type: [Number, String], default: null },
    layers: { type: Array, default: () => [] }
  },
  data() {
    return {
      showTable: false,
      speedBox: { width: 0, height: 0 },
      directionBox: { width: 0, height: 0 },
      tip: { show: false, x: 0, y: 0, height: '', speed: '', direction: '', index: -1 }
    }
  },
  computed: {
    titleText() {
      return this.title || this.$t('widget.farm.resource')
    },
    ordered() {
      return this.layers.slice().sort((a, b) => Number(a.height) - Number(b.height))
    },
    tableRows() {
      return this.ordered.slice().reverse().map((row) => ({
        height: row.height,
        heightText: `${this.textOf(row.height, 0)}m`,
        speedText: this.withUnit(row.speed, 1, 'm/s'),
        directionText: this.withUnit(row.direction, 0, '°')
      }))
    },
    speedModel() {
      return buildHeightPlot({
        width: this.speedBox.width,
        height: this.speedBox.height,
        showLabels: true,
        includeZero: true,
        values: this.ordered.map((row) => ({ label: row.height, value: row.speed }))
      })
    },
    directionModel() {
      return buildHeightPlot({
        width: this.directionBox.width,
        height: this.directionBox.height,
        showLabels: false,
        includeZero: false,
        values: this.ordered.map((row) => ({ label: row.height, value: row.direction }))
      })
    },
    speedActive() {
      return this.tip.show ? this.speedModel.samples[this.tip.index] : null
    },
    directionActive() {
      return this.tip.show ? this.directionModel.samples[this.tip.index] : null
    },
    tipStyle() {
      return { left: `${this.tip.x}px`, top: `${this.tip.y}px` }
    }
  },
  watch: {
    showTable(value) {
      if (value) return
      this.$nextTick(() => {
        this.measure()
        if (this.$refs.speed) this.observer?.observe(this.$refs.speed)
        if (this.$refs.direction) this.observer?.observe(this.$refs.direction)
      })
    }
  },
  mounted() {
    this.measure()
    this.observer = new ResizeObserver(() => this.measure())
    if (this.$refs.speed) this.observer.observe(this.$refs.speed)
    if (this.$refs.direction) this.observer.observe(this.$refs.direction)
  },
  beforeUnmount() {
    this.observer?.disconnect()
  },
  methods: {
    measure() {
      const speed = this.$refs.speed
      const direction = this.$refs.direction
      if (speed) this.speedBox = { width: speed.clientWidth, height: speed.clientHeight }
      if (direction) this.directionBox = { width: direction.clientWidth, height: direction.clientHeight }
    },
    textOf(value, digits) {
      if (isMissing(value)) return this.$t('widget.chart.missing')
      return formatNumber(value, digits)
    },
    withUnit(value, digits, unit) {
      if (isMissing(value)) return this.$t('widget.chart.missing')
      return `${formatNumber(value, digits)}${unit}`
    },
    onMove(event) {
      const speed = this.$refs.speed
      const board = event.currentTarget
      const samples = this.speedModel.samples
      if (!speed || !board || !samples.length) return
      const speedRect = speed.getBoundingClientRect()
      const boardRect = board.getBoundingClientRect()
      const y = event.clientY - speedRect.top
      let best = 0
      let bestDist = Infinity
      samples.forEach((sample, index) => {
        const dist = Math.abs(sample.y - y)
        if (dist < bestDist) {
          best = index
          bestDist = dist
        }
      })
      const row = this.ordered[best]
      if (!row) return
      this.tip.show = true
      this.tip.index = best
      this.tip.height = `${this.textOf(row.height, 0)} m`
      this.tip.speed = isMissing(row.speed) ? this.$t('widget.chart.missing') : `${formatNumber(row.speed, 1)} m/s`
      this.tip.direction = isMissing(row.direction) ? this.$t('widget.chart.missing') : `${formatNumber(row.direction, 0)} °`
      this.tip.x = Math.min(Math.max(8, event.clientX - boardRect.left + 12), Math.max(8, boardRect.width - 160))
      this.tip.y = Math.max(8, event.clientY - boardRect.top - 20)
    },
    onLeave() {
      this.tip.show = false
    }
  }
}
</script>

<style lang="scss" scoped>
.wind-layer {
  position: relative;
  box-sizing: border-box;
  height: 100%;
  min-height: 320px;
  padding: 12px;
  border-radius: 8px;
  background: #fff;
  color: #404040;
}
.wind-layer__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.wind-layer__mark {
  width: 2px;
  height: 14px;
  background: #206df1;
}
.wind-layer__title {
  color: #171717;
  font-size: 16px;
  font-weight: 800;
}
.wind-layer__location {
  margin-top: 8px;
  text-align: center;
  font-size: 14px;
}
.wind-layer__env {
  display: flex;
  justify-content: space-around;
  margin: 12px 0;
  font-size: 14px;
}
.wind-layer__charts {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wind-layer__pane {
  display: flex;
  flex-direction: column;
  height: 210px;
  min-width: 0;
}
.wind-layer__pane-title {
  margin-bottom: 4px;
  color: #171717;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}
.wind-layer__plot {
  flex: 1;
  min-height: 0;
}
.wind-layer__plot svg {
  display: block;
  width: 100%;
  height: 100%;
}
.wind-layer__grid {
  stroke: #e5e5e5;
  stroke-dasharray: 4 4;
}
.wind-layer__max,
.wind-layer__guide {
  stroke: #ced1d6;
}
.wind-layer__tick {
  fill: #666;
}
.wind-layer__table {
  max-height: 250px;
  overflow: auto;
}
.wind-layer__row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  height: 32px;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
}
.wind-layer__row--head {
  color: #171717;
  font-weight: 700;
  background: #f4f7fb;
}
.wind-layer__row.is-odd {
  background: #fafafa;
}
.wind-layer__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: #8c8c8c;
  font-size: 14px;
}
.wind-layer__tip {
  position: absolute;
  z-index: 2;
  min-width: 140px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(17, 24, 39, 0.92);
  color: #fff;
  font-size: 12px;
  line-height: 1.6;
  pointer-events: none;
}
</style>
