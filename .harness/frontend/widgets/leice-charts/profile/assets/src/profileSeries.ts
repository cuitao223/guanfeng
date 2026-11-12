import { line } from "d3";
import { isLidarMissingCell } from "./lidarMissing";

export interface ProfileSlot {
  height: number;
  value: number;
  missing: boolean;
}

/**
 * 按下标对齐 heightArr 与 value。缺测保留空位，数值用 NaN，不用 0。
 * 空位让折线断开，避免连成 0。
 */
export function buildSeries(heightArr: unknown[], value: unknown[]): ProfileSlot[] {
  const len = Math.min(heightArr.length, value.length);
  const series: ProfileSlot[] = [];
  for (let i = 0; i < len; i += 1) {
    const height = heightArr[i];
    const raw = value[i];
    if (isLidarMissingCell(height) || isLidarMissingCell(raw)) {
      series.push({ height: Number.NaN, value: Number.NaN, missing: true });
      continue;
    }
    series.push({ height: Number(height), value: Number(raw), missing: false });
  }
  return series;
}

export function drawableSlots(series: ProfileSlot[]): ProfileSlot[] {
  return series.filter((slot) => !slot.missing);
}

export function hasDrawablePoint(series: ProfileSlot[]): boolean {
  return series.some((slot) => !slot.missing);
}

/** 左右都没有相邻有效点时才是散点。有连线的点不单独画圆点。 */
export function showsPointMarker(series: ProfileSlot[], index: number): boolean {
  const slot = series[index];
  if (!slot || slot.missing) return false;
  const linkedBefore = index > 0 && !series[index - 1].missing;
  const linkedAfter = index + 1 < series.length && !series[index + 1].missing;
  return !linkedBefore && !linkedAfter;
}

export function normalizeFixedDomain(fixed: unknown): [number, number] | null {
  if (!Array.isArray(fixed) || fixed.length < 2) return null;
  const a = Number(fixed[0]);
  const b = Number(fixed[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a <= b ? [a, b] : [b, a];
}

export function resolveXDomain(series: ProfileSlot[], fixed: unknown): [number, number] {
  const base = normalizeFixedDomain(fixed);
  const values = drawableSlots(series).map((slot) => slot.value);
  if (!values.length) return base ? base.slice() as [number, number] : [-1, 1];
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  if (base) {
    let lo = base[0];
    let hi = base[1];
    if (minV < lo || maxV > hi) {
      const pad = (maxV - minV) * 0.1 || Math.max(Math.abs(maxV), Math.abs(minV), 0.1) * 0.1;
      lo = Math.min(lo, minV - pad);
      hi = Math.max(hi, maxV + pad);
    }
    return [lo, hi];
  }
  const pad = (maxV - minV) * 0.1 || 1;
  return [Math.floor(minV - pad), Math.ceil(maxV + pad)];
}

/** 有空位时路径分成多段。没有可画点时返回 null，不生成零线。 */
export function profileLinePath(
  series: ProfileSlot[],
  x: (value: number) => number,
  y: (height: number) => number
): string | null {
  if (!hasDrawablePoint(series)) return null;
  const generator = line<ProfileSlot>()
    .defined((slot) => !slot.missing)
    .x((slot) => x(slot.value))
    .y((slot) => y(slot.height));
  return generator(series);
}
