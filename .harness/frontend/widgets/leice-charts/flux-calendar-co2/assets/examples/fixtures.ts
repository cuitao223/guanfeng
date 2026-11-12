import type { FluxRow } from "../src/fluxCalendar";

function compact(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}${month}${day}`;
}

export function demoRows(year = 2025): FluxRow[] {
  const rows: FluxRow[] = [];
  const start = new Date(year, 0, 1);
  for (let cursor = new Date(start); cursor.getFullYear() === year; cursor.setDate(cursor.getDate() + 1)) {
    const doy = Math.round((cursor.getTime() - start.getTime()) / 86400000);
    let vertical = Math.round(Math.sin(doy / 18) * 1800);
    if (doy === 10) vertical = 999;
    if (doy === 11) vertical = -999;
    if (doy === 12) vertical = 0;
    rows.push({
      date: compact(cursor),
      verticalAvg: vertical,
      eastAvg: Math.round(vertical * 0.4),
      northAvg: Math.round(vertical * -0.3),
    });
  }
  return rows;
}

export const demoYears = [2025];
export const emptyRows: FluxRow[] = [];
