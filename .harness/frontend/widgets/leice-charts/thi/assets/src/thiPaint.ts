import { bilinearSampleThiGrid, nearestSampleThiGrid, timeSecInGaps, type ThiGrid } from "./thiGrid";
import type { ThiColorMode } from "./thiColor";

/** 屏幕采样上限。绘制耗时随像素变化，不随原始格子数线性增长。 */
export const THI_BITMAP_MAX_WIDTH = 480;
export const THI_BITMAP_MAX_HEIGHT = 320;

export interface ThiSampleOptions {
  width: number;
  height: number;
  timeStart: number;
  timeEnd: number;
  heightMin: number;
  heightMax: number;
  gaps: Array<[number, number]>;
  colorMode: ThiColorMode;
  colorOf: (value: number) => [number, number, number] | null;
}

export interface ThiSampleResult {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  drawn: number;
}

export function bitmapSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, THI_BITMAP_MAX_WIDTH / width, THI_BITMAP_MAX_HEIGHT / height);
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

export function sampleThiBitmap(grid: ThiGrid, options: ThiSampleOptions): ThiSampleResult {
  const size = bitmapSize(options.width, options.height);
  const pixels = new Uint8ClampedArray(size.width * size.height * 4);
  const timeSpan = options.timeEnd - options.timeStart;
  const heightSpan = options.heightMax - options.heightMin;
  if (!(timeSpan > 0) || !(heightSpan > 0) || grid.times.length < 1 || grid.heights.length < 1) {
    return { width: size.width, height: size.height, pixels, drawn: 0 };
  }
  const smooth = options.colorMode === "linear" && grid.times.length >= 2 && grid.heights.length >= 2;
  let drawn = 0;
  for (let py = 0; py < size.height; py += 1) {
    const height = options.heightMax - ((py + 0.5) / size.height) * heightSpan;
    for (let px = 0; px < size.width; px += 1) {
      const timeSec = options.timeStart + ((px + 0.5) / size.width) * timeSpan;
      if (timeSecInGaps(timeSec, options.gaps)) continue;
      const lastTime = grid.times[grid.times.length - 1];
      const sampleTime = timeSec > lastTime ? lastTime : timeSec;
      const value = smooth
        ? bilinearSampleThiGrid(grid, sampleTime, height)
        : nearestSampleThiGrid(grid, sampleTime, height);
      if (value == null) continue;
      const rgb = options.colorOf(value);
      if (!rgb) continue;
      const offset = (py * size.width + px) * 4;
      pixels[offset] = rgb[0];
      pixels[offset + 1] = rgb[1];
      pixels[offset + 2] = rgb[2];
      pixels[offset + 3] = 255;
      drawn += 1;
    }
  }
  return { width: size.width, height: size.height, pixels, drawn };
}
