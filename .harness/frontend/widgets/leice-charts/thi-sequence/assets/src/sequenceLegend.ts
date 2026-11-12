/**
 * One color bar per visible THI fill.
 * Strip and tick geometry follow the thi ValueColorBar.
 */

import { layerVisible, type SequenceLayer } from "./sequenceData";
import type { SequenceColorMode } from "./sequenceColor";

export interface ColorScaleSpec {
  key: string;
  name: string;
  unit: string;
  breakpoints: number[];
  colors: string[];
  colorMode: SequenceColorMode;
  opacity: number;
}

export interface ScaleOverride {
  colorMode: SequenceColorMode;
  breakpoints: number[];
  colors: string[];
  opacity: number;
  tickSide: "left" | "right";
  tickGap: number;
}

export interface ColorTick {
  key: string;
  label: string;
  position: number;
  align: "start" | "center" | "end";
}

export function fillColorScales(layers: SequenceLayer[]): ColorScaleSpec[] {
  const scales: ColorScaleSpec[] = [];
  for (const layer of layers) {
    if (!layerVisible(layer) || layer.drawType !== "fill") continue;
    const colors = (layer.colors || []).filter((item) => typeof item === "string" && item.length > 0);
    const breakpoints = (layer.breakpoints || []).map((item) => Number(item)).filter((item) => Number.isFinite(item));
    if (colors.length < 1 || breakpoints.length < 2) continue;
    const opacity = Number(layer.opacity);
    scales.push({
      key: layer.key,
      name: layer.name || layer.key,
      unit: layer.unit || "",
      breakpoints,
      colors,
      colorMode: layer.colorType === "linear" ? "linear" : "threshold",
      opacity: Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 0.7,
    });
  }
  return scales;
}

export function fitLegendBreakpoints(mode: SequenceColorMode, colors: string[], breakpoints: number[]): number[] {
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

export function evenLegendBreakpoints(breakpoints: number[]): number[] {
  const points = breakpoints.map((item) => Number(item));
  if (points.length < 2 || points.some((item) => !Number.isFinite(item))) return breakpoints.slice();
  const min = points[0];
  const max = points[points.length - 1];
  const step = (max - min) / (points.length - 1);
  return points.map((_, index) => Number((min + step * index).toPrecision(8)));
}

export function isSteppedScale(mode: SequenceColorMode, breakpoints: number[], colors: string[]): boolean {
  return mode === "threshold" && breakpoints.length === colors.length + 1 && colors.length >= 2;
}

function formatTick(value: number): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const text = value.toFixed(digits);
  return text.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function colorStrip(colors: string[], breakpoints: number[], mode: SequenceColorMode, direction: "to top" | "to right"): string {
  if (colors.length === 1) return colors[0];
  if (isSteppedScale(mode, breakpoints, colors)) {
    const stops = colors.flatMap((color, index) => {
      const start = ((index / colors.length) * 100).toFixed(4);
      const end = (((index + 1) / colors.length) * 100).toFixed(4);
      return [`${color} ${start}%`, `${color} ${end}%`];
    });
    return `linear-gradient(${direction}, ${stops.join(", ")})`;
  }
  const min = breakpoints[0];
  const max = breakpoints[breakpoints.length - 1];
  const span = max - min || 1;
  const count = Math.min(colors.length, breakpoints.length);
  const stops = Array.from({ length: count }, (_, index) => {
    const offset = ((breakpoints[index] - min) / span) * 100;
    return `${colors[index]} ${Math.min(100, Math.max(0, offset)).toFixed(4)}%`;
  });
  return `linear-gradient(${direction}, ${stops.join(", ")})`;
}

export function colorTicks(colors: string[], breakpoints: number[], mode: SequenceColorMode): ColorTick[] {
  const stepped = isSteppedScale(mode, breakpoints, colors);
  return breakpoints.map((value, index) => {
    const ratio = stepped
      ? index / colors.length
      : (value - breakpoints[0]) / ((breakpoints[breakpoints.length - 1] - breakpoints[0]) || 1);
    const position = Math.min(100, Math.max(0, ratio * 100));
    const align: ColorTick["align"] = index === 0 ? "start" : index === breakpoints.length - 1 ? "end" : "center";
    return {
      key: `${index}-${value}`,
      label: formatTick(value),
      position,
      align,
    };
  });
}
