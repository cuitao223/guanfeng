/** Skew-T log-P thermodynamics. T in C, p in hPa. */

export const KAPPA = 0.2854; // R_d / c_pd
export const P0 = 1000;
export const T_MIN = -110;
/** Adiabat seed floor (degC): draw down to -90; do not seed -100 or colder. */
export const T_ADIABAT_MIN = -90;
export const T_MAX = 40;
export const P_TOP = 200;
export const P_BOT = 1050;

export const P_TICKS = [
  200, 250, 300, 400, 500, 600, 700, 850, 925, 1000,
];
export const T_GRID_TICKS = [
  -110, -100, -90, -80, -70, -60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40,
];
export const T_LABEL_TICKS = [
  -110, -100, -90, -80, -70, -60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40,
];

const RD = 287.05;
const RV = 461.51;
const CP = 1005.0;
const L = 2.5e6;
const EPS = 0.622;

export interface ThermoPoint {
  t: number;
  p: number;
}

export interface StateCurveInput {
  pressure?: Array<number | string | null>;
  temperature?: Array<number | string | null>;
}

/** Plot x uses raw temperature (no skew). */
export function plotTemp(tempC: number): number {
  return tempC;
}

/**
 * Dry adiabat (constant potential temperature theta):
 *   theta = T * (P0 / p) ^ kappa
 *   T(p) = theta * (p / P0) ^ kappa
 * Helpers use Celsius in/out, Kelvin inside.
 */
export function dryAdiabatTemp(thetaC: number, p: number): number {
  const thetaK = thetaC + 273.15;
  return thetaK * Math.pow(p / P0, KAPPA) - 273.15;
}

export function potentialTempC(tempC: number, p: number): number {
  const TK = tempC + 273.15;
  return TK * Math.pow(P0 / p, KAPPA) - 273.15;
}

/** Temperature at left adiabat seed edge (no skew: constant). */
export function tempAtLeftEdge() {
  return T_ADIABAT_MIN;
}

export function satVaporHpa(tempC: number): number {
  return 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
}

/**
 * Pseudo-adiabatic dT/dp (K/hPa):
 *   dT/dp = (Rd*T/P)*(1+L*w/(Rd*T)) / (cp + L^2*w*(1+w/eps)/(Rv*T^2))
 * P in Pa; result in K/hPa.
 */
function dTdpMoist(tempK: number, pHpa: number): number {
  const es = satVaporHpa(tempK - 273.15);
  if (es >= pHpa * 0.98) return (KAPPA * tempK) / pHpa;
  const w = (EPS * es) / Math.max(pHpa - es, 0.01);
  const P = pHpa * 100;
  const num = 1 + (L * w) / (RD * tempK);
  const den = CP + (L * L * w * (1 + w / EPS)) / (RV * tempK * tempK);
  return ((RD * tempK) / P) * (num / den) * 100;
}

/** Integrate moist adiabat from (tBotC, pBot) toward pTop. */
export function moistAdiabatPath(tBotC: number, pTop: number, pBot: number, step?: number): ThermoPoint[] {
  const dp = step || -2;
  const pts: ThermoPoint[] = [];
  let T = tBotC + 273.15;
  let p = pBot;
  pts.push({ t: tBotC, p: pBot });
  while (p > pTop) {
    const next = Math.max(pTop, p + dp);
    T += dTdpMoist(T, p) * (next - p);
    p = next;
    pts.push({ t: T - 273.15, p });
    if (T < 160) break;
  }
  return pts;
}

/**
 * Moist adiabat anchored at (tAnchorC, pAnchor), typically 1000 hPa.
 * Integrates upward to pTop and downward to pBot.
 */
export function moistAdiabatAnchored(
  tAnchorC: number,
  pAnchor: number,
  pTop: number,
  pBot: number,
  step?: number
): ThermoPoint[] {
  const dp = Math.abs(step || 2);
  const up = moistAdiabatPath(tAnchorC, pTop, pAnchor, -dp);
  const down: ThermoPoint[] = [];
  let T = tAnchorC + 273.15;
  let p = pAnchor;
  while (p < pBot) {
    const next = Math.min(pBot, p + dp);
    T += dTdpMoist(T, p) * (next - p);
    p = next;
    down.push({ t: T - 273.15, p });
    if (T > 340) break;
  }
  down.reverse();
  return down.concat(up);
}

