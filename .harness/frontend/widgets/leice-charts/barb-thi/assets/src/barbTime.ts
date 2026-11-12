/**
 * 数值按 thiCanvasCore 当作 Unix 秒。
 * YYYY-MM-DD HH:mm:ss 按本地时间拆开，不追加 Z。
 */

const FORMATTED = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;

export function parseBarbTime(value: unknown): number | null {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms / 1000 : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    return text.length === 13 ? n / 1000 : n;
  }
  const match = FORMATTED.exec(text);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms / 1000 : null;
}

export function barbTimeToDate(unixSec: number): Date {
  return new Date(unixSec * 1000);
}
