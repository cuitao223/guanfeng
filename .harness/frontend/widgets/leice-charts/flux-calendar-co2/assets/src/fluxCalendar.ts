export const FLUX_COLORS = [
  "#2B327E",
  "#313695",
  "#3A4A9D",
  "#5A6DB8",
  "#A3C5E0",
  "#F1EAEA",
  "#fee090",
  "#fdae61",
  "#f46d43",
  "#d73027",
  "#a50026",
];

export const DBS_DOMAIN = [-5000, -4000, -3000, -2000, -1000, 0, 1000, 2000, 3000, 4000, 5000];
export const PPI_DOMAIN_WIDE = [-2000, -1500, -1000, -500, -200, 0, 200, 500, 1000, 1500, 2000];
export const PPI_DOMAIN_NARROW = [-500, -400, -300, -200, -100, 0, 100, 200, 300, 400, 500];

export const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
export const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
export const INVALID_FLUX_TEXT = "测量无效值";
export const EMPTY_TEXT = "无数据";

const MISSING_HIGH = 999;
const MISSING_LOW = -999;

export interface FluxRow {
  date: string | number;
  [key: string]: string | number | null | undefined;
}

export interface DayCell {
  date: string;
  value: number;
}

export interface MatrixCell {
  x: number;
  y: number;
  value: number;
}

export function isFluxMissing(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  const n = Number(value);
  if (!Number.isFinite(n)) return true;
  if (n === MISSING_HIGH || n === MISSING_LOW || n === -9999) return true;
  return false;
}

export function compactDate(dateVal: string | number): string | null {
  const str = String(dateVal).replace(/-/g, "");
  if (!/^\d{8}/.test(str)) return null;
  return str.slice(0, 8);
}

export function isoDate(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

export function fluxNumber(row: FluxRow, field: string): number | null {
  if (isFluxMissing(row[field])) return null;
  return Number(row[field]);
}

export function buildDaySeries(rows: FluxRow[], field: string, year: number | string): DayCell[] {
  const list: DayCell[] = [];
  const yearText = String(year);
  rows.forEach((row) => {
    const compact = compactDate(row.date);
    if (!compact || compact.slice(0, 4) !== yearText) return;
    const value = fluxNumber(row, field);
    if (value == null) return;
    list.push({ date: isoDate(compact), value });
  });
  return list;
}

export function buildMonthMatrix(rows: FluxRow[], field: string, years: Array<number | string>): MatrixCell[] {
  const map = new Map<string, { sum: number; count: number }>();
  rows.forEach((row) => {
    const compact = compactDate(row.date);
    if (!compact) return;
    const value = fluxNumber(row, field);
    if (value == null) return;
    const key = `${compact.slice(0, 4)}-${compact.slice(4, 6)}`;
    const bucket = map.get(key) || { sum: 0, count: 0 };
    bucket.sum += value;
    bucket.count += 1;
    map.set(key, bucket);
  });
  const data: MatrixCell[] = [];
  years.forEach((year, yi) => {
    for (let mi = 0; mi < 12; mi += 1) {
      const month = String(mi + 1).padStart(2, "0");
      const bucket = map.get(`${year}-${month}`);
      if (bucket && bucket.count) data.push({ x: mi, y: yi, value: Number((bucket.sum / bucket.count).toFixed(4)) });
    }
  });
  return data;
}

export function isoWeekParts(compact: string): { year: number; week: number } {
  const year = Number(compact.slice(0, 4));
  const month = Number(compact.slice(4, 6));
  const day = Number(compact.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: isoYear, week };
}

export function buildWeekMatrix(rows: FluxRow[], field: string, years: Array<number | string>): MatrixCell[] {
  const wanted = new Set(years.map((year) => String(year)));
  const map = new Map<string, { sum: number; count: number }>();
  rows.forEach((row) => {
    const compact = compactDate(row.date);
    if (!compact || !wanted.has(compact.slice(0, 4))) return;
    const value = fluxNumber(row, field);
    if (value == null) return;
    const parts = isoWeekParts(compact);
    const key = `${parts.year}-W${parts.week}`;
    const bucket = map.get(key) || { sum: 0, count: 0 };
    bucket.sum += value;
    bucket.count += 1;
    map.set(key, bucket);
  });
  const data: MatrixCell[] = [];
  years.forEach((year, yi) => {
    for (let week = 1; week <= 53; week += 1) {
      const bucket = map.get(`${year}-W${week}`);
      if (bucket && bucket.count) data.push({ x: week - 1, y: yi, value: Number((bucket.sum / bucket.count).toFixed(4)) });
    }
  });
  return data;
}

export function fluxColor(value: number, domain: number[], colors: string[] = FLUX_COLORS): string {
  const stops = domain.length >= 2 ? domain : [-1, 1];
  const palette = colors.length >= 2 ? colors : FLUX_COLORS;
  const min = stops[0];
  const max = stops[stops.length - 1];
  const clamped = Math.min(max, Math.max(min, value));
  const exact = stops.findIndex((stop) => stop === clamped);
  if (exact >= 0 && stops.length === palette.length) return palette[exact];
  const span = max - min || 1;
  const t = (clamped - min) / span;
  const index = Math.min(palette.length - 2, Math.floor(t * (palette.length - 1)));
  const local = t * (palette.length - 1) - index;
  return mixHex(palette[index], palette[index + 1], local);
}

function mixHex(a: string, b: string, t: number): string {
  const left = hexRgb(a);
  const right = hexRgb(b);
  const mix = left.map((channel, i) => Math.round(channel + (right[i] - channel) * t));
  return `#${mix.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function hexRgb(hex: string): [number, number, number] {
  const text = hex.replace("#", "");
  return [parseInt(text.slice(0, 2), 16), parseInt(text.slice(2, 4), 16), parseInt(text.slice(4, 6), 16)];
}
