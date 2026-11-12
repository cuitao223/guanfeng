// Geometry helpers for SVG charts. Screen pixels follow the 1920 design draft.

export function designPx(px) {
  const width = document.documentElement.clientWidth || 1920
  return (px * width) / 1920
}

export function isMissing(value) {
  if (value == null || value === '') return true
  const number = Number(value)
  if (!Number.isFinite(number)) return true
  if (number === 999 || number <= -999) return true
  return false
}

export function finiteOrNull(value) {
  return isMissing(value) ? null : Number(value)
}

export function formatNumber(value, digits) {
  if (value == null || !Number.isFinite(Number(value))) return ''
  const places = digits == null ? 1 : digits
  const rounded = Number(Number(value).toFixed(places))
  return String(rounded)
}

export function formatTick(value) {
  if (!Number.isFinite(value)) return ''
  const abs = Math.abs(value)
  if (abs >= 100 || Number.isInteger(value)) return String(Math.round(value))
  if (abs >= 10) return String(Math.round(value * 10) / 10)
  return String(Math.round(value * 100) / 100)
}

function niceStep(span, count) {
  const raw = span / Math.max(1, count)
  if (!Number.isFinite(raw) || raw <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(raw))
  const err = raw / pow
  const step = err >= 7 ? 10 : err >= 3 ? 5 : err >= 1.5 ? 2 : 1
  return step * pow
}

export function niceDomain(values, tickCount) {
  const count = tickCount || 4
  const nums = (values || []).filter((value) => Number.isFinite(value))
  if (!nums.length) {
    return { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] }
  }
  let min = Math.min(...nums)
  let max = Math.max(...nums)
  if (min === max) {
    const pad = Math.abs(min) * 0.2 || 1
    min -= pad
    max += pad
  }
  const step = niceStep(max - min, count)
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step
  const ticks = []
  const guard = count + 6
  for (let value = niceMin, i = 0; value <= niceMax + step * 0.01 && i < guard; value += step, i += 1) {
    ticks.push(Number(value.toFixed(6)))
  }
  return { min: niceMin, max: ticks[ticks.length - 1], ticks }
}

function tickIndexes(count, maxTicks) {
  if (count <= 0) return []
  if (count <= maxTicks) return Array.from({ length: count }, (_, index) => index)
  const step = Math.ceil((count - 1) / (maxTicks - 1))
  const indexes = []
  for (let index = 0; index < count; index += step) indexes.push(index)
  const last = count - 1
  if (indexes[indexes.length - 1] !== last) indexes.push(last)
  if (indexes.length > 2 && last - indexes[indexes.length - 2] < step / 2) indexes.splice(-2, 1)
  return indexes
}

function layout(width, height, pad) {
  const plot = {
    x: pad.l,
    y: pad.t,
    w: Math.max(10, width - pad.l - pad.r),
    h: Math.max(10, height - pad.t - pad.b)
  }
  return plot
}

function yOf(domain, plot, value) {
  const span = domain.max - domain.min || 1
  return plot.y + plot.h - ((value - domain.min) / span) * plot.h
}

function xOfIndex(plot, count, index) {
  if (count <= 1) return plot.x + plot.w / 2
  return plot.x + (index / (count - 1)) * plot.w
}

export function smoothPath(points) {
  if (!points.length) return ''
  if (points.length < 3) {
    return points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
  }
  let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    path += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return path
}

function segments(indexes, xAt, yAt) {
  const paths = []
  let current = []
  indexes.forEach((value, index) => {
    if (value == null) {
      if (current.length) paths.push(smoothPath(current))
      current = []
      return
    }
    current.push({ x: xAt(index), y: yAt(value) })
  })
  if (current.length) paths.push(smoothPath(current))
  return paths.filter(Boolean)
}

function dots(indexes, xAt, yAt) {
  const points = []
  indexes.forEach((value, index) => {
    if (value == null) return
    points.push({ x: xAt(index), y: yAt(value) })
  })
  return points
}

function axisTicks(domain, plot, anchor) {
  return domain.ticks.map((value) => ({
    value,
    text: formatTick(value),
    y: yOf(domain, plot, value),
    anchor
  }))
}

export function emptyPlot() {
  return {
    empty: true,
    plot: { x: 0, y: 0, w: 0, h: 0 },
    hGrid: [],
    leftTicks: [],
    rightTicks: [],
    xTicks: [],
    paths: [],
    samples: [],
    bars: [],
    font: 12
  }
}

