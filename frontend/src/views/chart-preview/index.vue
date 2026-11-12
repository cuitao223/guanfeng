<template>
  <div class="chart-preview">
    <section class="chart-preview__block">
      <dual-axis-line
        :times="hours"
        :left-values="temperature"
        :right-values="humidity"
        left-unit="°C"
        right-unit="%"
      />
    </section>
    <section class="chart-preview__farm">
      <farm-status-board class="chart-preview__status" :updated="updated" :location="location" :items="statusItems" />
      <power-forecast-chart :updated="updated" :times="powerTimes" :series="powerSeries" />
      <wind-layer-chart
        :location="location"
        :temperature="18.6"
        :humidity="62"
        :pressure="1012.4"
        :layers="layers"
      />
      <div class="chart-preview__accuracy">
        <div class="chart-preview__filters">
          <el-switch
            v-model="centralized"
            :active-text="$t('widget.farm.centralized')"
            :inactive-text="$t('widget.farm.dispatch')"
          />
          <el-radio-group v-model="dayWindow">
            <el-radio-button value="5">{{ $t('widget.farm.days5') }}</el-radio-button>
            <el-radio-button value="7">{{ $t('widget.farm.days7') }}</el-radio-button>
            <el-radio-button value="10">{{ $t('widget.farm.days10') }}</el-radio-button>
            <el-radio-button value="15">{{ $t('widget.farm.days15') }}</el-radio-button>
          </el-radio-group>
        </div>
        <forecast-accuracy-chart
          :categories="accuracyCategories"
          :bars="accuracyBars"
          :lines="accuracyLines"
          :summary="accuracySummary"
        />
      </div>
    </section>
    <section class="chart-preview__lidar">
      <h2>{{ $t('widget.gallery.lidar') }}</h2>
      <lidar-gallery />
    </section>
  </div>
</template>

<script>
import DualAxisLine from '@/components/DualAxisLine/index.vue'
import LidarGallery from '@/views/overview/LidarGallery.vue'
import FarmStatusBoard from '@/components/FarmStatusBoard/index.vue'
import ForecastAccuracyChart from '@/components/ForecastAccuracyChart/index.vue'
import PowerForecastChart from '@/components/PowerForecastChart/index.vue'
import WindLayerChart from '@/components/WindLayerChart/index.vue'

function wave(count, base, amp, phase) {
  return Array.from({ length: count }, (_, index) => {
    const theta = (index / count) * Math.PI * 2
    return Math.round((base + amp * Math.sin(theta + phase)) * 10) / 10
  })
}

