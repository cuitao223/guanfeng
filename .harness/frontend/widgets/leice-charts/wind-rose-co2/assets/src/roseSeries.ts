export const ROSE_DIRECTIONS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export interface RoseSample {
  dir: number;
  value: number;
}

function finitePair(dir: unknown, value: unknown): boolean {
  const d = Number(dir);
  const v = Number(value);
  if (!Number.isFinite(d) || !Number.isFinite(v)) return false;
  if (d === 999 || v === 999 || d <= -999 || v <= -999) return false;
  return true;
}

export function roseSamples(rows: unknown[]): RoseSample[] {
  const samples: RoseSample[] = [];
  for (const row of rows) {
    if (Array.isArray(row)) {
      if (!finitePair(row[0], row[1])) continue;
      samples.push({ dir: Number(row[0]), value: Number(row[1]) });
      continue;
    }
    if (row && typeof row === "object") {
      const record = row as { dir?: unknown; value?: unknown };
      if (!finitePair(record.dir, record.value)) continue;
      samples.push({ dir: Number(record.dir), value: Number(record.value) });
    }
  }
  return samples.sort((a, b) => b.value - a.value);
}

export function roseRadius(value: number, maxValue: number, maxRadius: number): number {
  if (!(maxValue > 0) || !(maxRadius > 0)) return 0;
  return Math.max(0, Math.min(maxRadius, (value / maxValue) * maxRadius));
}
