import { isLidarMissingCell } from "./lidarMissing";
import { parseThiTime } from "./thiTime";

/** 相邻样本覆盖结束后，空隙达到该秒数才算时间空档。来自 thiCanvasCore。 */
export const THI_MISSING_GAP_SEC = 600;

export interface ThiGrid {
  times: Float64Array;
  heights: Float64Array;
  values: Float32Array;
  columnValid: Uint8Array;
  heightCount: number;
}

export function thiCell(grid: ThiGrid, timeIndex: number, heightIndex: number): number {
  return grid.values[timeIndex * grid.heightCount + heightIndex];
}

export function buildThiGrid(timesIn: unknown[], heightArr: unknown[], valuesIn: unknown[][]): ThiGrid {
  const heightValues: number[] = [];
  for (let i = 0; i < heightArr.length; i += 1) {
    const height = Number(heightArr[i]);
    if (Number.isFinite(height)) heightValues.push(height);
  }
  const heightCount = heightValues.length;
  const columns = Math.min(timesIn.length, valuesIn.length);
  const times = new Float64Array(columns);
  const values = new Float32Array(columns * heightCount);
  const columnValid = new Uint8Array(columns);
  let count = 0;
  for (let i = 0; i < columns; i += 1) {
    const time = parseThiTime(timesIn[i]);
    if (time == null) continue;
    const column = valuesIn[i] || [];
    let valid = 0;
    const offset = count * heightCount;
    for (let h = 0; h < heightCount; h += 1) {
      const raw = column[h];
      if (isLidarMissingCell(raw)) {
        values[offset + h] = Number.NaN;
      } else {
        values[offset + h] = Number(raw);
        valid = 1;
      }
    }
    times[count] = time;
    columnValid[count] = valid;
    count += 1;
  }
  return {
    times: times.subarray(0, count),
    heights: Float64Array.from(heightValues),
    values: values.subarray(0, count * heightCount),
    columnValid: columnValid.subarray(0, count),
    heightCount,
  };
}

export function hasDrawablePoint(grid: ThiGrid): boolean {
  for (let i = 0; i < grid.columnValid.length; i += 1) {
    if (grid.columnValid[i]) return true;
  }
  return false;
}

function readCell(grid: ThiGrid, timeIndex: number, heightIndex: number): number {
  if (timeIndex < 0 || heightIndex < 0 || heightIndex >= grid.heightCount) return Number.NaN;
  const value = grid.values[timeIndex * grid.heightCount + heightIndex];
  return Number.isFinite(value) ? value : Number.NaN;
}

function bracket(sorted: ArrayLike<number>, value: number): number | null {
  const n = sorted.length;
  if (n < 2 || !Number.isFinite(value) || value < sorted[0] || value > sorted[n - 1]) return null;
  let lo = 0;
  let hi = n - 2;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (value < sorted[mid]) hi = mid - 1;
    else if (value > sorted[mid + 1]) lo = mid + 1;
    else return mid;
  }
  return Math.max(0, Math.min(n - 2, lo));
}

/** 双线性采样。缺测角点不参与，也不被当成 0。 */
export function bilinearSampleThiGrid(grid: ThiGrid, timeSec: number, height: number): number | null {
  const ti = bracket(grid.times, timeSec);
  const hi = bracket(grid.heights, height);
  if (ti == null || hi == null) return null;
  const t0 = grid.times[ti];
  const t1 = grid.times[ti + 1];
  const h0 = grid.heights[hi];
  const h1 = grid.heights[hi + 1];
  const dt = t1 - t0;
  const dh = h1 - h0;
  if (!(dt > 0) || !(dh > 0)) return null;
  const fx = (timeSec - t0) / dt;
  const fy = (height - h0) / dh;
  const corners = [
    { w: (1 - fx) * (1 - fy), v: readCell(grid, ti, hi) },
    { w: fx * (1 - fy), v: readCell(grid, ti + 1, hi) },
    { w: (1 - fx) * fy, v: readCell(grid, ti, hi + 1) },
    { w: fx * fy, v: readCell(grid, ti + 1, hi + 1) },
  ];
  let weight = 0;
  let sum = 0;
  for (const corner of corners) {
    if (!Number.isFinite(corner.v) || !(corner.w > 0)) continue;
    weight += corner.w;
    sum += corner.w * corner.v;
  }
  if (!(weight > 0)) return null;
  return sum / weight;
}

function sampleDuration(windpara: number[][] | undefined, index: number, fallback: number): number {
  const duration = Number(windpara && windpara[index] && windpara[index][2]);
  return Number.isFinite(duration) && duration > 0 ? duration : fallback;
}

export function buildMissingTimeGaps(times: ArrayLike<number>, windpara?: number[][], thresholdSec = THI_MISSING_GAP_SEC): Array<[number, number]> {
  const gaps: Array<[number, number]> = [];
  for (let i = 0; i < times.length - 1; i += 1) {
    const coverEnd = times[i] + sampleDuration(windpara, i, 0);
    const next = times[i + 1];
    if (next - coverEnd >= thresholdSec) gaps.push([coverEnd, next]);
  }
  return gaps;
}

