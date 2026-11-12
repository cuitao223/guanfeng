import ppiRecord from './fixtures/ppi.json'
import rhiRecord from './fixtures/rhi.json'
import thiRecord from './fixtures/thi.json'
import windRecord from './fixtures/wind.json'

const MISSING_HIGH = 999
const MISSING_LOW = -999

function pad(value) {
  return String(value).padStart(2, '0')
}

function fluxCalendarRows(year) {
  const rows = []
  const start = new Date(year, 0, 1)
  for (let cursor = new Date(start); cursor.getFullYear() === year; cursor.setDate(cursor.getDate() + 1)) {
    const doy = Math.round((cursor.getTime() - start.getTime()) / 86400000)
    let vertical = Math.round(Math.sin(doy / 18) * 1800)
    if (doy === 10) vertical = MISSING_HIGH
    if (doy === 11) vertical = MISSING_LOW
    if (doy === 12) vertical = 0
    const month = pad(cursor.getMonth() + 1)
    const day = pad(cursor.getDate())
    rows.push({
      date: `${year}${month}${day}`,
      verticalAvg: vertical,
      eastAvg: Math.round(vertical * 0.4),
      northAvg: Math.round(vertical * -0.3)
    })
  }
  return rows
}

const profileHeights = [0, 1000, 2000, 3000, 4000]
const skewPressure = []
const skewTemp = []
const skewDew = []
for (let pressure = 1000; pressure >= 200; pressure -= 50) {
  skewPressure.push(pressure)
  const temp = Number((22 - (1000 - pressure) * 0.08).toFixed(1))
  skewTemp.push(temp)
  skewDew.push(Number((temp - 8).toFixed(1)))
}
skewTemp[2] = MISSING_HIGH
skewDew[3] = MISSING_LOW

export const lidarTheme = 'dark'

export const profileSample = {
  unit: 'm/s',
  heightArr: profileHeights,
  value: [1.2, 3.4, 0, 5.5, 4.1],
  heightMax: 6000
}

const windData = windRecord.data
const thiData = thiRecord.data

export const barbThiSample = {
  unit: 'm/s',
  times: windData.timeAxis,
  heightArr: windData.heightAxis,
  values: windData.windSpeed,
  dirs: windData.windDir,
  breakpoints: [0, 2, 4, 6, 8, 10, 12, 14, 18],
  colors: ['#d0e6f5', '#74add1', '#abd9e9', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
}

export const thiSample = {
  unit: 'm/s',
  times: thiData.timeAxis,
  heightArr: thiData.heightAxis,
  values: thiData.values,
  windpara: [],
  breakpoints: [-2, -1.6, -1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2, 1.6, 2],
  colors: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#91bfdb', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
}

export const scanSample = {
  unit: 'm/s',
  maxRange: 21600,
  breakpoints: [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10],
  colors: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#91bfdb', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
  ppi: ppiRecord,
  rhi: rhiRecord
}

export const profileCompareSample = {
  unit: 'm/s',
  heightMax: 4000,
  series: [
    { key: 'a', name: 'A', color: '#4EA8FF', heightArr: [0, 1000, 2000, 3000], value: [1.2, 0, 3.4, 2.2] },
    { key: 'b', name: 'B', color: '#F1414D', heightArr: [0, 1000, 2000, 3000], value: [2, 2.5, 1.1, 4] }
  ]
}

export const barbProfileSample = {
  heightArr: profileHeights,
  value: [2, 0, 8, 22, 4],
  dirArr: [0, 90, 180, 270, 45],
  heightMax: 5000
}

function peakWindHeights(heightAxis, speeds) {
  return speeds.map((column) => {
    let bestSpeed = Number.NEGATIVE_INFINITY
    let bestHeight = MISSING_HIGH
    for (let index = 0; index < heightAxis.length; index += 1) {
      const speed = Number(column[index])
      if (!Number.isFinite(speed) || speed === MISSING_HIGH || speed <= MISSING_LOW) continue
      if (speed > bestSpeed) {
        bestSpeed = speed
        bestHeight = heightAxis[index]
      }
    }
    return bestHeight
  })
}

const sequenceHeights = windData.heightAxis
const sequenceTimes = windData.timeAxis

export const thiSequenceSample = {
  timeStart: sequenceTimes[0],
  timeEnd: sequenceTimes[sequenceTimes.length - 1],
  heightMax: sequenceHeights[sequenceHeights.length - 1],
  windDensity: 6,
  windBarbScale: 0.7,
  layers: [
    {
      key: 'verticalWind',
      drawType: 'fill',
      unit: 'm/s',
      color: '#4EA8FF',
      opacity: 1,
      breakpoints: [-2, -1.6, -1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2, 1.6, 2],
      colors: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#91bfdb', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
      colorType: 'threshold',
      timeArr: thiData.timeAxis,
      heightArr: thiData.heightAxis,
      value: thiData.values
    },
    {
      key: 'peakWind',
      drawType: 'line',
      unit: 'm',
      color: '#F5D76E',
      timeArr: sequenceTimes,
      heightArr: peakWindHeights(sequenceHeights, windData.windSpeed)
    },
    {
      key: 'horizontalWind',
      drawType: 'windBarb',
      color: '#FFFFFF',
      density: 6,
      timeArr: sequenceTimes,
      heightArr: sequenceHeights,
      speed: windData.windSpeed,
      dir: windData.windDir
    }
  ]
}

export const hodographSample = [
  { heightKm: 0.5, windSpeed: 4, windDir: 0 },
  { heightKm: 1.2, windSpeed: 0, windDir: 90 },
  { heightKm: 2, windSpeed: 8, windDir: 180 },
  { heightKm: 3, windSpeed: 12, windDir: 270 }
]

export const soundingSample = {
  pressure: [1000, 850, 700, 500, MISSING_HIGH, 0],
  value: [12, 0, 8, MISSING_HIGH, 6, 4],
  windDir: [0, 90, 180, 270, 10, 20],
  height: [100, 1500, 3000, MISSING_LOW, 5000, 6000]
}

export const skewTSample = {
  temperature: { pressure: skewPressure, value: skewTemp },
  dewPoint: { pressure: skewPressure.slice(), value: skewDew },
  stateCurve: { pressure: [1000, 860], temperature: [22] }
}

export const windRoseSample = {
  samples: [[0, 400], [90, MISSING_HIGH], [180, 800], [270, MISSING_LOW], [45, 200]],
  maxValue: 1000,
  heightM: 100
}

export const fluxSample = {
  timeArr: [1719792000, 1719795600, 1719799200, 1719802800, 1719806400, 1719810000, 1719813600, 1719817200],
  values: [80, -40, MISSING_HIGH, 120, -160, 20, MISSING_LOW, 60]
}

export const fluxCalendarSample = {
  rows: fluxCalendarRows(2025),
  years: [2025],
  field: 'verticalAvg',
  mode: 'day',
  unit: 'ug/m2/s'
}
