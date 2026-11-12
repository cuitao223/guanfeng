import { scaleLinear, scaleThreshold } from "d3";

export type FluxColorMode = "linear" | "threshold";

export function buildFluxColorScale(breakpoints: number[], colors: string[], mode: FluxColorMode): (value: number) => string {
  const domain = breakpoints.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  const range = colors.slice();
  if (mode === "threshold" && domain.length >= 3 && range.length === domain.length - 1) {
    const scale = scaleThreshold<number, string>().domain(domain.slice(1, -1)).range(range);
    return (value: number) => String(scale(value));
  }
  if (domain.length >= 2 && range.length >= 2) {
    const count = Math.min(domain.length, range.length);
    const stops = domain.slice(0, count);
    const paints = range.slice(0, count);
    const scale = scaleLinear<string>().domain(stops).range(paints).clamp(true);
    return (value: number) => {
      if (value <= stops[0]) return paints[0];
      if (value >= stops[stops.length - 1]) return paints[paints.length - 1];
      const index = stops.indexOf(value);
      if (index >= 0) return paints[index];
      return String(scale(value));
    };
  }
  const fallback = range.length ? [range[0], range[range.length - 1] || range[0]] : ["#000000", "#ffffff"];
  const scale = scaleLinear<string>().domain([0, 1]).range(fallback).clamp(true);
  return (value: number) => String(scale(value));
}

export function fitFluxBreakpoints(mode: FluxColorMode, colors: string[], breakpoints: number[]): number[] {
  const points = breakpoints.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  const target = mode === "threshold" ? colors.length + 1 : Math.max(colors.length, 2);
  if (points.length < 2 || target < 2) return points;
  while (points.length < target) {
    const step = points[points.length - 1] - points[points.length - 2] || 1;
    points.push(points[points.length - 1] + step);
  }
  if (points.length > target) points.splice(target);
  return points;
}

export function evenFluxBreakpoints(breakpoints: number[]): number[] {
  const points = breakpoints.map((item) => Number(item));
  if (points.length < 2 || points.some((item) => !Number.isFinite(item))) return breakpoints.slice();
  const min = points[0];
  const max = points[points.length - 1];
  const step = (max - min) / (points.length - 1);
  return points.map((_, index) => Number((min + step * index).toPrecision(8)));
}
