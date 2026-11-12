<template>
  <div class="time-player-slider" :class="{ 'is-live': isLive }" :style="themeStyle">
    <el-tooltip :content="showAdvanced ? labels.collapseAdvanced : labels.expandAdvanced" placement="top">
      <div class="more-setting" @click="toggleAdvanced">
        <span class="toggle-icon" :class="{ expanded: showAdvanced }">›</span>
      </div>
    </el-tooltip>

    <div class="advanced-setup" :class="{ showMoreSetting: showAdvanced }">
      <el-tooltip :content="labels.pickStartTip" placement="top">
        <div class="start-time-choose">
          <el-date-picker
            v-model="startTime"
            type="datetime"
            :placeholder="labels.pickDate"
            :format="dateDisplayFormat"
            value-format="YYYY-MM-DD HH:mm:ss"
            :editable="false"
            :clearable="false"
            popper-class="time-player-picker-popper"
            :disabled-date="disabledStartDate"
            @change="handleStartTimeChange"
          />
        </div>
      </el-tooltip>
      <el-tooltip :content="labels.scaleTip" placement="top">
        <div class="scale">
          <span class="scale-btn" @click.stop="changeResolution(-1)">⌃</span>
          <span class="scale-label">{{ resolutionLabel }}</span>
          <span class="scale-btn" @click.stop="changeResolution(1)">⌄</span>
        </div>
      </el-tooltip>
      <el-tooltip :content="labels.playIntervalTip" placement="top">
        <el-dropdown trigger="click" placement="top" popper-class="time-player-interval-popper" @command="handlePlayIntervalChange">
          <div class="play-interval-trigger">
            <span class="play-interval-mark">⏱</span>
            <span class="play-interval-label">{{ playIntervalLabel }}</span>
            <span class="play-interval-arrow">⌃</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="opt in resolvedPlayIntervalOptions"
                :key="opt.value"
                :command="opt.value"
                :class="{ 'is-selected': opt.value === selectedPlayInterval }"
              >{{ opt.label }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-tooltip>
    </div>

    <div class="player-content">
      <div class="controls-left">
        <span class="now" :class="{ active: isLive }" @click="goLive">{{ labels.now }}</span>
      </div>
      <div class="controls-center">
        <div class="play-icon" :title="labels.first" @click="goFirst">
          <svg class="play-icon-svg" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.83 1.25h.58c.32 0 .58.25.58.57v2.56l5.45-3.13c.44-.01.73.15.73.58v6.76c-.01.5-.29.55-.73.58L2.99 6.04v2.56c0 .31-.26.57-.58.57h-.58c-.32 0-.58-.25-.58-.57V1.81c0-.31.26-.56.58-.56Z" fill="currentColor"/></svg>
        </div>
        <div class="play-icon" :title="labels.prev" @click="stepPrev">
          <svg class="play-icon-svg" viewBox="0 0 10 10" aria-hidden="true"><path d="M.77 5.4 5.43 8.75c.28.18.66.09.66-.45V6.86l2.63 1.89c.28.18.65.1.66-.46V1.72c.01-.62-.35-.62-.66-.45L6.09 3.16V1.7c0-.64-.35-.6-.66-.43L.77 4.61c-.21.22-.21.57 0 .79Z" fill="currentColor"/></svg>
        </div>
        <div class="play-toggle" :title="isPlaying ? labels.pause : labels.play" @click="togglePlay">
          <svg v-show="isPlaying" class="play-icon-svg" viewBox="0 0 10 10" aria-hidden="true"><path d="M2.15 2.2h1.5v5.6h-1.5V2.2Zm4.2 0h1.5v5.6h-1.5V2.2Z" fill="currentColor"/></svg>
          <svg v-show="!isPlaying" class="play-icon-svg" viewBox="0 0 10 10" aria-hidden="true"><path d="M3.2 2.1v5.8L7.8 5 3.2 2.1Z" fill="currentColor"/></svg>
        </div>
        <div class="play-icon" :title="labels.next" @click="stepNext">
          <svg class="play-icon-svg" viewBox="0 0 10 10" aria-hidden="true"><path d="M9.23 5.4 4.57 8.75c-.28.18-.66.09-.66-.45V6.86L1.28 8.75c-.28.18-.65.1-.66-.46V1.72C.61 1.1.97 1.1 1.28 1.27l2.63 1.89V1.7c0-.64.35-.6.66-.43l4.66 3.35c.21.22.21.57 0 .79Z" fill="currentColor"/></svg>
        </div>
        <div class="play-icon" :title="labels.last" @click="goLast">
          <svg class="play-icon-svg" viewBox="0 0 10 10" aria-hidden="true"><path d="M8.17 1.25h-.58c-.32 0-.58.25-.58.57v2.56L1.57 1.25C1.13 1.24.83 1.4.83 1.83v6.76c.01.5.29.55.73.58l5.45-3.13v2.56c0 .31.26.57.58.57h.58c.32 0 .58-.25.58-.57V1.81c0-.31-.26-.56-.58-.56Z" fill="currentColor"/></svg>
        </div>
      </div>
      <div ref="timeTrack" class="time">
        <div
          v-for="(day, index) in timelineDays"
          :key="day.key"
          class="time-item"
          :class="{ active: expandedDayKey === day.key, compact: expandedDayKey && expandedDayKey !== day.key }"
          :style="getDayItemStyle(day)"
        >
          <div class="time-item-inner" :class="{ 'is-expanded': expandedDayKey === day.key }">
            <div v-if="expandedDayKey === day.key" class="day-label day-label-left">
              <span>{{ day.weekLabel }}</span>
              <span class="day-label-date">{{ day.dateLabel }}</span>
            </div>
            <div class="time-line-wrap">
              <div
                class="time-line"
                :class="{ firstTimeLine: index === 0, lastTimeLine: index === timelineDays.length - 1 }"
                @click="onDayLineClick(day, $event)"
                @mousemove="onDayLineHover(day, $event)"
                @mouseleave="hideHoverTip"
              >
                <div class="flag" :style="{ width: getDayProgress(day) + '%' }" />
                <div
                  v-if="getDayMarkerProgress(day, wallClockNow) !== null"
                  class="marker-line marker-line--now"
                  :style="{ left: getDayMarkerProgress(day, wallClockNow) + '%' }"
                />
                <div
                  v-if="showForecastEndMarker && getDayMarkerProgress(day, forecastEndMoment) !== null"
                  class="marker-line marker-line--forecast"
                  :style="{ left: getDayMarkerProgress(day, forecastEndMoment) + '%' }"
                />
                <div v-if="expandedDayKey === day.key" class="datetime" :style="{ left: getDayProgress(day) + '%' }">
                  {{ formatDateTime(currentTime) }}
                </div>
                <div v-if="expandedDayKey === day.key" class="time-hour">
                  <span v-for="(tick, tickIndex) in hourTicks" :key="tickIndex" class="time-hour-tick" :style="{ left: tick.left + '%' }">{{ tick.label }}</span>
                  <div v-if="hoverTip.show && hoverTip.dayKey === day.key" class="hourtime" :style="{ left: hoverTip.leftPx + 'px' }">{{ hoverTip.text }}</div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="expandedDayKey !== day.key" class="day-label day-label-bottom">
            <div>{{ day.weekLabel }}</div>
            <div>{{ day.dateLabel }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { clock, parseStrict } from './time'
import { buildTimePlayerThemeVars } from './theme'
import {
  DEFAULT_FORECAST_DURATION_SECONDS,
  DEFAULT_LIVE_DELAY_SECONDS,
  DEFAULT_PLAY_INTERVAL_MS,
  DEFAULT_PLAY_INTERVAL_OPTIONS,
  DEFAULT_RESOLUTION_OPTIONS,
  DEFAULT_RESOLUTION_SECONDS,
  findPlayIntervalValue,
  findResolutionIndex,
  normalizePlayIntervalOptions,
  normalizeResolutionOptions
} from './resolution'

function clampTime(time, min, max) {
  const value = clock(time)
  if (value.isBefore(min)) return min.clone()
  if (value.isAfter(max)) return max.clone()
  return value
}

function alignToStep(time, stepSeconds) {
  const value = clock(time)
  const dayStart = value.clone().startOf('day')
  const totalSec = value.diff(dayStart, 'seconds')
  const aligned = Math.floor(totalSec / stepSeconds) * stepSeconds
  return dayStart.clone().add(aligned, 'seconds')
}

export default {
  name: 'TimePlayerSlider',
  props: {
    live: { type: Boolean, default: true },
    playInterval: { type: Number, default: DEFAULT_PLAY_INTERVAL_MS },
    playIntervalOptions: { type: Array, default: () => DEFAULT_PLAY_INTERVAL_OPTIONS },
    forecastSpanDays: { type: Number, default: 10 },
    theme: { type: Object, default: () => ({}) },
    defaultResolution: { type: Number, default: DEFAULT_RESOLUTION_SECONDS },
    resolutionOptions: { type: Array, default: () => DEFAULT_RESOLUTION_OPTIONS },
    liveDaysBefore: { type: Number, default: 8 },
    liveDaysAfter: { type: Number, default: 1 },
    liveDelaySeconds: { type: Number, default: DEFAULT_LIVE_DELAY_SECONDS },
    liveUpdateInterval: { type: Number, default: 10000 },
    forecastDurationSeconds: { type: Number, default: DEFAULT_FORECAST_DURATION_SECONDS }
  },
  emits: ['change', 'live-change', 'update:live', 'update:playInterval'],
  data() {
    const now = clock()
    const defaultStart = now.clone().startOf('hour')
    const current = defaultStart.clone()
    return {
      showAdvanced: true,
      startTime: defaultStart.format('YYYY-MM-DD HH:mm:00'),
      resolutionIndex: 0,
      currentTime: current.toDate(),
      expandedDayKey: current.format('YYYY-MM-DD'),
      isPlaying: false,
      isLive: false,
      playTimer: null,
      liveTimer: null,
      liveDelayTimer: null,
      startTimeCustomized: false,
      hoverTip: { show: false, dayKey: '', leftPx: 0, text: '' },
      syncingFromProp: false,
      syncingLiveProp: false,
      suppressStartTimeApply: false,
      startTimeInputTimer: null,
      clockTick: Date.now(),
      liveTimelineDayKey: clock().format('YYYY-MM-DD'),
      clockTimer: null,
      selectedPlayInterval: DEFAULT_PLAY_INTERVAL_MS
    }
  },
  computed: {
    labels() {
      return {
        collapseAdvanced: this.$t('widget.timePlayer.collapseAdvanced'),
        expandAdvanced: this.$t('widget.timePlayer.expandAdvanced'),
        pickDate: this.$t('widget.timePlayer.pickDate'),
        pickStartTip: this.$t('widget.timePlayer.pickStartTip'),
        scaleTip: this.$t('widget.timePlayer.scaleTip'),
        playIntervalTip: this.$t('widget.timePlayer.playIntervalTip'),
        now: this.$t('widget.timePlayer.now'),
        first: this.$t('widget.timePlayer.first'),
        prev: this.$t('widget.timePlayer.prev'),
        pause: this.$t('widget.timePlayer.pause'),
        play: this.$t('widget.timePlayer.play'),
        next: this.$t('widget.timePlayer.next'),
        last: this.$t('widget.timePlayer.last'),
        yesterday: this.$t('widget.timePlayer.yesterday'),
        today: this.$t('widget.timePlayer.today'),
        tomorrow: this.$t('widget.timePlayer.tomorrow')
      }
    },
    weekLabels() {
      return [0, 1, 2, 3, 4, 5, 6].map((day) => this.$t(`widget.timePlayer.week.${day}`))
    },
    dateDisplayFormat() {
      return this.$t('widget.timePlayer.dateFormat')
    },
    themeStyle() {
      return buildTimePlayerThemeVars(this.theme)
    },
    resolvedResolutionOptions() {
      return normalizeResolutionOptions(this.resolutionOptions)
    },
    resolution() {
      const opts = this.resolvedResolutionOptions
      return opts[this.resolutionIndex] || opts[0]
    },
    resolutionLabel() {
      return this.resolution.label
    },
    resolvedPlayIntervalOptions() {
      return normalizePlayIntervalOptions(this.playIntervalOptions)
    },
    playIntervalLabel() {
      const opt = this.resolvedPlayIntervalOptions.find((item) => item.value === this.selectedPlayInterval)
      return opt ? opt.label : `${this.selectedPlayInterval / 1000}s`
    },
    stepSeconds() {
      return this.resolution.seconds
    },
    wallClockNow() {
      void this.clockTick
      return clock().subtract(this.liveDelaySeconds, 'seconds')
    },
    forecastEndMoment() {
      if (this.forecastDurationSeconds <= 0) return null
      return alignToStep(this.wallClockNow.clone().add(this.forecastDurationSeconds, 'seconds'), this.stepSeconds)
    },
    showForecastEndMarker() {
      const forecast = this.forecastEndMoment
      if (!forecast) return false
      return forecast.isSameOrAfter(this.rangeStart) && forecast.isSameOrBefore(this.rangeEnd)
    },
    maxSelectableTime() {
      void this.clockTick
      if (this.forecastDurationSeconds > 0 && this.forecastEndMoment) return this.forecastEndMoment.clone()
      return alignToStep(this.wallClockNow, this.stepSeconds)
    },
    effectiveRangeEnd() {
      const max = this.maxSelectableTime
      const end = this.rangeEnd
      return max.isBefore(end) ? max : end.clone()
    },
    timelineRange() {
      if (this.startTimeCustomized) {
        const start = clock(this.startTime).startOf('day')
        let end = start.clone().add(this.forecastSpanDays, 'days').endOf('day')
        if (this.forecastDurationSeconds > 0 && this.forecastEndMoment && this.forecastEndMoment.isAfter(end)) {
          end = this.forecastEndMoment.clone().endOf('day')
        }
        return { start, end }
      }
      void this.liveTimelineDayKey
      const today = clock().startOf('day')
      let end = today.clone().add(this.liveDaysAfter, 'days').endOf('day')
      if (this.forecastDurationSeconds > 0 && this.forecastEndMoment && this.forecastEndMoment.isAfter(end)) {
        end = this.forecastEndMoment.clone().endOf('day')
      }
      return { start: today.clone().subtract(this.liveDaysBefore, 'day'), end }
    },
    timelineDays() {
      const days = []
      const cursor = this.timelineRange.start.clone().startOf('day')
      const last = this.timelineRange.end.clone().startOf('day')
      const today = clock().startOf('day')
      const yesterday = today.clone().subtract(1, 'day')
      const tomorrow = today.clone().add(1, 'day')
      while (cursor.isSameOrBefore(last)) {
        let weekLabel = this.weekLabels[cursor.day()]
        if (cursor.isSame(yesterday, 'day')) weekLabel = this.labels.yesterday
        else if (cursor.isSame(today, 'day')) weekLabel = this.labels.today
        else if (cursor.isSame(tomorrow, 'day')) weekLabel = this.labels.tomorrow
        days.push({
          key: cursor.format('YYYY-MM-DD'),
          moment: cursor.clone(),
          weekLabel,
          dateLabel: cursor.format('MM/DD')
        })
        cursor.add(1, 'day')
      }
      return days
    },
    rangeStart() {
      return this.timelineRange.start
    },
    rangeEnd() {
      return this.timelineRange.end
    },
    expandedFlex() {
      const total = this.timelineDays.length
      if (!total) return 1
      return Math.max(3, total - 1)
    },
    hourTicks() {
      const ticks = []
      for (let min = 0; min < 24 * 60; min += 180) {
        ticks.push({
          label: `${String(Math.floor(min / 60)).padStart(2, '0')}:00`,
          left: (min / (24 * 60)) * 100
        })
      }
      return ticks
    }
  },
  watch: {
    live(val) {
      if (this.syncingLiveProp || val === this.isLive) return
      if (val) this.enterLiveMode(true, { emitLive: false })
      else this.leaveLiveMode(false)
    },
    timelineDays(days) {
      if (!days.length) return
      const keys = days.map((day) => day.key)
      if (!keys.includes(this.expandedDayKey)) this.expandedDayKey = keys[keys.length - 1]
    },
    stepSeconds() {
      if (!this.isLive) return
      this.$nextTick(() => {
        this.applyLiveTime(true)
        this.startLiveTimer()
      })
    },
    liveDelaySeconds() {
      if (!this.isLive) return
      this.$nextTick(() => {
        this.applyLiveTime(true)
        this.startLiveTimer()
      })
    },
    playInterval(val) {
      this.selectedPlayInterval = findPlayIntervalValue(this.playIntervalOptions, val)
    },
    selectedPlayInterval() {
      if (this.isPlaying) this.startPlay()
    },
    maxSelectableTime(max, prev) {
      if (!max || !prev || this.isLive) return
      if (clock(this.currentTime).isAfter(max)) this.setCurrentTime(max.toDate(), { emit: false })
    }
  },
  created() {
    this.resolutionIndex = findResolutionIndex(this.resolutionOptions, this.defaultResolution)
    this.selectedPlayInterval = findPlayIntervalValue(this.playIntervalOptions, this.playInterval)
  },
  mounted() {
    this.startClockTimer()
    this.$nextTick(() => {
      if (this.live) this.enterLiveMode(true, { emitLive: false })
      else {
        this.emitChange()
        this.emitLiveChange()
      }
    })
  },
  beforeUnmount() {
    this.stopPlay()
    this.stopLiveTimer()
    this.stopClockTimer()
    if (this.startTimeInputTimer) clearTimeout(this.startTimeInputTimer)
  },
  methods: {
    disabledStartDate(date) {
      return clock(date).startOf('day').isAfter(this.maxSelectableTime.clone().startOf('day'))
    },
    toggleAdvanced() {
      this.showAdvanced = !this.showAdvanced
    },
    togglePlay() {
      if (this.isPlaying) this.stopPlay()
      else {
        this.exitLiveMode()
        this.startPlay()
      }
    },
    startPlay() {
      this.stopPlay()
      this.isPlaying = true
      this.playTimer = setInterval(() => {
        const next = clock(this.currentTime).add(this.stepSeconds, 'seconds')
        if (next.isAfter(this.effectiveRangeEnd)) {
          this.stopPlay()
          return
        }
        this.setCurrentTime(next.toDate(), { emit: true })
      }, this.selectedPlayInterval)
    },
    handlePlayIntervalChange(value) {
      this.selectedPlayInterval = findPlayIntervalValue(this.playIntervalOptions, value)
      this.$emit('update:playInterval', this.selectedPlayInterval)
    },
    stopPlay() {
      this.isPlaying = false
      if (this.playTimer) {
        clearInterval(this.playTimer)
        this.playTimer = null
      }
    },
    stopLiveTimer() {
      if (this.liveDelayTimer) clearTimeout(this.liveDelayTimer)
      if (this.liveTimer) clearInterval(this.liveTimer)
      this.liveDelayTimer = null
      this.liveTimer = null
    },
    startClockTimer() {
      this.stopClockTimer()
      this.clockTick = Date.now()
      this.syncLiveTimelineDayKey()
      this.clockTimer = setInterval(() => {
        this.clockTick = Date.now()
        this.syncLiveTimelineDayKey()
      }, 1000)
    },
    syncLiveTimelineDayKey() {
      if (this.startTimeCustomized) return
      const dayKey = clock().format('YYYY-MM-DD')
      if (dayKey !== this.liveTimelineDayKey) this.liveTimelineDayKey = dayKey
    },
    stopClockTimer() {
      if (this.clockTimer) clearInterval(this.clockTimer)
      this.clockTimer = null
    },
    getLiveRefreshIntervalMs() {
      return this.liveUpdateInterval > 0 ? this.liveUpdateInterval : this.stepSeconds * 1000
    },
    emitLiveChange() {
      this.syncingLiveProp = true
      this.$emit('update:live', this.isLive)
      this.$emit('live-change', this.isLive)
      this.$nextTick(() => {
        this.syncingLiveProp = false
      })
    },
    enterLiveMode(emitTime = true, options = {}) {
      const emitLive = options.emitLive !== false
      this.isLive = true
      this.stopPlay()
      this.startTimeCustomized = false
      this.syncLiveTimelineDayKey()
      this.applyLiveTime(emitTime)
      this.startLiveTimer()
      if (emitLive) this.emitLiveChange()
    },
    leaveLiveMode(emitLive = true) {
      if (!this.isLive) return
      this.isLive = false
      this.stopLiveTimer()
      if (emitLive) this.emitLiveChange()
    },
    exitLiveMode() {
      this.leaveLiveMode(true)
    },
    getLiveAlignedTime() {
      return alignToStep(clock().subtract(this.liveDelaySeconds, 'seconds'), this.stepSeconds)
    },
    applyLiveTime(emit = false) {
      const aligned = this.getLiveAlignedTime()
      this.suppressStartTimeApply = true
      this.startTime = aligned.format('YYYY-MM-DD HH:mm:00')
      this.$nextTick(() => {
        this.suppressStartTimeApply = false
      })
      this.setCurrentTime(aligned.toDate(), { emit })
    },
    startLiveTimer() {
      this.stopLiveTimer()
      if (!this.isLive) return
      const stepMs = this.getLiveRefreshIntervalMs()
      if (stepMs <= 0) return
      const skewMs = 800
      let delay = stepMs - (Date.now() % stepMs) + skewMs
      if (delay < skewMs + 300) delay += stepMs
      this.liveDelayTimer = setTimeout(() => {
        if (!this.isLive) return
        this.applyLiveTime(true)
        this.liveTimer = setInterval(() => {
          if (!this.isLive) return
          this.applyLiveTime(true)
        }, stepMs)
      }, delay)
    },
    changeResolution(delta) {
      const next = this.resolutionIndex + delta
      if (next < 0 || next >= this.resolvedResolutionOptions.length) return
      this.resolutionIndex = next
      if (this.isLive) {
        this.applyLiveTime(true)
        return
      }
      this.setCurrentTime(alignToStep(this.currentTime, this.stepSeconds).toDate(), { emit: true })
    },
    isStartTimeNearNow(value) {
      const parsed = parseStrict(value, ['YYYY-MM-DD HH:mm:00', 'YYYY-MM-DD HH:mm:ss'])
      return parsed.isValid() && Math.abs(parsed.diff(clock(), 'seconds')) < 120
    },
    applyStartTimeFromPicker(value, options = {}) {
      const parsed = parseStrict(value != null ? value : this.startTime, ['YYYY-MM-DD HH:mm:00', 'YYYY-MM-DD HH:mm:ss'])
      if (!parsed.isValid()) return
      const formatted = parsed.clone().format('YYYY-MM-DD HH:mm:00')
      const aligned = alignToStep(parsed, this.stepSeconds)
      const startChanged = formatted !== this.startTime
      const shouldApply = options.force || this.isLive || !this.startTimeCustomized || startChanged || aligned.format('YYYY-MM-DD HH:mm:ss') !== clock(this.currentTime).format('YYYY-MM-DD HH:mm:ss')
      if (!shouldApply) return
      this.exitLiveMode()
      this.startTimeCustomized = true
      this.startTime = formatted
      this.stopPlay()
      this.$nextTick(() => {
        const clamped = clampTime(aligned, this.rangeStart, this.effectiveRangeEnd)
        this.setCurrentTime(clamped.toDate(), { emit: true })
        this.expandedDayKey = clamped.format('YYYY-MM-DD')
      })
    },
    handleStartTimeChange(value) {
      if (this.startTimeInputTimer) clearTimeout(this.startTimeInputTimer)
      this.applyStartTimeFromPicker(value, { force: this.isStartTimeNearNow(value) })
    },
    goLive() {
      this.enterLiveMode(true)
    },
    goFirst() {
      this.exitLiveMode()
      this.stopPlay()
      const start = this.startTimeCustomized ? clock(this.startTime) : this.rangeStart.clone()
      this.setCurrentTime(alignToStep(start, this.stepSeconds).toDate(), { emit: true })
    },
    goLast() {
      this.exitLiveMode()
      this.stopPlay()
      this.setCurrentTime(alignToStep(this.effectiveRangeEnd, this.stepSeconds).toDate(), { emit: true })
    },
    stepPrev() {
      this.exitLiveMode()
      this.stopPlay()
      const prev = clock(this.currentTime).subtract(this.stepSeconds, 'seconds')
      this.setCurrentTime(clampTime(prev, this.rangeStart, this.effectiveRangeEnd).toDate(), { emit: true })
    },
    stepNext() {
      this.exitLiveMode()
      this.stopPlay()
      const next = clock(this.currentTime).add(this.stepSeconds, 'seconds')
      this.setCurrentTime(clampTime(next, this.rangeStart, this.effectiveRangeEnd).toDate(), { emit: true })
    },
    getDayItemStyle(day) {
      if (!this.expandedDayKey) return { flex: '1 1 0' }
      if (day.key === this.expandedDayKey) return { flex: `${this.expandedFlex} 1 0` }
      return { flex: '0.6 1 0', minWidth: '28px' }
    },
    getDayProgress(day) {
      const current = clock(this.currentTime)
      if (!current.isSame(day.moment, 'day')) return current.isAfter(day.moment) ? 100 : 0
      const totalSec = current.hours() * 3600 + current.minutes() * 60 + current.seconds()
      return (totalSec / (24 * 3600)) * 100
    },
    getDayMarkerProgress(day, timeValue) {
      if (!timeValue) return null
      const marker = clock(timeValue)
      if (!marker.isSame(day.moment, 'day')) return null
      const totalSec = marker.hours() * 3600 + marker.minutes() * 60 + marker.seconds()
      return (totalSec / (24 * 3600)) * 100
    },
    onDayLineClick(day, event) {
      this.exitLiveMode()
      this.stopPlay()
      const isNewDay = this.expandedDayKey !== day.key
      this.expandedDayKey = day.key
      const time = isNewDay ? day.moment.clone().startOf('day') : this.pickTimeFromEvent(day, event)
      this.setCurrentTime(time.toDate(), { emit: true })
    },
    onDayLineHover(day, event) {
      if (this.expandedDayKey !== day.key) {
        this.hideHoverTip()
        return
      }
      const rect = event.currentTarget.getBoundingClientRect()
      this.hoverTip = {
        show: true,
        dayKey: day.key,
        leftPx: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
        text: this.formatHoverTime(this.pickTimeFromEvent(day, event))
      }
    },
    hideHoverTip() {
      this.hoverTip.show = false
    },
    pickTimeFromEvent(day, event) {
      const rect = event.currentTarget.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      const aligned = Math.floor((Math.floor(ratio * 24 * 3600)) / this.stepSeconds) * this.stepSeconds
      return clampTime(day.moment.clone().startOf('day').add(aligned, 'seconds'), this.rangeStart, this.effectiveRangeEnd)
    },
    setCurrentTime(time, options = {}) {
      const clamped = clampTime(alignToStep(time, this.stepSeconds), this.rangeStart, this.effectiveRangeEnd)
      this.currentTime = clamped.toDate()
      this.expandedDayKey = clamped.format('YYYY-MM-DD')
      if (options.emit && !this.syncingFromProp) this.emitChange()
    },
    emitChange() {
      this.$emit('change', clock(this.currentTime).format('YYYY-MM-DD HH:mm:ss'))
    },
    formatDateTime(time) {
      const pattern = this.stepSeconds < 60 ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm'
      return clock(time).format(pattern)
    },
    formatHoverTime(time) {
      return clock(time).format(this.stepSeconds < 60 ? 'HH:mm:ss' : 'HH:mm')
    }
  }
}
</script>

<style lang="scss" scoped>
.time-player-slider {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 64px;
  padding: 8px 10px 16px;
  box-sizing: border-box;
  background: var(--tps-panel-bg);
  border: 1px solid var(--tps-panel-border);
  border-radius: 5px;
  color: var(--tps-text-primary);
  gap: 6px;
}
.more-setting {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 26px;
  cursor: pointer;
}
.toggle-icon {
  color: var(--tps-accent-soft);
  font-size: 18px;
  line-height: 1;
  transition: transform 0.2s;
}
.toggle-icon.expanded {
  transform: rotate(90deg);
}
.advanced-setup {
  display: none;
  align-items: center;
  gap: 10px;
  padding-right: 10px;
  border-right: 1px solid var(--tps-accent-divider);
}
.advanced-setup.showMoreSetting {
  display: flex;
}
.start-time-choose :deep(.el-date-editor.el-input) {
  width: 210px;
}
.start-time-choose :deep(.el-input__wrapper) {
  background: var(--tps-input-bg);
  box-shadow: 0 0 0 1px var(--tps-accent-border) inset;
  border-radius: 16px;
}
.start-time-choose :deep(.el-input__inner) {
  color: var(--tps-input-text);
}
.scale,
.play-interval-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 44px;
  color: var(--tps-control-text);
  font-size: 12px;
}
.scale-btn,
.play-interval-mark,
.play-interval-arrow {
  color: var(--tps-accent-soft);
  cursor: pointer;
  line-height: 1;
}
.play-interval-trigger {
  cursor: pointer;
}
.player-content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.now {
  padding: 2px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--tps-text-secondary);
  font-size: 12px;
  cursor: pointer;
}
.now.active,
.now:hover,
.is-live .now {
  color: var(--tps-accent);
  border-color: var(--tps-accent-border-strong);
  background: var(--tps-accent-bg-soft);
}
.controls-center {
  display: flex;
  align-items: center;
  gap: 6px;
}
.play-icon,
.play-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--tps-control-text);
  border: 1px solid var(--tps-accent-border);
  background: var(--tps-control-bg);
  cursor: pointer;
}
.play-icon {
  width: 22px;
  height: 22px;
}
.play-toggle {
  width: 26px;
  height: 26px;
}
.play-icon-svg {
  width: 58%;
  height: 58%;
}
.time {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 2px;
  height: 38px;
}
.time-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.time-item-inner.is-expanded {
  display: flex;
  flex-direction: row;
  gap: 6px;
}
.day-label-left,
.day-label-bottom {
  font-size: 10px;
  line-height: 1.25;
  white-space: nowrap;
}
.day-label-left {
  color: var(--tps-accent);
}
.day-label-bottom {
  margin-top: 2px;
  text-align: center;
  color: var(--tps-text-label);
  overflow: hidden;
  text-overflow: ellipsis;
}
.time-line-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}
.time-line {
  position: relative;
  height: 6px;
  margin-top: 2px;
  background: var(--tps-track-bg);
  border-radius: 2px;
  cursor: pointer;
}
.time-item.active .time-line {
  height: 14px;
  background: var(--tps-track-active-bg);
}
.flag {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--tps-progress-start), var(--tps-progress-end));
  border-radius: inherit;
  pointer-events: none;
}
.marker-line {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  transform: translateX(-50%);
  pointer-events: none;
}
.marker-line--now {
  background: var(--tps-marker-now);
  box-shadow: var(--tps-marker-now-shadow);
}
.marker-line--forecast {
  background: var(--tps-marker-forecast);
}
.datetime {
  position: absolute;
  top: 0;
  transform: translate(-50%, calc(-100% - 4px));
  height: 18px;
  padding: 0 6px;
  font-size: 10px;
  line-height: 18px;
  color: var(--tps-tooltip-text);
  background: var(--tps-tooltip-bg);
  border: 1px solid var(--tps-accent-border-strong);
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
}
.time-hour {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 12px;
}
.time-hour-tick,
.hourtime {
  position: absolute;
  transform: translateX(-50%);
  font-size: 10px;
  color: var(--tps-text-muted);
  white-space: nowrap;
}
.hourtime {
  top: 10px;
  color: var(--tps-accent);
}
</style>

<style lang="scss">
.time-player-interval-popper {
  background: rgba(0, 0, 0, 0.92);
  border: 1px solid rgba(48, 160, 164, 0.65);
}
.time-player-interval-popper .el-dropdown-menu__item {
  color: #ffffff;
}
.time-player-interval-popper .el-dropdown-menu__item.is-selected,
.time-player-interval-popper .el-dropdown-menu__item:hover {
  color: #29dbc9;
  background: rgba(41, 219, 201, 0.12);
}
</style>
