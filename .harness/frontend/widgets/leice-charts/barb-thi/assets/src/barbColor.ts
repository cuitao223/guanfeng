import { scaleLinear, scaleThreshold } from "d3";

export type BarbColorMode = "linear" | "threshold";

/** 色标算法和时高图共用同一套断点规则。 */

export function buildBarbColorScale(breakpoints: number[], colors: string[], mode: BarbColorMode) {
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