/**
 * Moist adiabat seeded at left edge pressure pHit:
 * T on left edge, then integrate up and down.
 */
export function moistAdiabatFromLeft(pHit: number, pTop: number, pBot: number, step?: number): ThermoPoint[] {
  return moistAdiabatAnchored(tempAtLeftEdge(), pHit, pTop, pBot, step);
}

export function pressurePath(count?: number): number[] {
  const n = count || 180;
  const pts: number[] = [];
  const ln0 = Math.log(P_BOT);
  const ln1 = Math.log(P_TOP);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push(Math.exp(ln0 + (ln1 - ln0) * t));
  }
  return pts;
}

/**
 * Dry theta: seed every 10 C; at 1000 hPa, T = theta.
 * Seeds above T_MAX enter from the right as they cool aloft (cover 200-600 hPa).
 */
export function dryThetasForPlot(): number[] {
  const out: number[] = [];
  for (let th = T_ADIABAT_MIN; th <= T_MAX + 100; th += 10) out.push(th);
  return out;
}

/**
 * Moist seed temps every 10 C; anchored at 1000 hPa.
 * Seeds above T_MAX enter from the right aloft (cover 200-600 hPa).
 */
export function moistBottomSeedTemps(): number[] {
  const out: number[] = [];
  for (let t = T_ADIABAT_MIN; t <= T_MAX + 60; t += 10) out.push(t);
  return out;
}

/** Saturation mixing ratio lines (g/kg); same set as the reference Skew-T. */
export const MIXING_RATIO_GKG = [
  0.05, 0.1, 0.2, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 30,
];

/**
 * Temperature (C) where saturation mixing ratio is wsGkg at pressure pHpa.
 * ws = 622 * es / (p - es), es from the Magnus formula used by satVaporHpa.
 */
export function mixingRatioTempC(wsGkg: number, pHpa: number): number | null {
  const w = Number(wsGkg) / 1000;
  const p = Number(pHpa);
  if (!(w > 0) || !(p > 0)) return null;
  const es = (w * p) / (EPS + w);
  if (!(es > 0.01) || es >= p * 0.98) return null;
  const ln = Math.log(es / 6.112);
  const den = 17.67 - ln;
  if (!(den > 0.2)) return null;
  const t = (243.5 * ln) / den;
  return Number.isFinite(t) ? t : null;
}

/**
 * State curve: dry lift from (T0,P0) to PLCL, then moist lift to pTop.
 * stateCurve: { pressure[], temperature[] }; pressure[1] is LCL level.
 */
export function stateCurvePath(
  stateCurve: StateCurveInput | null | undefined,
  pTop: number,
  step?: number
): ThermoPoint[] {
  const src = stateCurve || {};
  const pressures = Array.isArray(src.pressure) ? src.pressure : [];
  const temps = Array.isArray(src.temperature) ? src.temperature : [];
  if (pressures.length < 2 || temps.length < 1) return [];

  const t0 = Number(temps[0]);
  const p0 = Number(pressures[0]);
  const pLcl = Number(pressures[1]);
  if (!Number.isFinite(t0) || !Number.isFinite(p0) || !Number.isFinite(pLcl)) {
    return [];
  }
  if (p0 <= 0 || pLcl <= 0) return [];

  const dp = step || -2;
  const theta = potentialTempC(t0, p0);
  const dryPts = [{ t: t0, p: p0 }];

  let p = p0;
  const goingUp = pLcl < p0;
  if (goingUp) {
    while (p > pLcl) {
      const next = Math.max(pLcl, p + dp);
      dryPts.push({ t: dryAdiabatTemp(theta, next), p: next });
      p = next;
    }
  } else {
    while (p < pLcl) {
      const next = Math.min(pLcl, p - dp);
      dryPts.push({ t: dryAdiabatTemp(theta, next), p: next });
      p = next;
    }
  }

  const tLcl = dryAdiabatTemp(theta, pLcl);
  const last = dryPts[dryPts.length - 1];
  if (!last || last.p !== pLcl) {
    dryPts.push({ t: tLcl, p: pLcl });
  } else {
    last.t = tLcl;
  }

  const moistUp = moistAdiabatPath(tLcl, pTop, pLcl, dp);
  return dryPts.concat(moistUp.slice(1));
}
