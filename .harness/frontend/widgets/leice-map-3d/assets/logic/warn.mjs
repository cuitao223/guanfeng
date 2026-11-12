export const WARN_COLORS = ["#ffbb00", "#ff5100", "#ff0000"];

export const WARN_THRESHOLDS = {
  horizontal: { min: 0.01, medium: 0.02, max: 0.03, unit: "1/s" },
  vertical: { min: 0.04, medium: 0.06, max: 0.08, unit: "1/s" },
  gale: { min: 3.8, medium: 3.9, max: 4.0, unit: "m/s" },
};

export function resolveThreshold(type, override) {
  const fallback = WARN_THRESHOLDS[type] || WARN_THRESHOLDS.gale;
  const source = override || {};
  const min = Number(source.min);
  const medium = Number(source.medium);
  const max = Number(source.max);
  return {
    min: Number.isFinite(min) ? min : fallback.min,
    medium: Number.isFinite(medium) ? medium : fallback.medium,
    max: Number.isFinite(max) ? max : fallback.max,
    unit: source.unit || fallback.unit,
  };
}

export function warnSeverity(value, threshold) {
  const n = Number(value);
  if (value === 9999 || !Number.isFinite(n)) return -1;
  if (n < threshold.min) return -1;
  if (n < threshold.medium) return 0;
  if (n < threshold.max) return 1;
  return 2;
}

export function warnTexel(severity) {
  if (severity < 0) return [0, 0, 0, 0];
  return [(severity + 1) * 64, 0, 0, 255];
}

const WARN_LEVEL_KEYS = ["light", "medium", "severe"];

export function warnLevelKey(severity) {
  return WARN_LEVEL_KEYS[severity] || "";
}

export function formatWarnValue(value, type) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(type === "gale" ? 2 : 4);
}

export function warnBoundaryEdges(severity, nx, ny) {
  const edges = [];
  const seen = new Set();
  const at = (row, col) => {
    if (row < 0 || col < 0 || row >= ny || col >= nx) return -1;
    return severity[row * nx + col];
  };
  const add = (x1, y1, x2, y2) => {
    const left = `${x1},${y1}`;
    const right = `${x2},${y2}`;
    const key = left < right ? `${left}|${right}` : `${right}|${left}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push([x1, y1, x2, y2]);
  };
  for (let row = 0; row < ny; row += 1) {
    for (let col = 0; col < nx; col += 1) {
      const level = at(row, col);
      if (level < 0) continue;
      if (at(row - 1, col) !== level) add(col, row, col + 1, row);
      if (at(row, col - 1) !== level) add(col, row, col, row + 1);
      if (at(row, col + 1) !== level) add(col + 1, row, col + 1, row + 1);
      if (at(row + 1, col) !== level) add(col, row + 1, col + 1, row + 1);
    }
  }
  return edges;
}

export function warnZoomLevel(zoom) {
  if (zoom < 12) return 0;
  if (zoom < 13.5) return 1;
  if (zoom < 15) return 2;
  return 3;
}

export function warnClusterSize(level) {
  return { 0: 30, 1: 20, 2: 10, 3: 0 }[level] ?? 10;
}
