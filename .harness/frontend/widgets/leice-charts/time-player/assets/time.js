function pad(value) {
  return String(value).padStart(2, '0')
}

function asDate(input) {
  if (input instanceof Date) return new Date(input.getTime())
  if (input && typeof input.toDate === 'function') return input.toDate()
  if (typeof input === 'number') return new Date(input)
  if (typeof input === 'string') {
    const matched = input.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
    )
    if (matched) {
      return new Date(
        Number(matched[1]),
        Number(matched[2]) - 1,
        Number(matched[3]),
        Number(matched[4] || 0),
        Number(matched[5] || 0),
        Number(matched[6] || 0)
      )
    }
  }
  return new Date(input)
}

function shift(date, amount, unit) {
  if (unit === 'second' || unit === 'seconds') date.setSeconds(date.getSeconds() + amount)
  else if (unit === 'minute' || unit === 'minutes') date.setMinutes(date.getMinutes() + amount)
  else if (unit === 'hour' || unit === 'hours') date.setHours(date.getHours() + amount)
  else if (unit === 'day' || unit === 'days') date.setDate(date.getDate() + amount)
}

function formatDate(date, pattern) {
  return pattern
    .replace('YYYY', String(date.getFullYear()))
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()))
}

export function clock(input) {
  const date = asDate(input == null ? new Date() : input)
  const api = {
    clone() {
      return clock(date)
    },
    toDate() {
      return new Date(date.getTime())
    },
    valueOf() {
      return date.getTime()
    },
    isValid() {
      return !Number.isNaN(date.getTime())
    },
    startOf(unit) {
      if (unit === 'day') date.setHours(0, 0, 0, 0)
      else if (unit === 'hour') date.setMinutes(0, 0, 0)
      return api
    },
    endOf(unit) {
      if (unit === 'day') date.setHours(23, 59, 59, 999)
      return api
    },
    add(amount, unit) {
      shift(date, amount, unit)
      return api
    },
    subtract(amount, unit) {
      shift(date, -amount, unit)
      return api
    },
    diff(other, unit) {
      const delta = date.getTime() - asDate(other).getTime()
      if (unit === 'seconds' || unit === 'second') return Math.round(delta / 1000)
      return delta
    },
    isBefore(other) {
      return date.getTime() < asDate(other).getTime()
    },
    isAfter(other) {
      return date.getTime() > asDate(other).getTime()
    },
    isSame(other, unit) {
      const right = clock(other)
      if (unit === 'day') return api.format('YYYY-MM-DD') === right.format('YYYY-MM-DD')
      return date.getTime() === right.valueOf()
    },
    isSameOrBefore(other) {
      return date.getTime() <= asDate(other).getTime()
    },
    isSameOrAfter(other) {
      return date.getTime() >= asDate(other).getTime()
    },
    format(pattern) {
      return formatDate(date, pattern)
    },
    day() {
      return date.getDay()
    },
    hours() {
      return date.getHours()
    },
    minutes() {
      return date.getMinutes()
    },
    seconds() {
      return date.getSeconds()
    }
  }
  return api
}

export function parseStrict(value, formats) {
  const text = String(value == null ? '' : value)
  const patterns = {
    'YYYY-MM-DD HH:mm:ss': /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
    'YYYY-MM-DD HH:mm:00': /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):00$/,
    'YYYY-MM-DD HH:mm': /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/
  }
  for (let i = 0; i < formats.length; i += 1) {
    const pattern = patterns[formats[i]]
    if (pattern && pattern.test(text)) return clock(text)
  }
  return clock(new Date(NaN))
}
