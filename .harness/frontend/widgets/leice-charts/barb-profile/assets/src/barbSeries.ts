import { isLidarMissingCell } from "./lidarMissing";

/** Shaft 20, feather 10, gap 4. */

export const BARB_SHAFT = 20;
export const BARB_FEATHER = 10;
export const BARB_GAP = 4;

export interface BarbPlan {
  pennants: number;
  longs: number;
  short: number;
}

export interface BarbSlot {
  height: number;
  speed: number;
  dir: number;
  missing: boolean;
}

/** One pennant per 20, one long per 4, one short when the remainder is above 0. */
export function barbPlan(speed: number): BarbPlan {
  const value = Math.max(0, Number(speed) || 0);
  const pennants = Math.trunc(value / 20);
  const longs = Math.trunc((value - pennants * 20) / 4);
  const short = value - pennants * 20 - longs * 4 > 0 ? 1 : 0;
  return { pennants, longs, short };
}

export function buildBarbs(heightArr: unknown[], value: unknown[], dirArr: unknown[]): BarbSlot[] {
  const length = Math.min(heightArr.length, value.length, dirArr.length);
  const slots: BarbSlot[] = [];
  for (let index = 0; index < length; index += 1) {
    const height = Number(heightArr[index]);
    const speedMissing = isLidarMissingCell(value[index]);
    const dirMissing = isLidarMissingCell(dirArr[index]);
    const heightOk = Number.isFinite(height) && !isLidarMissingCell(heightArr[index]);
    const missing = !heightOk || speedMissing || dirMissing;
    slots.push({
      height: heightOk ? height : Number.NaN,
      speed: speedMissing ? Number.NaN : Number(value[index]),
      dir: dirMissing ? Number.NaN : Number(dirArr[index]),
      missing,
    });
  }
  return slots;
}

export function hasDrawableBarb(slots: BarbSlot[]): boolean {
  return slots.some((slot) => !slot.missing);
}

/** Slots closer than 26 px are skipped. */
export function pickBarbSlots(slots: BarbSlot[], y: (height: number) => number, innerH: number): BarbSlot[] {
  const sorted = slots.filter((slot) => !slot.missing).slice().sort((a, b) => a.height - b.height);
  const picked: BarbSlot[] = [];
  let lastY = Infinity;
  for (const slot of sorted) {
    const py = y(slot.height);
    if (py < 0 || py > innerH) continue;
    if (Math.abs(py - lastY) >= 26) {
      picked.push(slot);
      lastY = py;
    }
  }
  return picked;
}

export function drawWindBarbPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  speed: number,
  dir: number,
  options?: { sizeScale?: number; lineWidth?: number },
): void {
  const sizeScale = Math.min(2, Math.max(0.1, Number(options?.sizeScale) || 1));
  const shaft = BARB_SHAFT * sizeScale;
  const feather = BARB_FEATHER * sizeScale;
  const gap = BARB_GAP * sizeScale;
  const plan = barbPlan(speed);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((dir * Math.PI) / 180);
  ctx.lineWidth = Math.min(5, Math.max(0.5, Number(options?.lineWidth) || 1));
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -shaft);
  let pos = -shaft;
  for (let index = 0; index < plan.pennants; index += 1) {
    ctx.moveTo(0, pos);
    ctx.lineTo(feather, pos);
    ctx.lineTo(0, pos + gap);
    pos += gap;
  }
  for (let index = 0; index < plan.longs; index += 1) {
    ctx.moveTo(0, pos);
    ctx.lineTo(feather, pos);
    pos += gap;
  }
  for (let index = 0; index < plan.short; index += 1) {
    ctx.moveTo(0, pos);
    ctx.lineTo(feather / 2, pos);
    pos += gap;
  }
  ctx.stroke();
  ctx.restore();
}
