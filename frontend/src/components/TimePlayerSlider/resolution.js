export const DEFAULT_RESOLUTION_SECONDS = 60

export const DEFAULT_RESOLUTION_OPTIONS = [
  { seconds: 60, label: '1min' },
  { seconds: 300, label: '5min' },
  { seconds: 1800, label: '30min' }
]

function formatResolutionLabel(seconds) {
  if (seconds < 60) return `${seconds}s`
  if (seconds % 3600 === 0) return `${seconds / 3600}h`
  return `${seconds / 60}min`
}

export function normalizeResolutionOption(option) {
  if (typeof option === 'number') {
    return { seconds: option, label: formatResolutionLabel(option) }
  }
  if (option.seconds != null) {
    return {
      seconds: option.seconds,
      label: option.label || formatResolutionLabel(option.seconds)
    }
  }
  if (option.minutes != null) {
    const seconds = option.minutes * 60
    return {
      seconds,
      label: option.label || formatResolutionLabel(seconds)
    }
  }
  return {
    seconds: DEFAULT_RESOLUTION_SECONDS,
    label: formatResolutionLabel(DEFAULT_RESOLUTION_SECONDS)
  }
}

export function normalizeResolutionOptions(options) {
  const list = (options && options.length ? options : DEFAULT_RESOLUTION_OPTIONS)
    .map(normalizeResolutionOption)
    .filter((item) => item.seconds > 0)
  list.sort((a, b) => a.seconds - b.seconds)
  return list.length ? list : DEFAULT_RESOLUTION_OPTIONS.map(normalizeResolutionOption)
}

export function findResolutionIndex(options, defaultSeconds) {
  const normalized = normalizeResolutionOptions(options)
  const target = Number(defaultSeconds)
  const idx = normalized.findIndex((item) => item.seconds === target)
  return idx >= 0 ? idx : 0
}

export const DEFAULT_PLAY_INTERVAL_MS = 1000

export const DEFAULT_PLAY_INTERVAL_OPTIONS = [
  { value: 1000, label: '1s' },
  { value: 3000, label: '3s' },
  { value: 5000, label: '5s' }
]

function formatPlayIntervalLabel(ms) {
  return `${ms / 1000}s`
}

export function normalizePlayIntervalOption(option) {
  if (typeof option === 'number') {
    return { value: option, label: formatPlayIntervalLabel(option) }
  }
  return {
    value: option.value,
    label: option.label || formatPlayIntervalLabel(option.value)
  }
}

export function normalizePlayIntervalOptions(options) {
  const list = (options && options.length ? options : DEFAULT_PLAY_INTERVAL_OPTIONS)
    .map(normalizePlayIntervalOption)
    .filter((item) => item.value > 0)
  list.sort((a, b) => a.value - b.value)
  return list.length ? list : DEFAULT_PLAY_INTERVAL_OPTIONS.map(normalizePlayIntervalOption)
}

export function findPlayIntervalValue(options, defaultMs) {
  const normalized = normalizePlayIntervalOptions(options)
  const target = Number(defaultMs)
  const match = normalized.find((item) => item.value === target)
  return match ? match.value : normalized[0].value
}

export const DEFAULT_LIVE_DELAY_SECONDS = 0
export const DEFAULT_FORECAST_DURATION_SECONDS = 0