export function buildDualPlot({ width, height, times, leftValues, rightValues }) {
  if (!width || !height) return emptyPlot()
  const count = Math.max(times?.length || 0, leftValues?.length || 0, rightValues?.length || 0)
  const left = []
  const right = []
  const labels = []
  for (let index = 0; index < count; index += 1) {
    left.push(finiteOrNull(leftValues?.[index]))
    right.push(finiteOrNull(rightValues?.[index]))
    labels.push(times?.[index] == null ? '' : String(times[index]))
  }
  const plot = layout(width, height, {
    l: designPx(52),
    r: designPx(52),
    t: designPx(16),
    b: designPx(28)
  })
  const leftDomain = niceDomain(left.filter((value) => value != null))
  const rightDomain = niceDomain(right.filter((value) => value != null))
  const xAt = (index) => xOfIndex(plot, count, index)
  const samples = labels.map((time, index) => ({
    index,
    x: xAt(index),
    time,
    left: left[index],
    right: right[index]
  }))
  return {
    empty: left.every((value) => value == null) && right.every((value) => value == null),
    plot,
    font: designPx(12),
    hGrid: leftDomain.ticks.map((value) => ({ y: yOf(leftDomain, plot, value) })),
    leftTicks: axisTicks(leftDomain, plot, 'end'),
    rightTicks: axisTicks(rightDomain, plot, 'start'),
    xTicks: tickIndexes(count, 6).map((index) => ({ x: xAt(index), text: labels[index] || '' })),
    leftPaths: segments(left, xAt, (value) => yOf(leftDomain, plot, value)),
    rightPaths: segments(right, xAt, (value) => yOf(rightDomain, plot, value)),
    leftDots: dots(left, xAt, (value) => yOf(leftDomain, plot, value)),
    rightDots: dots(right, xAt, (value) => yOf(rightDomain, plot, value)),
    samples
  }
}

export function buildLinePlot({ width, height, times, series }) {
  if (!width || !height) return emptyPlot()
  const count = Math.max(times?.length || 0, ...(series || []).map((item) => item.values?.length || 0), 0)
  const labels = Array.from({ length: count }, (_, index) => (times?.[index] == null ? '' : String(times[index])))
  const parsed = (series || []).map((item) => ({
    key: item.key,
    color: item.color,
    values: Array.from({ length: count }, (_, index) => finiteOrNull(item.values?.[index]))
  }))
  const plot = layout(width, height, {
    l: designPx(48),
    r: designPx(16),
    t: designPx(16),
    b: designPx(28)
  })
  const domain = niceDomain(parsed.flatMap((item) => item.values.filter((value) => value != null).concat([0])))
  const xAt = (index) => xOfIndex(plot, count, index)
  const yAt = (value) => yOf(domain, plot, value)
  return {
    empty: parsed.every((item) => item.values.every((value) => value == null)),
    plot,
    font: designPx(12),
    hGrid: domain.ticks.map((value) => ({ y: yOf(domain, plot, value) })),
    leftTicks: axisTicks(domain, plot, 'end'),
    xTicks: tickIndexes(count, 8).map((index) => ({ x: xAt(index), text: labels[index] || '' })),
    paths: parsed.map((item) => ({
      key: item.key,
      color: item.color,
      d: segments(item.values, xAt, yAt),
      dots: dots(item.values, xAt, yAt)
    })),
    samples: labels.map((time, index) => ({
      index,
      x: xAt(index),
      time,
      values: parsed.map((item) => item.values[index])
    })),
    zeroY: yOf(domain, plot, 0)
  }
}

