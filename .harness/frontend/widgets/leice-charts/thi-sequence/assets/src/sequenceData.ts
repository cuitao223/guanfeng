import { isLidarMissingCell } from "./lidarMissing";

const FORMATTED = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;

export type SequenceDrawType = "fill" | "line" | "windBarb";

export interface SequenceLayer {
  key: string;
  drawType: SequenceDrawType;
  name?: string;
  unit?: string;
  color?: string;
  visible?: boolean;
  smooth?: boolean;
  opacity?: number;
  breakpoints?: number[];
  colors?: string[];
  colorType?: "linear" | "threshold";
  timeArr?: unknown[];
  heightArr?: unknown[] | unknown[][];
  value?: unknown[][];
  speed?: unknown[][];
  dir?: unknown[][];
  tempArr?: unknown[];
  heightValueArr?: unknown[][];
  density?: number;
}

export interface LinePoint {
  t: number;
  h: number | null;
}

export interface LineSeries {
  name: string;
  color: string;
  points: LinePoint[];
}

export interface BarbSample {
  timeMs: number;
  height: number;
  speed: number;
  dir: number;
}

export interface TipRow {
  key: string;
  name: string;
  color: string;
  text: string;
}

const ISOTHERM: Record<string, string> = {
  "0": "#F1414D",
  "-20": "#2F9BFF",
  "-30": "#7A93AD",
  "-40": "#9B59B6",
};

/** Numeric values are Unix seconds. Formatted strings are local time, with no Z suffix. Returns milliseconds. */
export function parseTimeMs(value: unknown): number | null {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    return text.length >= 13 ? n : n * 1000;
  }
  const match = FORMATTED.exec(text);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function layerVisible(layer: SequenceLayer): boolean {
  return layer.visible !== false;
}

export function heightsAt(layer: SequenceLayer, timeIndex: number): number[] {
  const source = layer.heightArr;
  if (!Array.isArray(source)) return [];
  const column = Array.isArray(source[0]) ? (source as unknown[][])[timeIndex] || [] : source;
  return column.map((item) => Number(item));
}

export function readCell(layer: SequenceLayer, timeIndex: number, heightIndex: number): number | null {
  const raw = layer.value?.[timeIndex]?.[heightIndex];
  if (isLidarMissingCell(raw)) return null;
  return Number(raw);
}

export function hasFillCell(layer: SequenceLayer): boolean {
  const times = layer.timeArr || [];
  for (let timeIndex = 0; timeIndex < times.length; timeIndex += 1) {
    if (parseTimeMs(times[timeIndex]) == null) continue;
    const heights = heightsAt(layer, timeIndex);
    const column = layer.value?.[timeIndex] || [];
    for (let heightIndex = 0; heightIndex < column.length; heightIndex += 1) {
      if (!Number.isFinite(heights[heightIndex])) continue;
      if (readCell(layer, timeIndex, heightIndex) != null) return true;
    }
  }
  return false;
}

export function lineSeriesOf(layer: SequenceLayer): LineSeries[] {
  const times = (layer.timeArr || []).map(parseTimeMs);
  if (Array.isArray(layer.tempArr) && Array.isArray(layer.heightValueArr)) {
    return layer.tempArr.map((temp, seriesIndex) => {
      const heights = layer.heightValueArr?.[seriesIndex] || [];
      const points: LinePoint[] = times.map((time, index) => {
        const raw = heights[index];
        if (time == null || isLidarMissingCell(raw)) return { t: time ?? Number.NaN, h: null };
        return { t: time, h: Number(raw) };
      });
      const key = String(temp);
      return {
        name: key,
        color: ISOTHERM[key] || layer.color || "#F1414D",
        points,
      };
    });
  }
  const shared = Array.isArray(layer.heightArr) && !Array.isArray(layer.heightArr[0])
    ? layer.heightArr as unknown[]
    : [];
  const points: LinePoint[] = times.map((time, index) => {
    const raw = shared[index];
    if (time == null || isLidarMissingCell(raw)) return { t: time ?? Number.NaN, h: null };
    return { t: time, h: Number(raw) };
  });
  return [{
    name: layer.name || layer.key,
    color: layer.color || "#F1414D",
    points,
  }];
}

