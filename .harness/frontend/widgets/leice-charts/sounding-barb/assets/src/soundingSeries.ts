import { isLidarMissingCell } from "./lidarMissing";

export const P_TOP = 200;
export const P_BOT = 1050;
export const SOUNDING_LEVELS = [1000, 925, 850, 800, 750, 700, 600, 500, 400, 300, 250, 200];

export const BARB_SHAFT = 20;
export const BARB_FEATHER = 10;
export const BARB_GAP = 4;

export interface SoundingSample {
  pressure: number;
  speed: number;
  dir: number;
  height: number | null;
}

export interface SoundingLevel extends SoundingSample {
  level: number;
}

export function levelTolerance(level: number): number {
  let gap = Infinity;
  for (const other of SOUNDING_LEVELS) {
    if (other === level) continue;
    gap = Math.min(gap, Math.abs(other - level));
  }
  return gap / 2;
}

export function soundingSamples(
  pressure: unknown[],
  value: unknown[],
  windDir: unknown[],
  height: unknown[] = [],
): SoundingSample[] {
  const count = Math.min(pressure.length, value.length, windDir.length);
  const samples: SoundingSample[] = [];
  for (let index = 0; index < count; index += 1) {
    if (isLidarMissingCell(pressure[index]) || isLidarMissingCell(value[index]) || isLidarMissingCell(windDir[index])) continue;
    const p = Number(pressure[index]);
    const speed = Number(value[index]);
    const dir = Number(windDir[index]);
    if (p <= 0 || speed <= 0) continue;
    samples.push({
      pressure: p,
      speed,
      dir,
      height: isLidarMissingCell(height[index]) ? null : Number(height[index]),
    });
  }
  samples.sort((a, b) => b.pressure - a.pressure);
  return samples;
}

export function pickSoundingLevels(samples: SoundingSample[]): SoundingLevel[] {
  const used = new Set<number>();
  const picked: SoundingLevel[] = [];
  for (const level of SOUNDING_LEVELS) {
    const tolerance = levelTolerance(level);
    let best = -1;
    let bestDist = Infinity;
    for (let index = 0; index < samples.length; index += 1) {
      if (used.has(index)) continue;
      const dist = Math.abs(samples[index].pressure - level);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    }
    if (best < 0 || bestDist > tolerance) continue;
    used.add(best);
    picked.push({ level, ...samples[best] });
  }
  return picked;
}

export function drawWindBarbPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  speed: number,
  dir: number,
): void {
  const shaft = BARB_SHAFT * 1.5;
  const feather = BARB_FEATHER * 1.5;
  const gap = BARB_GAP * 1.5;
  const pennants = Math.trunc(speed / 20);
  const longs = Math.trunc((speed - pennants * 20) / 4);
  const short = speed - pennants * 20 - longs * 4 > 0 ? 1 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((dir * Math.PI) / 180);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -shaft);
  let pos = -shaft;
  for (let index = 0; index < pennants; index += 1) {
    ctx.moveTo(0, pos);
    ctx.lineTo(feather, pos);
    ctx.lineTo(0, pos + gap);
    pos += gap;
  }
  for (let index = 0; index < longs; index += 1) {
    ctx.moveTo(0, pos);
    ctx.lineTo(feather, pos);
    pos += gap;
  }
  if (short) {
    ctx.moveTo(0, pos);
    ctx.lineTo(feather / 2, pos);
  }
  ctx.stroke();
  ctx.restore();
}
