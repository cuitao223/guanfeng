export function metersPerSecondToKnots(speed) {
  return Number(speed) * 1852 / 3600;
}

export function beaufortLevel(knots) {
  const speed = Number(knots);
  if (speed <= 0.2) return 0;
  if (speed <= 1.5) return 1;
  if (speed <= 3.3) return 2;
  if (speed <= 5.4) return 3;
  if (speed <= 7.9) return 4;
  if (speed <= 10.7) return 5;
  if (speed <= 13.8) return 6;
  if (speed <= 17.1) return 7;
  if (speed <= 20.7) return 8;
  if (speed <= 24.4) return 9;
  if (speed <= 28.4) return 10;
  if (speed <= 32.6) return 11;
  if (speed <= 36.9) return 12;
  if (speed <= 41.4) return 13;
  if (speed <= 46.1) return 14;
  if (speed <= 50.9) return 15;
  if (speed <= 56.0) return 16;
  return 17;
}

export const WIND_MARK_COLOR = "#ffffff";
