export interface PlotWindow {
  timeStart: number;
  timeEnd: number;
  heightMin: number;
  heightMax: number;
}

export interface PlotBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DragBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** 把框选矩形换算成当前视窗内的时间、高度范围。框太小则忽略。 */
export function windowFromDrag(current: PlotWindow, plot: PlotBox, drag: DragBox): PlotWindow | null {
  const x0 = Math.min(drag.x0, drag.x1);
  const x1 = Math.max(drag.x0, drag.x1);
  const y0 = Math.min(drag.y0, drag.y1);
  const y1 = Math.max(drag.y0, drag.y1);
  if (x1 - x0 < 8 || y1 - y0 < 8) return null;
  const timeSpan = current.timeEnd - current.timeStart;
  const heightSpan = current.heightMax - current.heightMin;
  if (!(timeSpan > 0) || !(heightSpan > 0) || !(plot.width > 0) || !(plot.height > 0)) return null;
  const timeStart = current.timeStart + ((x0 - plot.left) / plot.width) * timeSpan;
  const timeEnd = current.timeStart + ((x1 - plot.left) / plot.width) * timeSpan;
  const heightMax = current.heightMax - ((y0 - plot.top) / plot.height) * heightSpan;
  const heightMin = current.heightMax - ((y1 - plot.top) / plot.height) * heightSpan;
  if (!(timeEnd > timeStart) || !(heightMax > heightMin)) return null;
  return { timeStart, timeEnd, heightMin, heightMax };
}

/** 悬停时间：本地 MM-DD HH:mm:ss。 */
export function formatThiTipTime(unixSec: number): string {
  if (!Number.isFinite(unixSec)) return "";
  const date = new Date(unixSec * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 悬停时间：本地 YYYY-MM-DD HH:mm:ss。 */
export function formatThiFullTime(unixSec: number): string {
  if (!Number.isFinite(unixSec)) return "";
  const date = new Date(unixSec * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 滚轮倍率 1.15，最大放大 5 倍，双轴同一倍率。 */
export const THI_WHEEL_ZOOM_FACTOR = 1.15;
export const THI_MAX_VIEW_ZOOM = 5;

export function shiftIntervalWithinBase(lo: number, hi: number, baseLo: number, baseHi: number): [number, number] {
  const span = hi - lo;
  if (!(span > 0) || !(baseHi > baseLo)) return [baseLo, baseHi];
  let start = lo;
  let end = hi;
  if (start < baseLo) {
    start = baseLo;
    end = start + span;
  }
  if (end > baseHi) {
    end = baseHi;
    start = end - span;
  }
  if (start < baseLo) start = baseLo;
  return [start, end];
}

export function wheelZoomWindow(
  base: PlotWindow,
  current: PlotWindow,
  anchorTime: number,
  anchorHeight: number,
  deltaY: number
): { reset: boolean; window: PlotWindow } {
  const zoomingOut = deltaY > 0;
  let factor = zoomingOut ? THI_WHEEL_ZOOM_FACTOR : 1 / THI_WHEEL_ZOOM_FACTOR;
  const baseTime = base.timeEnd - base.timeStart;
  const baseHeight = base.heightMax - base.heightMin;
  const currentTime = current.timeEnd - current.timeStart;
  const currentHeight = current.heightMax - current.heightMin;
  if (!(baseTime > 0) || !(baseHeight > 0) || !(currentTime > 0) || !(currentHeight > 0)) {
    return { reset: false, window: current };
  }
  const minTime = baseTime / THI_MAX_VIEW_ZOOM;
  const minHeight = baseHeight / THI_MAX_VIEW_ZOOM;
  if (zoomingOut) {
    const maxGrow = Math.min(baseTime / currentTime, baseHeight / currentHeight);
    if (maxGrow <= 1.001) return { reset: true, window: base };
    factor = Math.min(factor, maxGrow);
  } else {
    const minFactor = Math.max(minTime / currentTime, minHeight / currentHeight);
    if (minFactor >= 0.999) return { reset: false, window: current };
    factor = Math.max(factor, minFactor);
  }
  let timeStart = anchorTime - (anchorTime - current.timeStart) * factor;
  let timeEnd = anchorTime + (current.timeEnd - anchorTime) * factor;
  let heightMin = anchorHeight - (anchorHeight - current.heightMin) * factor;
  let heightMax = anchorHeight + (current.heightMax - anchorHeight) * factor;
  [timeStart, timeEnd] = shiftIntervalWithinBase(timeStart, timeEnd, base.timeStart, base.timeEnd);
  [heightMin, heightMax] = shiftIntervalWithinBase(heightMin, heightMax, base.heightMin, base.heightMax);
  const reset = Math.abs(timeStart - base.timeStart) < 1
    && Math.abs(timeEnd - base.timeEnd) < 1
    && Math.abs(heightMin - base.heightMin) < 1e-6
    && Math.abs(heightMax - base.heightMax) < 1e-6;
  return {
    reset,
    window: { timeStart, timeEnd, heightMin, heightMax },
  };
}

/** 向右拖视口时间减小，向下拖高度范围上移。 */
export function panWindow(
  base: PlotWindow,
  current: PlotWindow,
  dx: number,
  dy: number,
  plotWidth: number,
  plotHeight: number
): { reset: boolean; window: PlotWindow } {
  if (!(plotWidth > 0) || !(plotHeight > 0)) return { reset: false, window: current };
  const timeSpan = current.timeEnd - current.timeStart;
  const heightSpan = current.heightMax - current.heightMin;
  const next = {
    timeStart: current.timeStart - dx * (timeSpan / plotWidth),
    timeEnd: current.timeEnd - dx * (timeSpan / plotWidth),
    heightMin: current.heightMin + dy * (heightSpan / plotHeight),
    heightMax: current.heightMax + dy * (heightSpan / plotHeight),
  };
  const [timeStart, timeEnd] = shiftIntervalWithinBase(next.timeStart, next.timeEnd, base.timeStart, base.timeEnd);
  const [heightMin, heightMax] = shiftIntervalWithinBase(next.heightMin, next.heightMax, base.heightMin, base.heightMax);
  const reset = Math.abs(timeStart - base.timeStart) < 1
    && Math.abs(timeEnd - base.timeEnd) < 1
    && Math.abs(heightMin - base.heightMin) < 1e-6
    && Math.abs(heightMax - base.heightMax) < 1e-6;
  return { reset, window: { timeStart, timeEnd, heightMin, heightMax } };
}