export function barbSamples(layer: SequenceLayer, density: number): BarbSample[] {
  const times = (layer.timeArr || []).map(parseTimeMs);
  const stride = Math.max(1, Math.round(Number(density) || 1));
  const samples: BarbSample[] = [];
  for (let timeIndex = 0; timeIndex < times.length; timeIndex += stride) {
    const timeMs = times[timeIndex];
    if (timeMs == null) continue;
    const heights = heightsAt(layer, timeIndex);
    for (let heightIndex = 0; heightIndex < heights.length; heightIndex += stride) {
      const height = heights[heightIndex];
      if (!Number.isFinite(height) || isLidarMissingCell(layer.heightArr && Array.isArray(layer.heightArr[0])
        ? (layer.heightArr as unknown[][])[timeIndex]?.[heightIndex]
        : (layer.heightArr as unknown[] | undefined)?.[heightIndex])) continue;
      const speedRaw = layer.speed?.[timeIndex]?.[heightIndex];
      const dirRaw = layer.dir?.[timeIndex]?.[heightIndex];
      if (isLidarMissingCell(speedRaw) || isLidarMissingCell(dirRaw)) continue;
      samples.push({
        timeMs,
        height,
        speed: Number(speedRaw),
        dir: Number(dirRaw),
      });
    }
  }
  return samples;
}

export function hasDrawableLayer(layer: SequenceLayer, density = 1): boolean {
  if (!layerVisible(layer)) return false;
  if (layer.drawType === "fill") return hasFillCell(layer);
  if (layer.drawType === "windBarb") return barbSamples(layer, layer.density ?? density).length > 0;
  return lineSeriesOf(layer).some((series) => series.points.some((point) => point.h != null));
}

export function sequenceHasData(layers: SequenceLayer[], density = 1): boolean {
  return layers.some((layer) => hasDrawableLayer(layer, density));
}

export function resolveTimeDomain(start: unknown, end: unknown, layers: SequenceLayer[]): [number, number] | null {
  const from = parseTimeMs(start);
  const to = parseTimeMs(end);
  if (from != null && to != null && to > from) return [from, to];
  const stamps: number[] = [];
  for (const layer of layers) {
    if (!layerVisible(layer)) continue;
    for (const item of layer.timeArr || []) {
      const ms = parseTimeMs(item);
      if (ms != null) stamps.push(ms);
    }
  }
  if (!stamps.length) return null;
  const lo = Math.min(...stamps);
  const hi = Math.max(...stamps);
  if (hi > lo) return [lo, hi];
  return [lo, lo + 60 * 1000];
}

export function nearestFiniteIndex(values: Array<number | null>, target: number): number {
  let best = -1;
  let dist = Infinity;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value == null || !Number.isFinite(value)) continue;
    const delta = Math.abs(value - target);
    if (delta < dist) {
      dist = delta;
      best = index;
    }
  }
  return best;
}

function formatNumber(value: number): string {
  if (value === 0) return "0";
  const digits = Math.abs(value) >= 10 ? 1 : 2;
  return value.toFixed(digits);
}

export function tipRows(layers: SequenceLayer[], timeMs: number, height: number): TipRow[] {
  const rows: TipRow[] = [];
  for (const layer of layers) {
    if (!layerVisible(layer)) continue;
    const times = (layer.timeArr || []).map(parseTimeMs);
    const timeIndex = nearestFiniteIndex(times, timeMs);
    if (timeIndex < 0) continue;
    if (layer.drawType === "fill") {
      const heights = heightsAt(layer, timeIndex);
      const heightIndex = nearestFiniteIndex(heights, height);
      if (heightIndex < 0) continue;
      const value = readCell(layer, timeIndex, heightIndex);
      if (value == null) continue;
      const unit = layer.unit ? ` ${layer.unit}` : "";
      rows.push({
        key: layer.key,
        name: layer.name || layer.key,
        color: layer.color || "#4EA8FF",
        text: `${formatNumber(value)}${unit}`,
      });
      continue;
    }
    if (layer.drawType === "line") {
      for (const series of lineSeriesOf(layer)) {
        const point = series.points[timeIndex];
        if (!point || point.h == null || !Number.isFinite(point.t)) continue;
        const unit = layer.unit ? ` ${layer.unit}` : "";
        rows.push({
          key: `${layer.key}-${series.name}`,
          name: series.name,
          color: series.color,
          text: `${formatNumber(point.h)}${unit}`,
        });
      }
      continue;
    }
    const heights = heightsAt(layer, timeIndex);
    const heightIndex = nearestFiniteIndex(heights, height);
    if (heightIndex < 0) continue;
    const speedRaw = layer.speed?.[timeIndex]?.[heightIndex];
    const dirRaw = layer.dir?.[timeIndex]?.[heightIndex];
    if (isLidarMissingCell(speedRaw) || isLidarMissingCell(dirRaw)) continue;
    rows.push({
      key: layer.key,
      name: layer.name || layer.key,
      color: layer.color || "#FFFFFF",
      text: `${formatNumber(Number(speedRaw))} m/s  ${Number(dirRaw).toFixed(0)}°`,
    });
  }
  return rows;
}
