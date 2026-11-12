import { isLidarMissingCell } from "./lidarMissing";
import { parseBarbTime } from "./barbTime";

/** 屏幕上相邻风羽至少隔开这么多像素，避免整段时高叠成一片。 */

export const BARB_SCREEN_GAP = 36;

export interface BarbField {
  times: number[];
  heights: number[];
  speeds: unknown[][];
  dirs: unknown[][];
}

export interface BarbHit {
  time: number;
  height: number;
  speed: number;
  dir: number;
}

export function buildBarbField(
  times: unknown[],
  heights: unknown[],
  speeds: unknown[][],
  dirs: unknown[][],
): BarbField {
  const parsedTimes: number[] = [];
  const parsedSpeeds: unknown[][] = [];
  const parsedDirs: unknown[][] = [];
  const count = Math.min(times.length, speeds.length, dirs.length);
  for (let index = 0; index < count; index += 1) {
    const time = parseBarbTime(times[index]);
    if (time == null) continue;
    parsedTimes.push(time);
    parsedSpeeds.push(speeds[index] || []);
    parsedDirs.push(dirs[index] || []);
  }
  const parsedHeights = heights.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  return { times: parsedTimes, heights: parsedHeights, speeds: parsedSpeeds, dirs: parsedDirs };
}

export function readBarbCell(field: BarbField, timeIndex: number, heightIndex: number): BarbHit | null {
  const speed = field.speeds[timeIndex]?.[heightIndex];
  const dir = field.dirs[timeIndex]?.[heightIndex];
  if (isLidarMissingCell(speed) || isLidarMissingCell(dir)) return null;
  const time = field.times[timeIndex];
  const height = field.heights[heightIndex];
  if (!Number.isFinite(time) || !Number.isFinite(height)) return null;
  return { time, height, speed: Number(speed), dir: Number(dir) };
}

export function hasDrawableBarb(field: BarbField): boolean {
  const heightCount = field.heights.length;
  for (let timeIndex = 0; timeIndex < field.times.length; timeIndex += 1) {
    for (let heightIndex = 0; heightIndex < heightCount; heightIndex += 1) {
      if (readBarbCell(field, timeIndex, heightIndex)) return true;
    }
  }
  return false;
}

function pickIndices(
  values: number[],
  inside: (value: number) => boolean,
  pixel: (value: number) => number,
  gap: number,
): number[] {
  const picked: number[] = [];
  let last = Number.NaN;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!inside(value)) continue;
    const point = pixel(value);
    if (!Number.isFinite(last) || Math.abs(point - last) >= gap) {
      picked.push(index);
      last = point;
    }
  }
  return picked;
}

export function sampleBarbHits(
  field: BarbField,
  timeStart: number,
  timeEnd: number,
  heightMin: number,
  heightMax: number,
  x: (time: number) => number,
  y: (height: number) => number,
  gap = BARB_SCREEN_GAP,
): BarbHit[] {
  const timeIndexes = pickIndices(
    field.times,
    (time) => time >= timeStart && time <= timeEnd,
    (time) => x(time),
    gap,
  );
  const heightIndexes = pickIndices(
    field.heights,
    (height) => height >= heightMin && height <= heightMax,
    (height) => y(height),
    gap,
  );
  const hits: BarbHit[] = [];
  for (const timeIndex of timeIndexes) {
    for (const heightIndex of heightIndexes) {
      const hit = readBarbCell(field, timeIndex, heightIndex);
      if (hit) hits.push(hit);
    }
  }
  return hits;
}

function nearestIndex(values: number[], target: number): number {
  if (!values.length) return -1;
  let low = 0;
  let high = values.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (values[mid] < target) low = mid + 1;
    else high = mid;
  }
  const previous = low > 0 ? low - 1 : 0;
  return Math.abs(values[previous] - target) <= Math.abs(values[low] - target) ? previous : low;
}

export function nearestBarb(field: BarbField, time: number, height: number): BarbHit | null {
  const timeIndex = nearestIndex(field.times, time);
  const heightIndex = nearestIndex(field.heights, height);
  if (timeIndex < 0 || heightIndex < 0) return null;
  return readBarbCell(field, timeIndex, heightIndex);
}
