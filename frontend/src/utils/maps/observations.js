import snapshot from '@/data/metar-observations.json'
export { snapshot }
export function observationTime(value) { return new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) + ' UTC+8' }
const number = value => value === null || !Number.isFinite(value) ? '—' : value.toFixed(1)
function element(tag, text, cls) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e }
export function observationColor(row, mode) {
  const v = mode === 'wind' ? row.windSpeedMs : row.temperatureC
  if (v === null) return '#64748b'
  if (mode === 'wind') return v < 2 ? '#38bdf8' : v < 5 ? '#2dd4bf' : v < 8 ? '#fbbf24' : '#fb7185'
  return v < 0 ? '#818cf8' : v < 10 ? '#38bdf8' : v < 20 ? '#2dd4bf' : v < 30 ? '#fbbf24' : '#fb7185'
}
export function observationMarker(row, mode, t) {
  const node = element('div', undefined, 'weather-observation-marker')
  node.dataset.station = row.id
  node.style.setProperty('--obs-color', observationColor(row, mode))
  node.title = `${row.name} (${row.id}) · ${t('realMap.observationSnapshot')}`
  const value = element('strong', mode === 'wind' ? number(row.windSpeedMs) + ' m/s' : number(row.temperatureC) + ' °C')
  if (mode === 'wind' && row.windDirection !== null && row.windSpeedMs > 0) {
    const arrow = element('span', '↑', 'weather-observation-arrow')
    arrow.style.transform = `rotate(${row.windDirection + 180}deg)`
    value.prepend(arrow)
  }
  node.append(value, element('small', row.name))
  return node
}
export function observationPopup(row, t) {
  const body = element('div', undefined, 'weather-observation-popup')
  body.append(element('strong', `${row.name} / ${row.id}`), element('p', t('realMap.observationSnapshot')))
  const lines = [
    [t('realMap.observedAt'), observationTime(row.observedAt)],
    [t('realMap.temperature'), number(row.temperatureC) + ' °C'],
    [t('realMap.windSpeed'), number(row.windSpeedMs) + ' m/s'],
    [t('realMap.windDirection'), row.windVariable ? t('realMap.variableWind') : row.windSpeedMs === 0 ? t('realMap.calm') : row.windDirection === null ? '—' : row.windDirection + '°'],
    [t('realMap.coordinates'), `${row.longitude}, ${row.latitude} (WGS84)`]
  ]
  lines.forEach(([label, value]) => body.append(element('p', label + ': ' + value)))
  body.append(element('p', 'NOAA Aviation Weather Center / METAR'), element('code', row.rawMetar))
  return body
}
