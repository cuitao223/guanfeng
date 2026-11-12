import { scaleLinear, scaleThreshold } from "d3";

export type SequenceColorMode = "linear" | "threshold";

export function buildSequenceColorScale(breakpoints: number[], colors: string[], mode: SequenceColorMode) {
  const domain = breakpoints.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  const range = colors.slice();
  if (mode === "threshold" && domain.length >= 3 && range.length === domain.length - 1) {
    return scaleThreshold<number, string>().domain(domain.slice(1, -1)).range(range);
  }
  if (domain.length >= 2 && range.length >= 2) {
    const count = Math.min(domain.length, range.length);
    return scaleLinear<string>().domain(domain.slice(0, count)).range(range.slice(0, count)).clamp(true);
  }
  return null;
}
