import { isLidarMissingCell } from "./lidarMissing";

export interface HodographInput {
  heightKm?: unknown;
  windSpeed?: unknown;
  windDir?: unknown;
}

export interface HodographPoint {
  heightKm: number | null;
  speed: number;
  dir: number;
}

export interface HodographXY {
  x: number;
  y: number;
}

/** From-direction: 0 deg is north, clockwise. Radius is wind speed. */
export function toXY(cx: number, cy: number, speed: number, dirDeg: number, radius: (speed: number) => number): HodographXY {
  const rad = (dirDeg * Math.PI) / 180;
  const r = radius(speed);
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

export function niceMaxSpeed(maxVal: number): number {
  if (!Number.isFinite(maxVal) || maxVal <= 0) return 10;
  const padded = maxVal * 1.15;
  const step = padded <= 10 ? 2 : padded <= 20 ? 5 : 10;
  return Math.max(step, Math.ceil(padded / step) * step);
}

export function buildHodographPoints(layers: unknown): HodographPoint[] {
  if (!Array.isArray(layers)) return [];
  const points: HodographPoint[] = [];
  for (const row of layers) {
    if (!row || typeof row !== "object") continue;
    const item = row as HodographInput;
    if (isLidarMissingCell(item.windSpeed) || isLidarMissingCell(item.windDir)) continue;
    const speed = Number(item.windSpeed);
    const dir = Number(item.windDir);
    if (speed < 0) continue;
    points.push({
      heightKm: isLidarMissingCell(item.heightKm) ? null : Number(item.heightKm),
      speed,
      dir,
    });
  }
  points.sort((a, b) => {
    const left = a.heightKm == null ? 0 : a.heightKm;
    const right = b.heightKm == null ? 0 : b.heightKm;
    return left - right;
  });
  return points;
}

export function hodographPath(cx: number, cy: number, points: HodographXY[]): string | null {
  if (!points.length) return null;
  return `M${cx},${cy}${points.map((point) => `L${point.x},${point.y}`).join("")}`;
}
