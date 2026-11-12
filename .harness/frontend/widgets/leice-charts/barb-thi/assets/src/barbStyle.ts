/** 疏密 1 最密、8 最疏。大小 value/10，粗细 value/2。 */

export const BARB_DENSITY_MIN = 1;
export const BARB_DENSITY_MAX = 8;
export const BARB_DENSITY_DEFAULT = 3;
export const BARB_SIZE_MIN = 2;
export const BARB_SIZE_MAX = 20;
export const BARB_SIZE_DEFAULT = 8;
export const BARB_STROKE_MIN = 1;
export const BARB_STROKE_MAX = 10;
export const BARB_STROKE_DEFAULT = 2;

const BASE_GAP = 36;

export function barbDensityGap(density: number): number {
  const value = clamp(density, BARB_DENSITY_MIN, BARB_DENSITY_MAX, BARB_DENSITY_DEFAULT);
  return Math.max(8, Math.round(BASE_GAP * value / BARB_DENSITY_DEFAULT));
}

export function barbSizeScale(size: number): number {
  const value = clamp(size, BARB_SIZE_MIN, BARB_SIZE_MAX, BARB_SIZE_DEFAULT);
  return Math.min(2, Math.max(0.2, value / 10));
}

export function barbStrokeWidth(stroke: number): number {
  const value = clamp(stroke, BARB_STROKE_MIN, BARB_STROKE_MAX, BARB_STROKE_DEFAULT);
  return Math.min(5, Math.max(0.5, value / 2));
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}
