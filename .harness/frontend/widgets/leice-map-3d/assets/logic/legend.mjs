export const WIND_LEGEND_MIN = 0;
export const WIND_LEGEND_MAX = 10;
export const WIND_LEGEND_COLORS = [
  "#0034e1",
  "#0064c8",
  "#009696",
  "#00ff4b",
  "#00ff00",
  "#96e100",
  "#ffdd00",
  "#ffaa00",
  "#ff6200",
  "#c80000",
  "#830707",
];

export const PARTICLE_LEGEND_MIN = 0;
export const PARTICLE_LEGEND_MAX = 4;

export function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function uniformStops(min, max, count) {
  const stops = [];
  const n = Math.max(1, count);
  for (let i = 0; i < n; i += 1) {
    const t = n === 1 ? 0 : i / (n - 1);
    stops.push(Number((min + (max - min) * t).toFixed(1)));
  }
  return stops;
}

export function colorForSpeed(speed, legend, style) {
  const colors = (legend.colors || WIND_LEGEND_COLORS).map(hexToRgb);
  const min = legend.min == null ? WIND_LEGEND_MIN : legend.min;
  const max = legend.max == null ? WIND_LEGEND_MAX : legend.max;
  const custom = legend.domainPoints || [];
  const valid = (custom.length === colors.length || custom.length === colors.length + 1)
    && custom.every((v, i) => Number.isFinite(v) && (i === 0 || v > custom[i - 1]));
  const stops = valid ? (custom.length === colors.length ? custom : custom.slice(0, -1).map((v, i) => (v + custom[i + 1]) / 2)) : uniformStops(min, max, colors.length);
  if (style === "contour") {
    const domain = valid && custom.length === colors.length + 1 ? custom.slice(1, -1) : stops.slice(1);
    let index = 0;
    while (index < domain.length && speed >= domain[index]) index += 1;
    return colors[Math.min(index, colors.length - 1)].slice();
  }
  if (speed <= stops[0]) return colors[0].slice();
  const last = stops.length - 1;
  if (speed >= stops[last]) return colors[last].slice();
  let index = 1;
  while (index < stops.length && stops[index] < speed) index += 1;
  const span = stops[index] - stops[index - 1] || 1;
  const t = (speed - stops[index - 1]) / span;
  return colors[index - 1].map((channel, i) => Math.round(channel + (colors[index][i] - channel) * t));
}
