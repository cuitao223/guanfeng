import { isLidarMissingCell } from "./lidarMissing";

export interface ComparePoint {
  height: number;
  value: number;
}

export interface CompareSeriesInput {
  key?: string;
  name?: string;
  color?: string;
  heightArr?: unknown[];
  value?: unknown[];
}

export interface CompareSeries {
  key: string;
  name: string;
  color: string;
  /** null breaks the line. Missing samples stay as breaks and are not replaced with 0. */
  slots: Array<ComparePoint | null>;
}

export const COMPARE_COLORS = ["#4EA8FF", "#F1414D", "#2FC151", "#FDB840", "#8C40FD", "#13B7DB"];

function clipRun(points: ComparePoint[], lo: number, hi: number): ComparePoint[] {
  const sorted = points.slice().sort((a, b) => a.height - b.height);
  const out: ComparePoint[] = [];
  const push = (point: ComparePoint) => {
    const last = out[out.length - 1];
    if (last && last.height === point.height) return;
    out.push(point);
  };
  const lerp = (height: number, a: ComparePoint, b: ComparePoint): ComparePoint => {
    const span = b.height - a.height || 1;
    const t = (height - a.height) / span;
    return { height, value: a.value + (b.value - a.value) * t };
  };

  for (let index = 0; index < sorted.length; index += 1) {
    const point = sorted[index];
    const prev = index > 0 ? sorted[index - 1] : null;
    if (prev) {
      const crossedLo = (prev.height < lo && point.height >= lo) || (prev.height > lo && point.height <= lo);
      if (crossedLo) push(lerp(lo, prev, point));
      const crossedHi = (prev.height < hi && point.height >= hi) || (prev.height > hi && point.height <= hi);
      if (crossedHi && lo !== hi) push(lerp(hi, prev, point));
    }
    if (point.height >= lo && point.height <= hi) push({ height: point.height, value: point.value });
  }
  return out;
}

export function buildCompareSeries(
  input: CompareSeriesInput,
  heightMin: number,
  heightMax: number,
  index: number,
): CompareSeries {
  const heightArr = input.heightArr || [];
  const value = input.value || [];
  const length = Math.min(heightArr.length, value.length);
  const runs: ComparePoint[][] = [];
  let current: ComparePoint[] = [];
  for (let i = 0; i < length; i += 1) {
    if (isLidarMissingCell(heightArr[i]) || isLidarMissingCell(value[i])) {
      if (current.length) runs.push(current);
      current = [];
      continue;
    }
    current.push({ height: Number(heightArr[i]), value: Number(value[i]) });
  }
  if (current.length) runs.push(current);

  const lo = Math.min(heightMin, heightMax);
  const hi = Math.max(heightMin, heightMax);
  const slots: Array<ComparePoint | null> = [];
  for (const run of runs) {
    const clipped = clipRun(run, lo, hi);
    if (!clipped.length) continue;
    if (slots.length) slots.push(null);
    slots.push(...clipped);
  }

  return {
    key: input.key || `series-${index}`,
    name: input.name || input.key || `series-${index}`,
    color: input.color || COMPARE_COLORS[index % COMPARE_COLORS.length],
    slots,
  };
}

export function seriesHasPoint(series: CompareSeries): boolean {
  return series.slots.some((slot) => slot != null);
}

export function hasDrawableSeries(list: CompareSeries[]): boolean {
  return list.some(seriesHasPoint);
}

export function collectValues(list: CompareSeries[]): number[] {
  const values: number[] = [];
  for (const series of list) {
    for (const slot of series.slots) {
      if (slot) values.push(slot.value);
    }
  }
  return values;
}

export function resolveXDomain(list: CompareSeries[]): [number, number] {
  const values = collectValues(list);
  if (!values.length) return [-1, 1];
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const pad = (maxV - minV) * 0.1 || 1;
  return [Math.floor(minV - pad), Math.ceil(maxV + pad)];
}

export function compareLinePath(
  slots: Array<ComparePoint | null>,
  x: (value: number) => number,
  y: (height: number) => number,
): string | null {
  let path = "";
  let pen = false;
  for (const slot of slots) {
    if (!slot || !Number.isFinite(slot.value) || !Number.isFinite(slot.height)) {
      pen = false;
      continue;
    }
    path += `${pen ? "L" : "M"}${x(slot.value)},${y(slot.height)}`;
    pen = true;
  }
  return path || null;
}

/** Sample only inside one continuous run. A missing slot blocks interpolation. */
export function sampleAtHeight(slots: Array<ComparePoint | null>, height: number): number | null {
  for (const slot of slots) {
    if (slot && slot.height === height) return slot.value;
  }
  for (let index = 1; index < slots.length; index += 1) {
    const left = slots[index - 1];
    const right = slots[index];
    if (!left || !right) continue;
    const lo = Math.min(left.height, right.height);
    const hi = Math.max(left.height, right.height);
    if (height < lo || height > hi) continue;
    if (left.height === right.height) return left.value;
    const t = (height - left.height) / (right.height - left.height);
    return left.value + (right.value - left.value) * t;
  }
  return null;
}
