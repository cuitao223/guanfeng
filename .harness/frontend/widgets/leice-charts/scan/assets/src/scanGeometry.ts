import { isLidarMissingCell } from "./lidarMissing";

export type ScanMode = "ppi" | "rhi";

export function normalizeDeg(deg: number): number {
  if (!Number.isFinite(deg)) return deg;
  let value = deg % 360;
  if (value < 0) value += 360;
  return value;
}

/** 从 a 到 b 的最短有向差，范围 (-180, 180]。来自无锡 RHIChart。 */
export function angleDiffSigned(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

export function midAngleDeg(from: number, to: number): number {
  return normalizeDeg(from + angleDiffSigned(from, to) / 2);
}

export interface AngleSector {
  start: number;
  end: number;
}

/** 扇区边界取相邻角的圆周中点。整圈扫描把最后一束和第一束接上。 */
export function angleSectors(angles: number[]): AngleSector[] {
  const finite = angles.map((item) => Number(item)).map((item) => (Number.isFinite(item) ? normalizeDeg(item) : Number.NaN));
  const count = finite.length;
  if (!count) return [];
  let span = 0;
  for (let index = 0; index < count; index += 1) {
    const next = finite[(index + 1) % count];
    if (!Number.isFinite(finite[index]) || !Number.isFinite(next)) continue;
    span += Math.abs(angleDiffSigned(finite[index], next));
  }
  const closed = count >= 3 && span > 300;
  return finite.map((deg, index) => {
    if (!Number.isFinite(deg)) return { start: Number.NaN, end: Number.NaN };
    if (count === 1) return { start: normalizeDeg(deg - 1), end: normalizeDeg(deg + 1) };
    const prev = finite[(index - 1 + count) % count];
    const next = finite[(index + 1) % count];
    if (!closed && index === 0 && Number.isFinite(next)) {
      const step = angleDiffSigned(deg, next);
      return { start: normalizeDeg(deg - step / 2), end: midAngleDeg(deg, next) };
    }
    if (!closed && index === count - 1 && Number.isFinite(prev)) {
      const step = angleDiffSigned(prev, deg);
      return { start: midAngleDeg(prev, deg), end: normalizeDeg(deg + step / 2) };
    }
    if (Number.isFinite(prev) && Number.isFinite(next)) {
      return { start: midAngleDeg(prev, deg), end: midAngleDeg(deg, next) };
    }
    return { start: normalizeDeg(deg - 1), end: normalizeDeg(deg + 1) };
  });
}

/** 距离门边界取相邻门中点。第一段内沿和最后一段外沿落在门距本身。 */
export function rangeBounds(ranges: number[]): number[] {
  const values = ranges.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  if (!values.length) return [];
  const bounds = new Array(values.length + 1);
  for (let index = 0; index <= values.length; index += 1) {
    if (index === 0) bounds[index] = values[0];
    else if (index === values.length) bounds[index] = values[values.length - 1];
    else bounds[index] = (values[index - 1] + values[index]) / 2;
  }
  return bounds;
}

export function polarPoint(mode: ScanMode, cx: number, cy: number, radius: number, deg: number): { x: number; y: number } {
  if (mode === "rhi") {
    const theta = Math.PI - (Math.PI / 180) * deg;
    return { x: cx + radius * Math.cos(theta), y: cy - radius * Math.sin(theta) };
  }
  const theta = (deg * Math.PI) / 180;
  return { x: cx + radius * Math.sin(theta), y: cy - radius * Math.cos(theta) };
}

export function traceAnnulus(
  ctx: CanvasRenderingContext2D,
  mode: ScanMode,
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  start: number,
  end: number,
): void {
  const sweep = angleDiffSigned(start, end);
  const segments = 8;
  ctx.beginPath();
  for (let step = 0; step <= segments; step += 1) {
    const deg = normalizeDeg(start + (sweep * step) / segments);
    const point = polarPoint(mode, cx, cy, outer, deg);
    if (step === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  for (let step = segments; step >= 0; step -= 1) {
    const deg = normalizeDeg(start + (sweep * step) / segments);
    const point = polarPoint(mode, cx, cy, Math.max(0, inner), deg);
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
}

export function hasDrawableScan(values: unknown[][]): boolean {
  for (const row of values) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      if (!isLidarMissingCell(cell)) return true;
    }
  }
  return false;
}

function angleInSector(angle: number, start: number, end: number): boolean {
  if (!Number.isFinite(angle) || !Number.isFinite(start) || !Number.isFinite(end)) return false;
  const sweep = angleDiffSigned(start, end);
  const delta = angleDiffSigned(start, angle);
  if (sweep >= 0) return delta >= -1e-6 && delta <= sweep + 1e-6;
  return delta <= 1e-6 && delta >= sweep - 1e-6;
}

/** 指针落在已填色扇区内部才返回该格。缺测、扇区外和距离门外都不吸附。 */
export function scanCellAt(
  angles: number[],
  ranges: number[],
  values: unknown[][],
  angle: number,
  range: number,
): { angle: number; range: number; value: number } | null {
  if (!angles.length || !ranges.length || !Number.isFinite(angle) || !Number.isFinite(range)) return null;
  const sectors = angleSectors(angles);
  const bounds = rangeBounds(ranges);
  for (let index = 0; index < angles.length; index += 1) {
    const sector = sectors[index];
    if (!sector || !angleInSector(angle, sector.start, sector.end)) continue;
    const row = values[index];
    if (!Array.isArray(row)) return null;
    for (let gate = 0; gate < bounds.length - 1 && gate < row.length; gate += 1) {
      if (range < bounds[gate] || range > bounds[gate + 1]) continue;
      const raw = row[gate];
      if (isLidarMissingCell(raw)) return null;
      return { angle: angles[index], range: ranges[gate], value: Number(raw) };
    }
    return null;
  }
  return null;
}

export function nearestScanCell(
  angles: number[],
  ranges: number[],
  values: unknown[][],
  angle: number,
  range: number,
): { angle: number; range: number; value: number } | null {
  if (!angles.length || !ranges.length) return null;
  let angleIndex = 0;
  let angleDist = Infinity;
  angles.forEach((item, index) => {
    const dist = Math.abs(angleDiffSigned(item, angle));
    if (dist < angleDist) {
      angleDist = dist;
      angleIndex = index;
    }
  });
  let rangeIndex = 0;
  let rangeDist = Infinity;
  ranges.forEach((item, index) => {
    const dist = Math.abs(item - range);
    if (dist < rangeDist) {
      rangeDist = dist;
      rangeIndex = index;
    }
  });
  const raw = values[angleIndex]?.[rangeIndex];
  if (isLidarMissingCell(raw)) return null;
  return { angle: angles[angleIndex], range: ranges[rangeIndex], value: Number(raw) };
}
