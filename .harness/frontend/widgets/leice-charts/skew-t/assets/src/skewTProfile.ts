import { stateCurvePath, type StateCurveInput, type ThermoPoint } from "./skewTThermo";

export interface ProfileInput {
  pressure?: Array<number | string | null>;
  value?: Array<number | string | null>;
}

export interface AreaPoint {
  p: number;
  tEnv: number;
  tState: number;
  d: number;
}

export interface BuoyancyArea {
  kind: "cape" | "cin" | "upper";
  pts: AreaPoint[];
}

const AREA_EPS = 0.02;
const MISSING_HIGH = 999;
const MISSING_LOW = -999;

export function isInvalidSensorVal(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  const n = Number(value);
  if (!Number.isFinite(n)) return true;
  if (n === MISSING_HIGH || n <= MISSING_LOW) return true;
  return false;
}

export function buildProfilePoints(src: ProfileInput | null | undefined): ThermoPoint[] {
  const data = src || {};
  const pressures = Array.isArray(data.pressure) ? data.pressure : [];
  const values = Array.isArray(data.value) ? data.value : [];
  const n = Math.min(pressures.length, values.length);
  const pts: ThermoPoint[] = [];
  for (let i = 0; i < n; i += 1) {
    if (isInvalidSensorVal(pressures[i]) || isInvalidSensorVal(values[i])) continue;
    const p = Number(pressures[i]);
    const t = Number(values[i]);
    if (p <= 0) continue;
    pts.push({ t, p });
  }
  pts.sort((a, b) => b.p - a.p);
  return pts;
}

export function usableStateCurve(src: StateCurveInput | null | undefined): StateCurveInput | null {
  const data = src || {};
  const pressures = Array.isArray(data.pressure) ? data.pressure : [];
  const temps = Array.isArray(data.temperature) ? data.temperature : [];
  if (pressures.length < 2 || temps.length < 1) return null;
  if (isInvalidSensorVal(pressures[0]) || isInvalidSensorVal(pressures[1]) || isInvalidSensorVal(temps[0])) {
    return null;
  }
  return data;
}

export function buildStatePoints(src: StateCurveInput | null | undefined, pTop: number): ThermoPoint[] {
  const usable = usableStateCurve(src);
  if (!usable) return [];
  return stateCurvePath(usable, pTop, -2);
}

/** Linear interp in ln(p); pts sorted high-p to low-p. */
export function interpTempAtP(pts: ThermoPoint[] | null | undefined, pHit: number): number | null {
  if (!pts || !pts.length || !Number.isFinite(pHit) || pHit <= 0) return null;
  if (pts.length === 1) return Number(pts[0].t);
  const pMax = pts[0].p;
  const pMin = pts[pts.length - 1].p;
  if (pHit > pMax || pHit < pMin) return null;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    if (a.p >= pHit && b.p <= pHit) {
      if (a.p === b.p) return a.t;
      const u = (Math.log(a.p) - Math.log(pHit)) / (Math.log(a.p) - Math.log(b.p));
      return a.t + (b.t - a.t) * u;
    }
  }
  return null;
}

function normalizeProfile(pts: ThermoPoint[]): ThermoPoint[] {
  if (!pts || pts.length < 2) return [];
  const out: ThermoPoint[] = [];
  for (let i = 0; i < pts.length; i += 1) {
    const p = Number(pts[i].p);
    const t = Number(pts[i].t);
    if (!Number.isFinite(p) || !Number.isFinite(t) || p <= 0) continue;
    out.push({ p, t });
  }
  out.sort((a, b) => b.p - a.p);
  const dedup: ThermoPoint[] = [];
  out.forEach((point) => {
    const prev = dedup[dedup.length - 1];
    if (prev && prev.p === point.p) dedup[dedup.length - 1] = point;
    else dedup.push(point);
  });
  return dedup;
}

function areaSign(delta: number): number {
  if (!Number.isFinite(delta) || Math.abs(delta) <= AREA_EPS) return 0;
  return delta > 0 ? 1 : -1;
}

function areaCrossing(a: AreaPoint, b: AreaPoint): AreaPoint {
  const denom = a.d - b.d;
  const frac = denom === 0 ? 0 : Math.min(1, Math.max(0, a.d / denom));
  const p = Math.exp(Math.log(a.p) + frac * (Math.log(b.p) - Math.log(a.p)));
  const tEnv = a.tEnv + frac * (b.tEnv - a.tEnv);
  const tState = a.tState + frac * (b.tState - a.tState);
  const t = (tEnv + tState) / 2;
  return { p, tEnv: t, tState: t, d: 0 };
}

export function buildBuoyancyAreas(tempPts: ThermoPoint[], statePts: ThermoPoint[]): BuoyancyArea[] {
  const env = normalizeProfile(tempPts);
  const parcel = normalizeProfile(statePts);
  if (env.length < 2 || parcel.length < 2) return [];
  const pHi = Math.min(env[0].p, parcel[0].p);
  const pLo = Math.max(env[env.length - 1].p, parcel[parcel.length - 1].p);
  if (!(pHi > pLo)) return [];

  const pressures = [pHi, pLo];
  env.forEach((d) => {
    if (d.p < pHi && d.p > pLo) pressures.push(d.p);
  });
  parcel.forEach((d) => {
    if (d.p < pHi && d.p > pLo) pressures.push(d.p);
  });
  pressures.sort((a, b) => b - a);
  const levels: number[] = [];
  pressures.forEach((p) => {
    const prev = levels[levels.length - 1];
    if (!prev || Math.abs(Math.log(prev) - Math.log(p)) > 1e-6) levels.push(p);
  });

  const samples: AreaPoint[] = [];
  levels.forEach((p) => {
    const tEnv = interpTempAtP(env, p);
    const tState = interpTempAtP(parcel, p);
    if (tEnv == null || tState == null) return;
    samples.push({ p, tEnv, tState, d: tState - tEnv });
  });
  if (samples.length < 2) return [];

  const segments: Array<{ sign: number; pts: AreaPoint[] }> = [];
  let cur: { sign: number; pts: AreaPoint[] } | null = null;
  let anchor: AreaPoint | null = null;
  const closeCur = () => {
    if (cur && cur.pts.length >= 2) segments.push(cur);
    cur = null;
  };

  samples.forEach((s) => {
    const sg = areaSign(s.d);
    if (sg === 0) {
      const z = { p: s.p, tEnv: s.tEnv, tState: s.tEnv, d: 0 };
      if (cur) {
        cur.pts.push(z);
        closeCur();
      }
      anchor = z;
      return;
    }
    if (!cur) {
      cur = { sign: sg, pts: anchor ? [anchor, s] : [s] };
      anchor = null;
      return;
    }
    if (sg !== cur.sign) {
      const x = areaCrossing(cur.pts[cur.pts.length - 1], s);
      cur.pts.push(x);
      closeCur();
      cur = { sign: sg, pts: [x, s] };
      anchor = null;
      return;
    }
    cur.pts.push(s);
    anchor = null;
  });
  closeCur();

  let seenPositive = false;
  const areas: BuoyancyArea[] = [];
  segments.forEach((seg) => {
    let kind: BuoyancyArea["kind"];
    if (seg.sign > 0) {
      kind = "cape";
      seenPositive = true;
    } else if (!seenPositive) {
      kind = "cin";
    } else {
      kind = "upper";
    }
    areas.push({ kind, pts: seg.pts });
  });
  return areas;
}
