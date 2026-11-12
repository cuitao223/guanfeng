import { buildFluxColorScale, type FluxColorMode } from "./fluxColor";
import { isLidarMissingCell } from "./lidarMissing";

export const MOLAR_MASS = 44.01;
export const FLUX_COLORS = ["#2B327E", "#313695", "#3A4A9D", "#5A6DB8", "#A3C5E0", "#F1EAEA", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"];
export const VERTICAL_BREAKS = [-200, -160, -120, -80, -40, 0, 40, 80, 120, 160, 200];
export const HORIZONTAL_BREAKS = [-500, -400, -300, -200, -100, 0, 100, 200, 300, 400, 500];

export type FluxUnit = "mass" | "mole";
export type FluxDirection = "vertical" | "east" | "north";

export interface FluxBar {
  t: number;
  value: number;
}

export function fluxBreaks(direction: FluxDirection): number[] {
  return direction === "vertical" ? VERTICAL_BREAKS : HORIZONTAL_BREAKS;
}

export function fluxTitle(direction: FluxDirection): string {
  if (direction === "east") return "总东西通量";
  if (direction === "north") return "总南北通量";
  return "总垂直通量";
}

export function fluxUnitLabel(unit: FluxUnit): string {
  return unit === "mole" ? "μmol m-2 s-1" : "μg m-2 s-1";
}

/** Mass input divides by 44.01 for mole. Mole input multiplies by 44.01 for mass. */
export function fluxDisplayValue(raw: number, inputUnit: FluxUnit, displayUnit: FluxUnit): number {
  if (inputUnit === displayUnit) return raw;
  if (inputUnit === "mass") return raw / MOLAR_MASS;
  return raw * MOLAR_MASS;
}

export function fluxValue(raw: number, unit: FluxUnit): number {
  return fluxDisplayValue(raw, "mass", unit);
}

export function fluxBars(
  timeArr: unknown[],
  values: unknown[],
  inputUnit: FluxUnit = "mass",
  displayUnit: FluxUnit = inputUnit,
): FluxBar[] {
  const count = Math.min(timeArr.length, values.length);
  const bars: FluxBar[] = [];
  for (let index = 0; index < count; index += 1) {
    const time = Number(timeArr[index]);
    if (!Number.isFinite(time) || isLidarMissingCell(values[index])) continue;
    const ms = time < 1e12 ? time * 1000 : time;
    bars.push({ t: ms, value: fluxDisplayValue(Number(values[index]), inputUnit, displayUnit) });
  }
  return bars;
}

export function fluxPeak(bars: FluxBar[]): number {
  const peak = bars.reduce((max, bar) => Math.max(max, Math.abs(bar.value)), 0);
  return peak > 0 ? peak * 1.1 : 1;
}

export function fluxColor(
  value: number,
  direction: FluxDirection = "vertical",
  mode: FluxColorMode = "linear",
  breakpoints: number[] = fluxBreaks(direction),
  colors: string[] = FLUX_COLORS,
): string {
  const scale = buildFluxColorScale(breakpoints, colors, mode);
  return String(scale(value));
}
