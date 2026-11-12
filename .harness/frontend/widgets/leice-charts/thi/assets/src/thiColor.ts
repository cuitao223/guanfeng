import { scaleLinear, scaleThreshold } from "d3";

export type ThiColorMode = "linear" | "threshold";

/**
 * linear：断点与颜色等长，clamp 线性插值。
 * threshold：断点比颜色多 1 个，用区间色，不在断点之间插值。
 */
export function buildThiColorScale(breakpoints: number[], colors: string[], mode: ThiColorMode) {
  const domain = breakpoints.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  const range = colors.slice();
  if (mode === "threshold" && domain.length >= 3 && range.length === domain.length - 1) {
    return scaleThreshold<number, string>().domain(domain.slice(1, -1)).range(range);
  }
  if (domain.length >= 2 && range.length >= 2) {
    const count = Math.min(domain.length, range.length);
    return scaleLinear<string>().domain(domain.slice(0, count)).range(range.slice(0, count)).clamp(true);
  }
  return scaleLinear<string>().domain([0, 1]).range(range.length ? [range[0], range[range.length - 1]] : ["#000000", "#ffffff"]).clamp(true);
}