export function buildBarLinePlot({ width, height, categories, bars, lines }) {
  if (!width || !height) return emptyPlot()
  const count = categories?.length || 0
  const labels = Array.from({ length: count }, (_, index) => (categories?.[index] == null ? '' : String(categories[index])))
  const barSeries = (bars || []).map((item) => ({
    key: item.key,
    color: item.color,
    values: Array.from({ length: count }, (_, index) => finiteOrNull(item.values?.[index]))
  }))
  const lineSeries = (lines || []).map((item) => ({
    key: item.key,
    color: item.color,
    values: Array.from({ length: count }, (_, index) => finiteOrNull(item.values?.[index]))
  }))
  const plot = layout(width, height, {
    l: designPx(48),
    r: designPx(44),
    t: designPx(16),
    b: designPx(28)
  })
  const leftDomain = niceDomain(barSeries.flatMap((item) => item.values.filter((value) => value != null).concat([0])))
  const rightDomain = niceDomain(lineSeries.flatMap((item) => item.values.filter((value) => value != null)))
  const band = count ? plot.w / count : plot.w
  const barCount = Math.max(1, barSeries.length)
  const barWidth = Math.max(2, Math.min(designPx(16), (band * 0.62) / barCount))
  const groupWidth = barWidth * barCount
  const barShapes = []
  barSeries.forEach((item, seriesIndex) => {
    item.values.forEach((value, index) => {
      if (value == null) return
      const center = plot.x + band * index + band / 2
      const x = center - groupWidth / 2 + seriesIndex * barWidth
      const y = yOf(leftDomain, plot, value)
      const zero = yOf(leftDomain, plot, 0)
      barShapes.push({
        key: `${item.key}-${index}`,
        color: item.color,
        x,
        y: Math.min(y, zero),
        w: Math.max(1, barWidth - designPx(2)),
        h: Math.max(1, Math.abs(zero - y))
      })
    })
  })
  const xAt = (index) => plot.x + band * index + band / 2
  return {
    empty: barShapes.length === 0 && lineSeries.every((item) => item.values.every((value) => value == null)),
    plot,
    font: designPx(12),
    hGrid: leftDomain.ticks.map((value) => ({ y: yOf(leftDomain, plot, value) })),
    leftTicks: axisTicks(leftDomain, plot, 'end'),
    rightTicks: axisTicks(rightDomain, plot, 'start'),
    xTicks: tickIndexes(count, 8).map((index) => ({ x: xAt(index), text: labels[index] || '' })),
    bars: barShapes,
    paths: lineSeries.map((item) => ({
      key: item.key,
      color: item.color,
      d: segments(item.values, xAt, (value) => yOf(rightDomain, plot, value)),
      dots: dots(item.values, xAt, (value) => yOf(rightDomain, plot, value))
    })),
    samples: labels.map((time, index) => ({
      index,
      x: xAt(index),
      time,
      bars: barSeries.map((item) => item.values[index]),
      lines: lineSeries.map((item) => item.values[index])
    }))
  }
}

function thinTicks(ticks, span, minGap) {
  if (ticks.length < 3 || span <= 0) return ticks
  if (span / (ticks.length - 1) >= minGap) return ticks
  const keep = Math.max(2, Math.floor(span / minGap))
  const step = Math.ceil((ticks.length - 1) / (keep - 1))
  const picked = []
  for (let index = 0; index < ticks.length; index += step) picked.push(ticks[index])
  const last = ticks[ticks.length - 1]
  if (picked[picked.length - 1] !== last) picked.push(last)
  return picked
}

export function buildHeightPlot({ width, height, values, showLabels, includeZero }) {
  if (!width || !height) return emptyPlot()
  const parsed = (values || []).map((item) => ({
    label: item.label == null ? '' : String(item.label),
    value: finiteOrNull(item.value)
  }))
  const plot = layout(width, height, {
    l: showLabels ? designPx(40) : designPx(12),
    r: designPx(16),
    t: designPx(12),
    b: designPx(24)
  })
  const nums = parsed.map((item) => item.value).filter((value) => value != null)
  const seed = nums.length ? nums.slice() : [0, 1]
  if (includeZero !== false) seed.push(0)
  const domain = niceDomain(seed)
  const count = parsed.length
  const yAt = (index) => {
    if (count <= 1) return plot.y + plot.h / 2
    return plot.y + plot.h - (index / (count - 1)) * plot.h
  }
  const xAt = (value) => {
    const span = domain.max - domain.min || 1
    return plot.x + ((value - domain.min) / span) * plot.w
  }
  const points = []
  parsed.forEach((item, index) => {
    if (item.value == null) return
    points.push({ x: xAt(item.value), y: yAt(index) })
  })
  const max = nums.length ? Math.max(...nums) : null
  return {
    empty: points.length === 0,
    plot,
    font: designPx(12),
    vGrid: domain.ticks.map((value) => ({ x: xAt(value) })),
    xTicks: thinTicks(domain.ticks, plot.w, designPx(36)).map((value) => ({ x: xAt(value), y: plot.y + plot.h + designPx(16), text: formatTick(value) })),
    yTicks: showLabels
      ? parsed.map((item, index) => ({ x: plot.x - designPx(6), y: yAt(index), text: item.label }))
      : [],
    path: points.length ? points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ') : '',
    dots: points,
    maxLine: max == null ? null : xAt(max),
    samples: parsed.map((item, index) => ({
      index,
      y: yAt(index),
      label: item.label,
      value: item.value
    }))
  }
}

export function nearestIndex(x, plot, count) {
  if (count <= 1) return 0
  const ratio = (x - plot.x) / (plot.w || 1)
  let index = Math.round(ratio * (count - 1))
  if (index < 0) index = 0
  if (index > count - 1) index = count - 1
  return index
}
