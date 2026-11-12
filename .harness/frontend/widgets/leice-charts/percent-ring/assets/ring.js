// Segmented arc math for the percentage ring. Colors stay in the Vue file.

export const RING_RADIUS = 38
export const RING_STROKE = 8

const TIER_MAX = [20, 50, 100]

export function clampPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, n))
}

export function displayPercent(value) {
  return Math.round(clampPercent(value))
}

export function tierIndex(percent) {
  const value = clampPercent(percent)
  if (value <= TIER_MAX[0]) return 0
  if (value <= TIER_MAX[1]) return 1
  return 2
}

// remaining: the arc is the complement of the center number (disk used vs free).
// progress: the arc length matches the center number.
export function arcRatio(percent, mode) {
  const value = clampPercent(percent)
  const arc = mode === 'progress' ? value : 100 - value
  return clampPercent(arc) / 100
}

export function hexToRgb(hex) {
  const body = String(hex).replace('#', '')
  const full = body.length === 3 ? body.split('').map((ch) => ch + ch).join('') : body
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function lerpColor(fromHex, toHex, t) {
  const a = hexToRgb(fromHex)
  const b = hexToRgb(toHex)
  const tt = Math.min(1, Math.max(0, t))
  const r = Math.round(a.r + (b.r - a.r) * tt)
  const g = Math.round(a.g + (b.g - a.g) * tt)
  const bl = Math.round(a.b + (b.b - a.b) * tt)
  return `rgb(${r},${g},${bl})`
}

export function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

export function buildArc(ratio, radius) {
  if (ratio <= 0) {
    return { segments: [], startCap: null, endCap: null }
  }
  const cx = 50
  const cy = 50
  const startAngle = -Math.PI / 2
  const steps = Math.max(1, Math.floor(ratio * 100 * 20))
  const segments = []
  for (let i = 0; i < steps; i += 1) {
    const u0 = i / steps
    if (u0 >= ratio) break
    const u1 = Math.min((i + 1) / steps, ratio)
    const a0 = startAngle - 2 * Math.PI * u0
    const a1 = startAngle - 2 * Math.PI * u1
    const x0 = cx + radius * Math.cos(a0)
    const y0 = cy + radius * Math.sin(a0)
    const x1 = cx + radius * Math.cos(a1)
    const y1 = cy + radius * Math.sin(a1)
    segments.push({
      key: `seg-${i}`,
      d: `M ${x0} ${y0} A ${radius} ${radius} 0 0 0 ${x1} ${y1}`,
      t: u1 >= ratio ? 1 : ((u0 + u1) / 2) / ratio
    })
  }
  const capAt = (angle) => ({
    cx: cx + radius * Math.cos(angle),
    cy: cy + radius * Math.sin(angle)
  })
  const closed = ratio >= 0.995
  return {
    segments,
    startCap: closed ? null : capAt(startAngle),
    endCap: closed ? null : capAt(startAngle - 2 * Math.PI * ratio)
  }
}
