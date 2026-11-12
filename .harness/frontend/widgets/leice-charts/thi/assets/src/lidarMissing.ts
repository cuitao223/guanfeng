/** 缺测哨兵。 */

export const LIDAR_MISSING_HIGH = 999;
export const LIDAR_MISSING_LOW = -999;

export function isLidarMissingNumeric(value: unknown): boolean {
  const n = Number(value);
  if (!Number.isFinite(n)) return false;
  return n === LIDAR_MISSING_HIGH || n <= LIDAR_MISSING_LOW;
}

export function isLidarMissingCell(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  const n = Number(value);
  if (!Number.isFinite(n)) return true;
  return isLidarMissingNumeric(n);
}