export default {
  name: 'ChartPreview',
  components: { DualAxisLine, FarmStatusBoard, ForecastAccuracyChart, LidarGallery, PowerForecastChart, WindLayerChart },
  data() {
    const hours = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`)
    const temperature = wave(24, 16, 7, -1)
    const humidity = wave(24, 68, 18, 2)
    humidity[12] = 999
    const powerTimes = Array.from({ length: 16 }, (_, index) => {
      const hour = Math.floor(index / 2)
      const minute = index % 2 === 0 ? '00' : '30'
      return `${String(hour).padStart(2, '0')}:${minute}`
    })
    const accuracyDays = Array.from({ length: 15 }, (_, index) => `10-${String(index + 1).padStart(2, '0')}`)
    return {
      updated: '10-22 16:40:00',
      location: '117.12 E, 36.65 N',
      hours,
      temperature,
      humidity,
      powerTimes,
      actualPower: wave(16, 22, 8, 0.4),
      availablePower: wave(16, 28, 6, 0.2),
      shortPower: wave(16, 24, 7, 0.6),
      ultraPower: wave(16, 21, 9, 1),
      layers: [
        { height: 10, speed: 3.2, direction: 210 },
        { height: 30, speed: 4.6, direction: 224 },
        { height: 50, speed: 5.8, direction: 236 },
        { height: 70, speed: 6.4, direction: 241 },
        { height: 100, speed: 7.1, direction: 248 },
        { height: 120, speed: 7.6, direction: 252 },
        { height: 150, speed: 999, direction: 260 }
      ],
      accuracyDays,
      energyIntraday: wave(15, 12, 4, 0.2),
      energyShort: wave(15, 18, 5, 0.8),
      energyUltra: wave(15, 8, 3, 1.4),
      rateIntraday: wave(15, 96, 3, 0.3),
      rateShort: wave(15, 94, 4, 1),
      rateUltra: wave(15, 98, 1.5, 0.6),
      centralized: true,
      dayWindow: '5'
    }
  },
  computed: {
    statusItems() {
      return [
        { key: 'grid', label: this.$t('widget.farm.gridPower'), value: '18.60', tone: 'purple' },
        { key: 'turbine', label: this.$t('widget.farm.turbines'), value: '12', tone: 'blue', alarm: this.$t('widget.farm.outage') },
        { key: 'capacity', label: this.$t('widget.farm.capacity'), value: '50.00', tone: 'purple' },
        { key: 'plan', label: this.$t('widget.farm.planCapacity'), value: '48.00', tone: 'blue' },
        { key: 'forecast', label: this.$t('widget.farm.dailyForecast'), value: '320.00', tone: 'purple' },
        { key: 'actual', label: this.$t('widget.farm.dailyActual'), value: '286.40', tone: 'blue' }
      ]
    },
    powerSeries() {
      const ultra = this.ultraPower.slice()
      ultra[6] = -999
      return [
        { key: 'actual', name: this.$t('widget.farm.actualPower'), color: '#D41315', values: this.actualPower },
        { key: 'available', name: this.$t('widget.farm.availablePower'), color: '#F3ABAB', values: this.availablePower },
        { key: 'short', name: this.$t('widget.farm.shortPower'), color: '#299D91', values: this.shortPower },
        { key: 'ultra', name: this.$t('widget.farm.ultraPower'), color: '#E8C46A', values: ultra }
      ]
    },
    windowCount() {
      return Number(this.dayWindow) || 5
    },
    accuracyCategories() {
      return this.accuracyDays.slice(0, this.windowCount)
    },
    accuracyBars() {
      const scale = this.centralized ? 1 : 0.86
      const take = (values) => values.slice(0, this.windowCount).map((value) => Math.round(value * scale * 10) / 10)
      return [
        { key: 'intraday', name: this.$t('widget.farm.energyIntraday'), color: '#F07C60', values: take(this.energyIntraday) },
        { key: 'short', name: this.$t('widget.farm.energyShort'), color: '#299D91', values: take(this.energyShort) },
        { key: 'ultra', name: this.$t('widget.farm.energyUltra'), color: '#E8C46A', values: take(this.energyUltra) }
      ]
    },
    accuracyLines() {
      const shift = this.centralized ? 0 : -1.2
      const take = (values) => values.slice(0, this.windowCount).map((value) => Math.round((value + shift) * 10) / 10)
      return [
        { key: 'intraday', name: this.$t('widget.farm.rateIntraday'), color: '#E76F51', values: take(this.rateIntraday) },
        { key: 'short', name: this.$t('widget.farm.rateShort'), color: '#2E50BB', values: take(this.rateShort) },
        { key: 'ultra', name: this.$t('widget.farm.rateUltra'), color: '#6DC5E5', values: take(this.rateUltra) }
      ]
    },
    accuracySummary() {
      const avg = (list) => {
        const nums = list.map(Number).filter((value) => Number.isFinite(value))
        if (!nums.length) return '--'
        return (nums.reduce((sum, value) => sum + value, 0) / nums.length).toFixed(1)
      }
      return [
        { label: this.$t('widget.farm.rateIntraday'), value: `${avg(this.accuracyLines[0].values)}%` },
        { label: this.$t('widget.farm.rateShort'), value: `${avg(this.accuracyLines[1].values)}%` },
        { label: this.$t('widget.farm.rateUltra'), value: `${avg(this.accuracyLines[2].values)}%` },
        { label: this.$t('widget.farm.energyShort'), value: `${avg(this.accuracyBars[1].values)} MWh` }
      ]
    }
  }
}
</script>

<style lang="scss" scoped>
.chart-preview {
  box-sizing: border-box;
  height: 100%;
  overflow: auto;
  padding-right: 4px;
}
.chart-preview__block {
  height: 360px;
}
.chart-preview__farm {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  margin-top: 16px;
}
.chart-preview__status,
.chart-preview__accuracy,
.chart-preview__farm > * {
  min-width: 0;
}
.chart-preview__accuracy {
  display: flex;
  flex-direction: column;
  min-height: 360px;
  padding: 12px 12px 0;
  border-radius: 8px;
  background: #fff;
}
.chart-preview__lidar {
  margin-top: 28px;
}
.chart-preview__lidar h2 {
  margin: 0 0 12px;
  color: #fff;
  font-size: 18px;
}
.chart-preview__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  margin-bottom: 8px;
}
</style>
