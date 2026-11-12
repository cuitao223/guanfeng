import { beaufortLevel, metersPerSecondToKnots } from "./beaufort.mjs";

export function staffEnd(x, y, dirDeg, length) {
  const arc = (Math.PI * dirDeg) / 180;
  return {
    x: x + length * Math.sin(arc),
    y: y - length * Math.cos(arc),
  };
}

export function chunkPoint(start, end, count, number) {
  const points = [start];
  for (let i = 1; i < count; i += 1) {
    points.push({
      x: start.x + (i * (end.x - start.x)) / count,
      y: start.y + (i * (end.y - start.y)) / count,
    });
  }
  points.push(end);
  const reversed = points.slice().reverse();
  return reversed[number - 1];
}

export function pointByDistance(start, end, radius) {
  const k = (end.y - start.y) / (end.x - start.x);
  const r2 = radius * radius;
  const k2 = k * k;
  let x;
  let y;
  if (end.x > start.x) {
    if (end.y < start.y) {
      x = end.x + Math.sqrt((r2 * k2) / (1 + k2));
      y = end.y + Math.sqrt(r2 / (1 + k2));
    } else {
      x = end.x - Math.sqrt((r2 * k2) / (1 + k2));
      y = end.y + Math.sqrt(r2 / (1 + k2));
    }
  } else if (end.x < start.x) {
    if (end.y > start.y) {
      x = end.x - Math.sqrt((r2 * k2) / (1 + k2));
      y = end.y - Math.sqrt(r2 / (1 + k2));
    } else {
      x = end.x + Math.sqrt((r2 * k2) / (1 + k2));
      y = end.y - Math.sqrt(r2 / (1 + k2));
    }
  } else if (end.y > start.y) {
    x = end.x - radius;
    y = end.y;
  } else {
    x = end.x + radius;
    y = end.y;
  }
  return { x, y };
}

export function barbPolylines(start, dirDeg, speedMps, options = {}) {
  if (speedMps === 0 || speedMps == null) return [];
  const length = options.windLineLen == null ? 16 : options.windLineLen;
  const feather = options.levelLineMinLen == null ? 4 : options.levelLineMinLen;
  const chunks = options.chunkCount == null ? 6 : options.chunkCount;
  const end = staffEnd(start.x, start.y, dirDeg, length);
  const level = beaufortLevel(metersPerSecondToKnots(speedMps));
  const count8 = Math.floor(level / 8);
  const count2 = Math.floor((level % 8) / 2);
  const count1 = level % 2 === 0 ? 0 : 1;
  const lines = [[start, end]];
  for (let i = 0; i < count8; i += 1) {
    const sp = chunkPoint(start, end, chunks, 2 * i + 1);
    const sp2 = chunkPoint(start, end, chunks, 2 * i + 1 + 2);
    const lp = pointByDistance(start, sp, feather * 2);
    lines.push([sp, lp, sp2]);
  }
  for (let i = 0; i < count2; i += 1) {
    const sp = chunkPoint(start, end, chunks, 2 * count8 + 1 + i);
    const lp = pointByDistance(start, sp, feather * 2);
    lines.push([sp, lp]);
  }
  for (let i = 0; i < count1; i += 1) {
    const sp = chunkPoint(start, end, chunks, 2 * count8 + 1 + count2 + i);
    const lp = pointByDistance(start, sp, feather);
    lines.push([sp, lp]);
  }
  return lines;
}

export function arrowPolylines(from, dirDeg, value, length = 12) {
  if (value === 0 || value == null) return [];
  const to = staffEnd(from.x, from.y, dirDeg, length);
  const theta = (30 * Math.PI) / 180;
  const head = 6;
  const angle = Math.atan2(from.y - to.y, from.x - to.x);
  const topX = head * Math.cos(angle + theta);
  const topY = head * Math.sin(angle + theta);
  const botX = head * Math.cos(angle - theta);
  const botY = head * Math.sin(angle - theta);
  return [
    [from, to],
    [{ x: to.x + topX, y: to.y + topY }, to],
    [to, { x: to.x + botX, y: to.y + botY }],
  ];
}