export function buildProductMissingGaps(times: ArrayLike<number>, columnValid: ArrayLike<number>, windpara?: number[][]): Array<[number, number]> {
  const gaps: Array<[number, number]> = [];
  const n = Math.min(times.length, columnValid.length);
  let runStart = -1;
  for (let i = 0; i < n; i += 1) {
    if (!columnValid[i]) {
      if (runStart < 0) runStart = i;
    } else if (runStart >= 0) {
      gaps.push([times[runStart], times[i]]);
      runStart = -1;
    }
  }
  if (runStart >= 0) {
    const last = n - 1;
    gaps.push([times[runStart], times[last] + sampleDuration(windpara, last, THI_MISSING_GAP_SEC)]);
  }
  return gaps;
}

export function mergeTimeGaps(gaps: Array<[number, number]>): Array<[number, number]> {
  const sorted = gaps
    .map((gap) => [Number(gap[0]), Number(gap[1])] as [number, number])
    .filter((gap) => Number.isFinite(gap[0]) && Number.isFinite(gap[1]) && gap[1] > gap[0])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (!sorted.length) return [];
  const out = [sorted[0].slice() as [number, number]];
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = out[out.length - 1];
    if (current[0] <= last[1]) last[1] = Math.max(last[1], current[1]);
    else out.push(current.slice() as [number, number]);
  }
  return out;
}

export function buildThiMissingGaps(grid: ThiGrid, windpara?: number[][], thresholdSec = THI_MISSING_GAP_SEC): Array<[number, number]> {
  return mergeTimeGaps(
    buildMissingTimeGaps(grid.times, windpara, thresholdSec).concat(buildProductMissingGaps(grid.times, grid.columnValid, windpara))
  );
}

export function nearestSampleThiGrid(grid: ThiGrid, timeSec: number, height: number): number | null {
  const timeIndex = nearestIndex(grid.times, timeSec);
  const heightIndex = nearestIndex(grid.heights, height);
  if (timeIndex < 0 || heightIndex < 0) return null;
  const value = readCell(grid, timeIndex, heightIndex);
  return Number.isFinite(value) ? value : null;
}

function nearestIndex(sorted: ArrayLike<number>, value: number): number {
  const n = sorted.length;
  if (!n || !Number.isFinite(value)) return -1;
  if (value <= sorted[0]) return 0;
  if (value >= sorted[n - 1]) return n - 1;
  const index = bracket(sorted, value);
  if (index == null) return -1;
  return value - sorted[index] <= sorted[index + 1] - value ? index : index + 1;
}

export function timeSecInGaps(timeSec: number, gaps: Array<[number, number]>): boolean {
  return findTimeGap(timeSec, gaps) != null;
}

export function findTimeGap(timeSec: number, gaps: Array<[number, number]>): [number, number] | null {
  if (!Number.isFinite(timeSec) || !gaps.length) return null;
  let lo = 0;
  let hi = gaps.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const gap = gaps[mid];
    if (timeSec < gap[0]) hi = mid - 1;
    else if (timeSec >= gap[1]) lo = mid + 1;
    else return gap;
  }
  return null;
}

export interface ThiHit {
  time: number;
  height: number;
  value: number;
}

/** 指针落在该列覆盖和高度带内，且格子有效时才命中。缺测格不拿邻格冒充。 */
export function hitThiCell(
  grid: ThiGrid,
  timeSec: number,
  height: number,
  windpara?: number[][]
): ThiHit | null {
  const timeIndex = nearestIndex(grid.times, timeSec);
  const heightIndex = nearestIndex(grid.heights, height);
  if (timeIndex < 0 || heightIndex < 0) return null;
  const time = grid.times[timeIndex];
  const duration = sampleDuration(windpara, timeIndex, THI_MISSING_GAP_SEC);
  const next = timeIndex + 1 < grid.times.length ? grid.times[timeIndex + 1] : null;
  const coverEnd = next != null && next - (time + duration) < THI_MISSING_GAP_SEC ? next : time + duration;
  if (timeSec < time || timeSec > coverEnd) return null;
  const gate = grid.heights[heightIndex];
  if (grid.heights.length > 1) {
    const prev = heightIndex > 0 ? grid.heights[heightIndex - 1] : gate;
    const after = heightIndex + 1 < grid.heights.length ? grid.heights[heightIndex + 1] : gate;
    const low = heightIndex === 0 ? gate - Math.abs(after - gate) / 2 : (prev + gate) / 2;
    const high = heightIndex === grid.heights.length - 1 ? gate + Math.abs(gate - prev) / 2 : (gate + after) / 2;
    if (height < Math.min(low, high) || height > Math.max(low, high)) return null;
  }
  const value = readCell(grid, timeIndex, heightIndex);
  if (!Number.isFinite(value)) return null;
  return { time, height: gate, value };
}

export interface ThiSnap {
  time: number;
  height: number;
  value: number | null;
}

/** 悬停吸附到最近的时刻和高度。缺测格返回空值，不改用邻格。 */
export function snapThiSample(grid: ThiGrid, timeSec: number, height: number): ThiSnap | null {
  const timeIndex = nearestIndex(grid.times, timeSec);
  const heightIndex = nearestIndex(grid.heights, height);
  if (timeIndex < 0 || heightIndex < 0) return null;
  const value = readCell(grid, timeIndex, heightIndex);
  return {
    time: grid.times[timeIndex],
    height: grid.heights[heightIndex],
    value: Number.isFinite(value) ? value : null,
  };
}
