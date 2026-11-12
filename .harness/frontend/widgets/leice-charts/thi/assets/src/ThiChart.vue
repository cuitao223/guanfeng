<template>
  <div ref="wrap" class="thi-chart" :class="themeClass" :style="frameStyle">
    <div class="thi-toolbar">
      <button type="button" class="thi-tool thi-tool--zoom" :class="{ 'is-active': zooming }" title="框选缩放" @click="zooming = !zooming">
        <span class="thi-tool__icon" v-html="zoomIcon"></span>
      </button>
      <button type="button" class="thi-tool" title="还原缩放" @click="resetZoom">
        <img class="reg" :src="refreshReg" alt="" />
        <img class="hover" :src="refreshHover" alt="" />
      </button>
      <button type="button" class="thi-tool" title="图片下载" :disabled="downloading" @click="download">
        <img class="reg" :src="downloadReg" alt="" />
        <img class="hover" :src="downloadHover" alt="" />
      </button>
      <button type="button" class="thi-tool" title="设置" @click="openSettings">
        <img class="reg" :src="setReg" alt="" />
        <img class="hover" :src="setHover" alt="" />
      </button>
    </div>
    <div ref="figure" class="thi-figure" :class="legendPlace === 'right' ? 'is-right' : 'is-bottom'">
      <div
        ref="plot"
        class="thi-plot"
        :class="{ 'is-zoom': zooming, 'is-pan': panning }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerLeave"
      >
        <canvas ref="heat" class="thi-heat"></canvas>
        <svg ref="axes" class="thi-axes"></svg>
        <svg class="thi-cross" aria-hidden="true">
          <line v-show="cross.show" class="cross-y" :x1="cross.x" :x2="cross.x" :y1="cross.y1" :y2="cross.y2" />
          <line v-show="cross.show" class="cross-x" :x1="cross.x1" :x2="cross.x2" :y1="cross.y" :y2="cross.y" />
        </svg>
        <div v-show="empty" class="thi-empty">无数据</div>
        <div
          v-show="tip.show"
          ref="tipEl"
          class="chart-tooltip"
          :style="{ left: tip.left + 'px', top: tip.top + 'px' }"
        >
          <div class="tip-time">{{ tip.time }}</div>
          <div v-if="tip.empty" class="tip-empty">无数据</div>
          <template v-else>
            <div class="tip-group-title">{{ tip.title }}</div>
            <div v-for="row in tip.rows" :key="row.label" class="tip-row">
              <span class="tip-dot" :style="{ background: row.color }"></span>
              <span class="tip-label">{{ row.label }}</span>
              <span class="tip-value">{{ row.value }}</span>
            </div>
          </template>
        </div>
        <div v-if="drag" class="thi-brush" :style="brushStyle"></div>
      </div>
      <ValueColorBar
        :colors="activeColors"
        :breakpoints="activeBreakpoints"
        :color-mode="activeMode"
        :unit="props.unit"
        :placement="legendPlace"
        :tick-side="tickSide"
        :tick-gap="tickGap"
        @open-settings="openLegend"
      />
    </div>
    <el-dialog
      v-model="settingsOpen"
      title="高度范围"
      width="420px"
      append-to-body
      :close-on-click-modal="false"
      :class="dialogClass"
    >
      <div class="height-slider-wrap">
        <span class="height-val">{{ draftHeight[0] }}</span>
        <el-slider
          v-model="draftHeight"
          range
          :min="sliderBounds.min"
          :max="sliderBounds.max"
          :step="heightSliderStep"
          :show-tooltip="true"
          class="height-slider"
          @input="onHeightSlide"
        />
        <span class="height-val">{{ draftHeight[1] }}</span>
      </div>
      <template #footer>
        <el-button size="small" @click="factoryReset">恢复出厂</el-button>
        <el-button size="small" @click="settingsOpen = false">取消</el-button>
        <el-button size="small" type="primary" @click="applySettings">应用</el-button>
      </template>
    </el-dialog>
    <el-dialog
      v-model="legendOpen"
      title="色标配置"
      width="520px"
      append-to-body
      :close-on-click-modal="false"
      :class="dialogClass"
    >
      <div class="legend-settings__section">
        <div class="legend-settings__section-title">填色方式</div>
        <el-radio-group v-model="draftLegendMode" size="small" @change="fitDraftMode()">
          <el-radio-button label="linear">平滑（渐变）</el-radio-button>
          <el-radio-button label="threshold">等值线</el-radio-button>
        </el-radio-group>
      </div>
      <div class="legend-settings__section">
        <div class="legend-settings__section-title">色标位置</div>
        <el-radio-group v-model="draftPlacement" size="small">
          <el-radio-button label="right">右侧</el-radio-button>
          <el-radio-button label="bottom">底部</el-radio-button>
        </el-radio-group>
      </div>
      <div v-if="draftPlacement === 'right'" class="legend-settings__section">
        <div class="legend-settings__section-title">刻度位置</div>
        <el-radio-group v-model="draftTickSide" size="small">
          <el-radio-button label="left">色带左侧</el-radio-button>
          <el-radio-button label="right">色带右侧</el-radio-button>
        </el-radio-group>
      </div>
      <div v-if="draftPlacement === 'right'" class="legend-settings__section">
        <div class="legend-settings__section-title">色带间距</div>
        <div class="legend-settings__opacity-row">
          <el-slider v-model="draftTickGap" :min="0" :max="24" :step="1" :show-tooltip="true" class="legend-settings__opacity-slider" />
          <span class="legend-settings__opacity-value">{{ draftTickGap }}px</span>
        </div>
      </div>
      <div class="legend-settings__section">
        <div class="legend-settings__section-title">图层透明度</div>
        <div class="legend-settings__opacity-row">
          <el-slider v-model="draftOpacity" :min="0" :max="100" :step="1" :show-tooltip="true" class="legend-settings__opacity-slider" />
          <span class="legend-settings__opacity-value">{{ draftOpacity }}%</span>
        </div>
      </div>
      <div class="legend-settings__section">
        <div class="legend-settings__section-title">自定义配色（{{ draftColors.length }} 档）</div>
        <div class="legend-settings__bands">
          <div v-for="(color, index) in draftColors" :key="'color-' + index" class="legend-settings__band">
            <span class="legend-settings__band-label">{{ index + 1 }}</span>
            <el-input-number v-model="draftBreakpoints[index]" :step="0.1" size="small" controls-position="right" class="legend-settings__band-input" />
            <el-color-picker v-model="draftColors[index]" size="small" />
          </div>
          <div v-if="draftLegendMode === 'threshold' && draftBreakpoints.length > draftColors.length" class="legend-settings__band">
            <span class="legend-settings__band-label">最大</span>
            <el-input-number v-model="draftBreakpoints[draftBreakpoints.length - 1]" :step="0.1" size="small" controls-position="right" class="legend-settings__band-input" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="legend-settings__footer">
          <el-button size="small" @click="evenLegend">均分断档</el-button>
          <el-button size="small" @click="resetLegend">恢复出厂</el-button>
          <span class="legend-settings__footer-spacer"></span>
          <el-button size="small" @click="legendOpen = false">取消</el-button>
          <el-button size="small" type="primary" @click="applyLegend">应用</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from "vue";
import * as d3 from "d3";
import { ElButton, ElColorPicker, ElDialog, ElInputNumber, ElRadioButton, ElRadioGroup, ElSlider } from "element-plus";
import "element-plus/dist/index.css";
import ValueColorBar from "./ValueColorBar.vue";
import { buildThiColorScale, type ThiColorMode } from "./thiColor";
import { downloadThiFigure } from "./thiExport";
import {
  buildThiGrid,
  buildThiMissingGaps,
  findTimeGap,
  hasDrawablePoint,
  snapThiSample,
  THI_MISSING_GAP_SEC,
  type ThiGrid,
} from "./thiGrid";
import { sampleThiBitmap } from "./thiPaint";
import { thiTimeToDate } from "./thiTime";
import { formatThiFullTime, panWindow, wheelZoomWindow, windowFromDrag, type DragBox, type PlotWindow } from "./thiView";
import { resolvePalette, type ThiPalette, type ThiThemeName } from "./themes";
import zoomIcon from "./icons/chart-zoom.svg?raw";
import refreshReg from "./icons/btn_drawing_refresh_reg.svg";
import refreshHover from "./icons/btn_drawing_refresh_hover.svg";
import downloadReg from "./icons/btn_drawing_download_reg.svg";
import downloadHover from "./icons/btn_drawing_download_hover.svg";
import setReg from "./icons/btn_drawing_set_reg.svg";
import setHover from "./icons/btn_drawing_set_hover.svg";

const MARGIN = { top: 12, right: 8, bottom: 52, left: 72 };
const MIN_SIZE = 100;
const TICK_LABEL_SAMPLE = "0000-00-00";

function timeTickLabelWidth(): number {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return 72;
  context.font = "11px sans-serif";
  return Math.ceil(context.measureText(TICK_LABEL_SAMPLE).width);
}

function spacedTimeTicks(scale: d3.ScaleTime<number, number>): Date[] {
  const [rangeStart, rangeEnd] = scale.range();
  const label = timeTickLabelWidth();
  const pad = 12;
  const edgeGap = Math.ceil(label * 1.5 + pad);
  const innerGap = label + pad;
  const room = Math.max(0, rangeEnd - rangeStart);
  const target = Math.max(2, Math.min(6, Math.floor(room / innerGap) || 2));
  const candidates = scale.ticks(target).filter((tick) => {
    const px = scale(tick);
    return px >= rangeStart - 0.5 && px <= rangeEnd + 0.5;
  });
  const kept: Date[] = [];
  candidates.forEach((tick, index) => {
    const px = scale(tick);
    if (!kept.length) {
      kept.push(tick);
      return;
    }
    const prev = scale(kept[kept.length - 1]);
    const isLast = index === candidates.length - 1;
    const gap = kept.length === 1 || isLast ? edgeGap : innerGap;
    if (px - prev >= gap) {
      kept.push(tick);
      return;
    }
    if (isLast && kept.length > 1 && px - scale(kept[kept.length - 2]) >= edgeGap) {
      kept[kept.length - 1] = tick;
    }
  });
  return kept.length ? kept : candidates.slice(0, 1);
}

function dropOverlappingTickLabels(group: d3.Selection<SVGGElement, unknown, null, undefined>): void {
  let right = Number.NEGATIVE_INFINITY;
  group.selectAll<SVGGElement, unknown>("g.tick").each(function () {
    const text = this.querySelector("text");
    if (!text) return;
    const box = text.getBoundingClientRect();
    if (box.width > 0 && box.left < right + 8) {
      text.remove();
      return;
    }
    right = Math.max(right, box.right);
  });
}

const props = withDefaults(defineProps<{
  times?: unknown[];
  heightArr?: unknown[];
  values?: unknown[][];
  windpara?: number[][];
  breakpoints?: number[];
  colors?: string[];
  colorMode?: ThiColorMode;
  heightMin?: number | null;
  heightMax?: number | null;
  unit?: string;
  theme?: ThiThemeName;
  palette?: Partial<ThiPalette> | null;
  legendPlacement?: "right" | "bottom";
}>(), {
  times: () => [],
  heightArr: () => [],
  values: () => [],
  windpara: () => [],
  breakpoints: () => [0, 10],
  colors: () => ["#1d4e89", "#f2e6c2"],
  colorMode: "linear",
  heightMin: null,
  heightMax: null,
  unit: "",
  theme: "dark",
  palette: null,
  legendPlacement: "right",
});

const wrap = ref<HTMLDivElement | null>(null);
const figure = ref<HTMLDivElement | null>(null);
const plot = ref<HTMLDivElement | null>(null);
const heat = ref<HTMLCanvasElement | null>(null);
const axes = ref<SVGSVGElement | null>(null);
const empty = ref(true);
const zooming = ref(false);
const panning = ref(false);
const downloading = ref(false);
const settingsOpen = ref(false);
const legendOpen = ref(false);
const cached = shallowRef<ThiGrid | null>(null);
const view = ref<PlotWindow | null>(null);
const drag = ref<DragBox | null>(null);
const appliedHeight = ref<{ min: number; max: number } | null>(null);
const appliedInterval = ref<number | null>(null);
const appliedMode = ref<ThiColorMode | null>(null);
const appliedBreakpoints = ref<number[] | null>(null);
const appliedColors = ref<string[] | null>(null);
const appliedPlacement = ref<"right" | "bottom" | null>(null);
const appliedTickSide = ref<"left" | "right" | null>(null);
const appliedTickGap = ref<number | null>(null);
const fillOpacity = ref(1);
const draftHeight = ref<number[]>([0, 1]);
const draftLegendMode = ref<ThiColorMode>("linear");
const draftPlacement = ref<"right" | "bottom">("right");
const draftTickSide = ref<"left" | "right">("right");
const draftTickGap = ref(8);
const draftOpacity = ref(100);
const draftColors = ref<string[]>([]);
const draftBreakpoints = ref<number[]>([]);
const tipEl = ref<HTMLDivElement | null>(null);
const tip = reactive({
  show: false,
  left: 0,
  top: 0,
  time: "",
  title: "",
  empty: false,
  rows: [] as Array<{ label: string; value: string; color: string }>,
});
const cross = reactive({ show: false, x: 0, y: 0, x1: 0, x2: 0, y1: 0, y2: 0 });
let resizeObserver: ResizeObserver | null = null;
let frame = 0;
let tipFrame = 0;
let offscreen: HTMLCanvasElement | null = null;
let pointer: { x: number; y: number } | null = null;
let panLast: { x: number; y: number } | null = null;
let wheelTarget: HTMLDivElement | null = null;

const themeClass = computed(() => (props.theme === "light" ? "is-light" : "is-dark"));
const dialogClass = computed(() => ["thi-ep-dialog", themeClass.value]);
const palette = computed(() => resolvePalette(props.theme, props.palette));
const activeMode = computed(() => appliedMode.value ?? props.colorMode);
const activeBreakpoints = computed(() => appliedBreakpoints.value ?? props.breakpoints);
const activeColors = computed(() => appliedColors.value ?? props.colors);
const legendPlace = computed(() => appliedPlacement.value ?? props.legendPlacement);
const tickSide = computed(() => appliedTickSide.value ?? "right");
const tickGap = computed(() => appliedTickGap.value ?? 8);
const sliderBounds = computed(() => {
  const grid = cached.value;
  if (!grid || !grid.heights.length) return { min: 0, max: 1 };
  let dataMin = Infinity;
  let dataMax = -Infinity;
  for (let index = 0; index < grid.heights.length; index += 1) {
    const height = grid.heights[index];
    if (height < dataMin) dataMin = height;
    if (height > dataMax) dataMax = height;
  }
  const min = props.heightMin ?? dataMin;
  const max = props.heightMax ?? dataMax;
  if (!(max > min)) return { min: dataMin, max: dataMax > dataMin ? dataMax : dataMin + 1 };
  return { min, max };
});
const heightSliderStep = computed(() => {
  const span = sliderBounds.value.max - sliderBounds.value.min;
  if (!(span > 0)) return 1;
  if (span <= 1) return span;
  const raw = span / 50;
  const power = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / power;
  const nice = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return Math.min(nice * power, span);
});
let lastHeight: [number, number] = [0, 1];
const frameStyle = computed(() => ({
  background: palette.value.frameBg,
  borderColor: palette.value.frameBorder,
  color: palette.value.label,
}));
const brushStyle = computed(() => {
  const box = drag.value;
  if (!box) return {};
  const left = Math.min(box.x0, box.x1);
  const top = Math.min(box.y0, box.y1);
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${Math.abs(box.x1 - box.x0)}px`,
    height: `${Math.abs(box.y1 - box.y0)}px`,
  };
});

function schedule(): void {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    paint();
  });
}

function rebuild(): void {
  cached.value = buildThiGrid(props.times, props.heightArr, props.values);
  view.value = null;
  schedule();
}

function fullWindow(grid: ThiGrid): PlotWindow | null {
  if (!grid.times.length || !grid.heights.length) return null;
  const fallbackMin = grid.heights[0];
  const fallbackMax = grid.heights[grid.heights.length - 1];
  const heightMin = appliedHeight.value?.min ?? props.heightMin ?? fallbackMin;
  const heightMax = appliedHeight.value?.max ?? props.heightMax ?? fallbackMax;
  if (!(heightMax > heightMin)) return null;
  return {
    timeStart: grid.times[0],
    timeEnd: grid.times[grid.times.length - 1] + THI_MISSING_GAP_SEC,
    heightMin,
    heightMax,
  };
}

function paint(): void {
  const host = plot.value;
  const canvas = heat.value;
  const svg = axes.value;
  const grid = cached.value;
  if (!host || !canvas || !svg || !grid) return;
  const width = host.clientWidth;
  const height = host.clientHeight;
  const ctx = canvas.getContext("2d");
  d3.select(svg).selectAll("*").remove();
  if (!ctx || width < MIN_SIZE || height < MIN_SIZE) return;
  canvas.width = width;
  canvas.height = height;
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  ctx.clearRect(0, 0, width, height);

  empty.value = !hasDrawablePoint(grid);
  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const base = fullWindow(grid);
  if (plotW <= 0 || plotH <= 0 || !base) return;
  const window = view.value ?? base;
  const x = d3.scaleTime()
    .domain([thiTimeToDate(window.timeStart), thiTimeToDate(window.timeEnd)])
    .range([MARGIN.left, MARGIN.left + plotW]);
  const y = d3.scaleLinear().domain([window.heightMin, window.heightMax]).range([MARGIN.top + plotH, MARGIN.top]);
  const color = buildThiColorScale(activeBreakpoints.value, activeColors.value, activeMode.value);
  const gaps = buildThiMissingGaps(grid, props.windpara);
  const rgbCache = new Map<number, [number, number, number] | null>();

  ctx.fillStyle = palette.value.plotBg;
  ctx.fillRect(MARGIN.left, MARGIN.top, plotW, plotH);
  if (!empty.value) {
    const bitmap = sampleThiBitmap(grid, {
      width: plotW,
      height: plotH,
      timeStart: window.timeStart,
      timeEnd: window.timeEnd,
      heightMin: window.heightMin,
      heightMax: window.heightMax,
      gaps,
      colorMode: activeMode.value,
      colorOf: (value) => cachedRgb(color, value, rgbCache),
    });
    if (!offscreen) offscreen = document.createElement("canvas");
    offscreen.width = bitmap.width;
    offscreen.height = bitmap.height;
    const offscreenContext = offscreen.getContext("2d");
    if (offscreenContext) {
      const image = offscreenContext.createImageData(bitmap.width, bitmap.height);
      image.data.set(bitmap.pixels);
      offscreenContext.putImageData(image, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = fillOpacity.value;
      ctx.drawImage(offscreen, MARGIN.left, MARGIN.top, plotW, plotH);
      ctx.globalAlpha = 1;
    }
    paintGaps(ctx, gaps, x, plotH);
  }

  const root = d3.select(svg);
  const xTicks = spacedTimeTicks(x);
  const xGroup = root.append("g")
    .attr("class", "axis--x")
    .attr("transform", `translate(0,${MARGIN.top + plotH})`)
    .call(d3.axisBottom(x).tickValues(xTicks).tickSizeOuter(0).tickFormat(() => ""));
  xGroup.selectAll<SVGGElement, Date>("g.tick").each(function (datum, index, nodes) {
    const text = d3.select(this).select("text");
    text.text(null);
    if (index === 0) text.attr("text-anchor", "start");
    else if (index === nodes.length - 1) text.attr("text-anchor", "end");
    text.append("tspan").attr("x", 0).attr("dy", "0.95em").text(d3.timeFormat("%Y-%m-%d")(datum));
    text.append("tspan").attr("x", 0).attr("dy", "1.6em").text(d3.timeFormat("%H:%M:%S")(datum));
  });
  root.append("g")
    .attr("class", "axis--x--top")
    .attr("transform", `translate(0,${MARGIN.top})`)
    .call(d3.axisTop(x).tickValues(xTicks).tickSize(0))
    .call((group) => group.selectAll(".tick text").remove());
  const interval = appliedInterval.value;
  const yTickValues = interval && interval > 0 && (window.heightMax - window.heightMin) / interval <= 12
    ? Array.from({ length: Math.floor((window.heightMax - window.heightMin) / interval) + 1 }, (_, index) => window.heightMin + index * interval)
    : y.ticks(5);
  const gridLines = root.append("g").attr("class", "thi-grid");
  for (const tick of xTicks) {
    const px = x(tick);
    gridLines.append("line").attr("x1", px).attr("x2", px).attr("y1", MARGIN.top).attr("y2", MARGIN.top + plotH);
  }
  for (const tick of yTickValues) {
    const py = y(tick);
    gridLines.append("line").attr("x1", MARGIN.left).attr("x2", MARGIN.left + plotW).attr("y1", py).attr("y2", py);
  }
  gridLines.selectAll("line")
    .attr("stroke", palette.value.gridStroke)
    .attr("stroke-opacity", palette.value.gridOpacity)
    .attr("stroke-dasharray", "4,4")
    .attr("pointer-events", "none");
  const yAxis = d3.axisLeft(y).tickSizeOuter(0).tickValues(yTickValues);
  root.append("g").attr("class", "axis--y").attr("transform", `translate(${MARGIN.left},0)`).call(yAxis);
  root.append("g")
    .attr("class", "axis--y--right")
    .attr("transform", `translate(${MARGIN.left + plotW},0)`)
    .call(d3.axisRight(y).tickSize(0))
    .call((group) => group.selectAll(".tick text").remove());
  root.append("rect")
    .attr("class", "thi-plot-border")
    .attr("x", MARGIN.left)
    .attr("y", MARGIN.top)
    .attr("width", Math.max(0, plotW))
    .attr("height", Math.max(0, plotH))
    .attr("fill", "none")
    .attr("stroke", palette.value.axis)
    .attr("stroke-width", 1)
    .attr("shape-rendering", "crispEdges");
  root.append("text")
    .attr("fill", palette.value.label)
    .attr("font-size", 11)
    .attr("text-anchor", "middle")
    .attr("transform", `translate(16,${MARGIN.top + plotH / 2}) rotate(-90)`)
    .text(props.unit ? `高度(m) / ${props.unit}` : "高度(m)");
  root.selectAll("text").attr("fill", palette.value.axisText).attr("font-size", 11);
  dropOverlappingTickLabels(xGroup);
  root.selectAll(".axis--x line, .axis--x path, .axis--y line, .axis--y path, .axis--x--top line, .axis--x--top path, .axis--y--right line, .axis--y--right path, .thi-plot-border")
    .attr("stroke", palette.value.axis);
}

function cachedRgb(
  color: { (value: number): string },
  value: number,
  cache: Map<number, [number, number, number] | null>
): [number, number, number] | null {
  const key = Math.round(value * 10) / 10;
  const found = cache.get(key);
  if (found !== undefined) return found;
  const rgb = d3.color(color(value))?.rgb();
  const next = rgb ? [rgb.r, rgb.g, rgb.b] as [number, number, number] : null;
  cache.set(key, next);
  return next;
}

function paintGaps(
  ctx: CanvasRenderingContext2D,
  gaps: Array<[number, number]>,
  x: d3.ScaleTime<number, number>,
  plotH: number
): void {
  ctx.fillStyle = palette.value.missingFill;
  for (const gap of gaps) {
    const x0 = x(thiTimeToDate(gap[0]));
    const x1 = x(thiTimeToDate(gap[1]));
    ctx.fillRect(Math.min(x0, x1), MARGIN.top, Math.max(1, Math.abs(x1 - x0)), plotH);
  }
}

function plotMetrics(): { box: { left: number; top: number; width: number; height: number }; window: PlotWindow } | null {
  const host = plot.value;
  const grid = cached.value;
  if (!host || !grid) return null;
  const base = fullWindow(grid);
  if (!base) return null;
  const width = host.clientWidth - MARGIN.left - MARGIN.right;
  const height = host.clientHeight - MARGIN.top - MARGIN.bottom;
  if (width <= 0 || height <= 0) return null;
  return {
    box: { left: MARGIN.left, top: MARGIN.top, width, height },
    window: view.value ?? base,
  };
}

function hideHover(): void {
  tip.show = false;
  cross.show = false;
}

function insidePlot(x: number, y: number, box: { left: number; top: number; width: number; height: number }): boolean {
  return x >= box.left && y >= box.top && x <= box.left + box.width && y <= box.top + box.height;
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0 || !plot.value) return;
  const metrics = plotMetrics();
  if (!metrics) return;
  const x = event.offsetX;
  const y = event.offsetY;
  if (!insidePlot(x, y, metrics.box)) return;
  try {
    plot.value.setPointerCapture(event.pointerId);
  } catch {
    /* 合成事件没有真实指针时忽略，真实鼠标仍会捕获。 */
  }
  hideHover();
  if (zooming.value) {
    drag.value = { x0: x, y0: y, x1: x, y1: y };
    return;
  }
  panning.value = true;
  panLast = { x, y };
}

function onPointerMove(event: PointerEvent): void {
  if (drag.value) {
    drag.value = { ...drag.value, x1: event.offsetX, y1: event.offsetY };
    return;
  }
  if (panning.value && panLast) {
    const metrics = plotMetrics();
    const grid = cached.value;
    if (!metrics || !grid) return;
    const base = fullWindow(grid);
    if (!base) return;
    const dx = event.offsetX - panLast.x;
    const dy = event.offsetY - panLast.y;
    panLast = { x: event.offsetX, y: event.offsetY };
    if (dx === 0 && dy === 0) return;
    const next = panWindow(base, metrics.window, dx, dy, metrics.box.width, metrics.box.height);
    view.value = next.reset ? null : next.window;
    schedule();
    return;
  }
  pointer = { x: event.offsetX, y: event.offsetY };
  if (tipFrame) return;
  tipFrame = requestAnimationFrame(() => {
    tipFrame = 0;
    refreshTip();
  });
}

function onPointerUp(event: PointerEvent): void {
  if (panning.value) {
    panning.value = false;
    panLast = null;
    pointer = { x: event.offsetX, y: event.offsetY };
    refreshTip();
    return;
  }
  const box = drag.value;
  drag.value = null;
  if (!box) return;
  const metrics = plotMetrics();
  if (!metrics) return;
  const next = windowFromDrag(metrics.window, metrics.box, { ...box, x1: event.offsetX, y1: event.offsetY });
  if (next) {
    view.value = next;
    zooming.value = false;
    schedule();
  }
}

function onPointerLeave(): void {
  if (drag.value || panning.value) return;
  pointer = null;
  hideHover();
}

function onWheel(event: WheelEvent): void {
  const host = plot.value;
  const grid = cached.value;
  if (!host || !grid) return;
  const rect = host.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const metrics = plotMetrics();
  if (!metrics || !insidePlot(x, y, metrics.box)) return;
  event.preventDefault();
  const base = fullWindow(grid);
  if (!base) return;
  const { box, window } = metrics;
  const anchorTime = window.timeStart + ((x - box.left) / box.width) * (window.timeEnd - window.timeStart);
  const anchorHeight = window.heightMax - ((y - box.top) / box.height) * (window.heightMax - window.heightMin);
  const next = wheelZoomWindow(base, window, anchorTime, anchorHeight, event.deltaY);
  view.value = next.reset ? null : next.window;
  schedule();
  pointer = { x, y };
  refreshTip();
}

function refreshTip(): void {
  const host = plot.value;
  const grid = cached.value;
  const point = pointer;
  const metrics = plotMetrics();
  if (!host || !grid || !point || !metrics || empty.value || panning.value || drag.value) {
    hideHover();
    return;
  }
  const { box, window } = metrics;
  if (!insidePlot(point.x, point.y, box)) {
    hideHover();
    return;
  }
  const timeSec = window.timeStart + ((point.x - box.left) / box.width) * (window.timeEnd - window.timeStart);
  const height = window.heightMax - ((point.y - box.top) / box.height) * (window.heightMax - window.heightMin);
  const snap = snapThiSample(grid, timeSec, height);
  if (!snap) {
    hideHover();
    return;
  }
  const snapX = box.left + ((snap.time - window.timeStart) / (window.timeEnd - window.timeStart)) * box.width;
  const snapY = box.top + ((window.heightMax - snap.height) / (window.heightMax - window.heightMin)) * box.height;
  cross.show = true;
  cross.x = snapX;
  cross.y = snapY;
  cross.x1 = box.left;
  cross.x2 = box.left + box.width;
  cross.y1 = box.top;
  cross.y2 = box.top + box.height;
  const gap = findTimeGap(timeSec, buildThiMissingGaps(grid, props.windpara));
  tip.time = formatThiFullTime(snap.time);
  if (gap) {
    tip.empty = false;
    tip.title = "缺测";
    tip.rows = [
      { label: "开始", value: formatThiFullTime(gap[0]), color: "rgba(128,128,128,0.9)" },
      { label: "结束", value: formatThiFullTime(gap[1]), color: "rgba(128,128,128,0.9)" },
    ];
  } else if (snap.value == null) {
    tip.empty = true;
    tip.title = "";
    tip.rows = [];
  } else {
    const scale = buildThiColorScale(activeBreakpoints.value, activeColors.value, activeMode.value);
    const digits = props.unit === "m/s" ? 3 : 2;
    tip.empty = false;
    tip.title = props.unit === "m/s" ? "垂直风速" : "数值";
    tip.rows = [
      { label: "高度", value: `${snap.height.toFixed(0)} m`, color: scale(snap.value) },
      { label: tip.title, value: `${snap.value.toFixed(digits)}${props.unit ? ` ${props.unit}` : ""}`, color: scale(snap.value) },
    ];
  }
  const width = tipEl.value?.offsetWidth || 180;
  const heightPx = tipEl.value?.offsetHeight || 88;
  let left = snapX + 14;
  let top = snapY - 8;
  if (left + width + 8 > host.clientWidth) left = Math.max(8, snapX - width - 16);
  if (top + heightPx + 8 > host.clientHeight) top = Math.max(8, host.clientHeight - heightPx - 8);
  if (top < 8) top = 8;
  tip.left = left;
  tip.top = top;
  tip.show = true;
}

function resetZoom(): void {
  view.value = null;
  zooming.value = false;
  schedule();
}

function openSettings(): void {
  const bounds = sliderBounds.value;
  const grid = cached.value;
  const base = grid ? fullWindow(grid) : null;
  const current = view.value ?? base;
  const min = current ? Math.max(bounds.min, Math.min(bounds.max, current.heightMin)) : bounds.min;
  const max = current ? Math.max(bounds.min, Math.min(bounds.max, current.heightMax)) : bounds.max;
  draftHeight.value = max > min ? [min, max] : [bounds.min, bounds.max];
  lastHeight = [draftHeight.value[0], draftHeight.value[1]];
  settingsOpen.value = true;
  legendOpen.value = false;
}

function onHeightSlide(value: number[] | number): void {
  if (!Array.isArray(value) || value.length < 2) return;
  const bounds = sliderBounds.value;
  const step = heightSliderStep.value;
  let low = value[0];
  let high = value[1];
  if (high - low < step) {
    const movedHigh = high !== lastHeight[1] && low === lastHeight[0];
    if (movedHigh) {
      high = Math.min(bounds.max, low + step);
      if (high - low < step) low = Math.max(bounds.min, high - step);
    } else {
      low = Math.max(bounds.min, high - step);
      if (high - low < step) high = Math.min(bounds.max, low + step);
    }
    draftHeight.value = [low, high];
  }
  lastHeight = [draftHeight.value[0], draftHeight.value[1]];
}

function applySettings(): void {
  const [min, max] = draftHeight.value;
  if (Number.isFinite(min) && Number.isFinite(max) && max > min) appliedHeight.value = { min, max };
  view.value = null;
  settingsOpen.value = false;
  schedule();
}

function factoryReset(): void {
  appliedHeight.value = null;
  appliedInterval.value = null;
  view.value = null;
  settingsOpen.value = false;
  schedule();
}

function openLegend(): void {
  draftLegendMode.value = activeMode.value;
  draftColors.value = activeColors.value.slice();
  draftBreakpoints.value = activeBreakpoints.value.map((item) => Number(item));
  fitDraftMode();
  draftPlacement.value = legendPlace.value;
  draftTickSide.value = tickSide.value;
  draftTickGap.value = tickGap.value;
  draftOpacity.value = Math.round(fillOpacity.value * 100);
  legendOpen.value = true;
  settingsOpen.value = false;
}

function fitDraftMode(): void {
  const colors = draftColors.value;
  const points = draftBreakpoints.value.filter((item) => Number.isFinite(item));
  const target = draftLegendMode.value === "threshold" ? colors.length + 1 : colors.length;
  if (points.length >= 2 && target >= 2) {
    while (points.length < target) {
      const step = points[points.length - 1] - points[points.length - 2] || 1;
      points.push(points[points.length - 1] + step);
    }
    if (points.length > target) points.splice(target);
  }
  draftBreakpoints.value = points;
}

function evenLegend(): void {
  const points = draftBreakpoints.value.slice();
  if (points.length < 2 || points.some((item) => !Number.isFinite(item))) return;
  const min = points[0];
  const max = points[points.length - 1];
  const step = (max - min) / (points.length - 1);
  draftBreakpoints.value = points.map((_, index) => Number((min + step * index).toPrecision(8)));
}

function applyLegend(): void {
  fitDraftMode();
  const points = draftBreakpoints.value.slice();
  if (!draftColors.value.length || points.some((item) => !Number.isFinite(item))) return;
  appliedColors.value = draftColors.value.slice();
  appliedBreakpoints.value = points;
  appliedMode.value = draftLegendMode.value;
  appliedPlacement.value = draftPlacement.value;
  appliedTickSide.value = draftTickSide.value;
  appliedTickGap.value = draftTickGap.value;
  fillOpacity.value = Math.min(1, Math.max(0, draftOpacity.value / 100));
  legendOpen.value = false;
  schedule();
}

function resetLegend(): void {
  appliedColors.value = null;
  appliedBreakpoints.value = null;
  appliedMode.value = null;
  appliedPlacement.value = null;
  appliedTickSide.value = null;
  appliedTickGap.value = null;
  fillOpacity.value = 1;
  draftLegendMode.value = props.colorMode;
  draftColors.value = props.colors.slice();
  draftBreakpoints.value = props.breakpoints.map((item) => Number(item));
  fitDraftMode();
  draftPlacement.value = props.legendPlacement;
  draftTickSide.value = "right";
  draftTickGap.value = 8;
  draftOpacity.value = 100;
  schedule();
}

async function download(): Promise<void> {
  const root = figure.value;
  if (!root || downloading.value) return;
  downloading.value = true;
  hideHover();
  try {
    await downloadThiFigure(root, palette.value.downloadBackground, "thi.png");
  } finally {
    downloading.value = false;
  }
}

watch(() => [props.times, props.heightArr, props.values, props.windpara], () => rebuild());
watch(
  () => [props.breakpoints, props.colors, props.colorMode, props.heightMin, props.heightMax, props.unit, props.theme, props.palette, props.legendPlacement],
  () => schedule()
);

onMounted(() => {
  rebuild();
  resizeObserver = new ResizeObserver(() => schedule());
  if (plot.value) {
    resizeObserver.observe(plot.value);
    wheelTarget = plot.value;
    wheelTarget.addEventListener("wheel", onWheel, { passive: false });
  }
});

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  if (tipFrame) cancelAnimationFrame(tipFrame);
  wheelTarget?.removeEventListener("wheel", onWheel);
  resizeObserver?.disconnect();
  const canvas = heat.value;
  const svg = axes.value;
  canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  if (svg) d3.select(svg).selectAll("*").remove();
});
</script>

<style scoped>
.thi-chart {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 1px solid;
  overflow: hidden;
}

.thi-toolbar {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 8px;
  height: 28px;
  padding: 4px 8px 0;
}

.thi-tool {
  position: relative;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.thi-tool img,
.thi-tool__icon {
  position: absolute;
  left: 0;
  top: 0;
  width: 20px;
  height: 20px;
}

.thi-tool__icon :deep(svg) {
  display: block;
  width: 20px;
  height: 20px;
}

.thi-tool .hover {
  display: none;
}

.thi-tool:hover:not(:disabled) .reg {
  display: none;
}

.thi-tool:hover:not(:disabled) .hover {
  display: block;
}

.thi-tool--zoom {
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.thi-tool--zoom .thi-tool__icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.thi-tool--zoom :deep(svg) {
  width: 12px;
  height: 11px;
}

.thi-tool--zoom :deep(path) {
  fill: #ffffff;
  fill-opacity: 0.8;
}

.thi-tool--zoom:hover:not(:disabled),
.thi-tool--zoom.is-active {
  background: rgba(32, 106, 255, 0.3);
}

.thi-tool:disabled {
  cursor: default;
  opacity: 0.65;
}

.thi-figure {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 6px;
  padding: 4px 8px 8px;
}

.thi-figure.is-right {
  flex-direction: row;
  align-items: stretch;
}

.thi-figure.is-bottom {
  flex-direction: column;
}

.thi-plot {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  cursor: crosshair;
}

.thi-plot.is-pan {
  cursor: grabbing;
}

.thi-heat,
.thi-axes {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.thi-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  pointer-events: none;
}

.thi-cross {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.cross-y,
.cross-x {
  stroke: var(--thi-cross);
  stroke-width: 1;
  stroke-dasharray: 4 3;
}

.chart-tooltip {
  position: absolute;
  z-index: 5;
  min-width: 140px;
  max-width: 260px;
  padding: 8px 10px;
  border: 1px solid var(--thi-tip-border);
  border-radius: 2px;
  background: var(--thi-tip-bg);
  color: var(--thi-tip-text);
  font-size: 12px;
  line-height: 1.45;
  pointer-events: none;
  white-space: nowrap;
}

.tip-time {
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--thi-tip-line);
  color: var(--thi-tip-title);
}

.tip-group-title {
  margin-bottom: 4px;
}

.tip-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tip-empty {
  color: var(--thi-tip-muted);
}

.thi-brush {
  position: absolute;
  z-index: 4;
  border: 1px solid var(--thi-brush-border);
  background: var(--thi-brush-fill);
  pointer-events: none;
}
</style>

<style>
/* 控件色按现有页面的暗色补齐明亮一套，不是公司设计令牌。绘图区颜色仍在 themes.ts，可用 palette 覆盖。 */
.thi-chart.is-dark,
.thi-ep-dialog.is-dark {
  --thi-bar-bg: rgba(4, 20, 42, 0.72);
  --thi-bar-border: rgba(64, 140, 210, 0.5);
  --thi-bar-tick: #cfe6ff;
  --thi-bar-unit: #9ec9ef;
  --thi-cross: rgba(255, 170, 80, 0.85);
  --thi-brush-border: rgba(255, 255, 255, 0.85);
  --thi-brush-fill: rgba(255, 255, 255, 0.12);
  --thi-tip-bg: rgba(6, 24, 48, 0.94);
  --thi-tip-border: rgba(90, 170, 240, 0.45);
  --thi-tip-text: #d7ecff;
  --thi-tip-title: #9ec9ef;
  --thi-tip-line: rgba(64, 140, 210, 0.3);
  --thi-tip-muted: #8ea4b8;
  --thi-dialog-bg: linear-gradient(160deg, #061830 0%, #0a2848 100%);
  --thi-dialog-border: rgba(64, 140, 210, 0.5);
  --thi-dialog-title: #cfe6ff;
  --thi-dialog-text: #d7ecff;
  --thi-dialog-muted: #9ec9ef;
  --thi-dialog-accent: #40b5fd;
  --thi-dialog-line: rgba(64, 140, 210, 0.3);
  --thi-field-bg: rgba(4, 20, 42, 0.9);
  --thi-field-text: #e8f4ff;
  --thi-field-border: rgba(64, 140, 210, 0.45);
  --thi-radio-bg: rgba(6, 28, 52, 0.9);
  --thi-radio-text: #9ec9ef;
  --thi-radio-active-bg: rgba(64, 181, 253, 0.28);
  --thi-radio-active-border: rgba(64, 181, 253, 0.65);
  --thi-radio-active-text: #cfe6ff;
  --thi-slider-runway: rgba(8, 36, 68, 0.95);
  --thi-shadow: 0 8px 32px rgba(0, 0, 0, 0.55);
}

.thi-chart.is-light,
.thi-ep-dialog.is-light {
  --thi-bar-bg: #ffffff;
  --thi-bar-border: rgba(120, 140, 160, 0.5);
  --thi-bar-tick: #334455;
  --thi-bar-unit: #5c6b7a;
  --thi-cross: rgba(220, 100, 40, 0.85);
  --thi-brush-border: rgba(26, 42, 58, 0.55);
  --thi-brush-fill: rgba(26, 42, 58, 0.08);
  --thi-tip-bg: rgba(255, 255, 255, 0.96);
  --thi-tip-border: rgba(100, 130, 160, 0.45);
  --thi-tip-text: #243447;
  --thi-tip-title: #5c6b7a;
  --thi-tip-line: rgba(36, 52, 71, 0.12);
  --thi-tip-muted: #6b7c8d;
  --thi-dialog-bg: #ffffff;
  --thi-dialog-border: rgba(120, 140, 160, 0.45);
  --thi-dialog-title: #1a2a3a;
  --thi-dialog-text: #243447;
  --thi-dialog-muted: #5c6b7a;
  --thi-dialog-accent: #2a7eb5;
  --thi-dialog-line: rgba(36, 52, 71, 0.12);
  --thi-field-bg: #f4f7fb;
  --thi-field-text: #1a2a3a;
  --thi-field-border: rgba(120, 140, 160, 0.45);
  --thi-radio-bg: #f7f9fb;
  --thi-radio-text: #334455;
  --thi-radio-active-bg: rgba(42, 126, 181, 0.16);
  --thi-radio-active-border: rgba(42, 126, 181, 0.55);
  --thi-radio-active-text: #1a4e78;
  --thi-slider-runway: rgba(180, 196, 210, 0.8);
  --thi-shadow: 0 8px 24px rgba(26, 42, 58, 0.12);
}

.thi-chart.is-light .thi-tool img,
.thi-chart.is-light .thi-tool--zoom {
  filter: brightness(0);
  opacity: 0.72;
}

/* 弹窗明亮一套按同一明暗关系补齐。 */
.thi-ep-dialog.el-dialog {
  margin-top: 6vh;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--thi-dialog-bg);
  border: 1px solid var(--thi-dialog-border);
  box-shadow: var(--thi-shadow);
}

.thi-ep-dialog .el-dialog__header {
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--thi-dialog-line);
  margin-right: 0;
}

.thi-ep-dialog .el-dialog__title {
  color: var(--thi-dialog-title);
  font-size: 16px;
  font-weight: 600;
}

.thi-ep-dialog .el-dialog__headerbtn .el-dialog__close {
  color: var(--thi-dialog-muted);
}

.thi-ep-dialog .el-dialog__body {
  padding: 12px 18px 8px;
  color: var(--thi-dialog-text);
  overflow: auto;
}

.thi-ep-dialog .el-dialog__footer {
  padding: 10px 18px 14px;
  border-top: 1px solid var(--thi-dialog-line);
}

.thi-ep-dialog .height-slider-wrap,
.thi-ep-dialog .legend-settings__opacity-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.thi-ep-dialog .height-slider,
.thi-ep-dialog .legend-settings__opacity-slider {
  flex: 1;
  min-width: 0;
}

.thi-ep-dialog .height-val,
.thi-ep-dialog .legend-settings__opacity-value {
  min-width: 48px;
  color: var(--thi-dialog-muted);
  font-size: 13px;
  text-align: center;
}

.thi-ep-dialog .el-slider__runway {
  background-color: var(--thi-slider-runway);
}

.thi-ep-dialog .el-slider__bar {
  background-color: var(--thi-dialog-accent);
}

.thi-ep-dialog .el-slider__button {
  border-color: var(--thi-dialog-accent);
}

.thi-ep-dialog .legend-settings__section {
  margin-bottom: 14px;
}

.thi-ep-dialog .legend-settings__section-title {
  margin-bottom: 8px;
  color: var(--thi-dialog-accent);
  font-size: 13px;
  font-weight: 600;
}

.thi-ep-dialog .legend-settings__bands {
  max-height: 220px;
  overflow: auto;
}

.thi-ep-dialog .legend-settings__band {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.thi-ep-dialog .legend-settings__band-label {
  flex: 0 0 36px;
  color: var(--thi-dialog-text);
  font-size: 12px;
}

.thi-ep-dialog .legend-settings__band-input {
  width: 120px;
}

.thi-ep-dialog .el-input__wrapper,
.thi-ep-dialog .el-input-number__decrease,
.thi-ep-dialog .el-input-number__increase {
  background: var(--thi-field-bg);
  box-shadow: 0 0 0 1px var(--thi-field-border) inset;
  color: var(--thi-field-text);
}

.thi-ep-dialog .el-input__inner {
  color: var(--thi-field-text);
}

.thi-ep-dialog .el-radio-button__inner {
  background: var(--thi-radio-bg);
  border-color: var(--thi-field-border);
  color: var(--thi-radio-text);
}

.thi-ep-dialog .el-radio-button__original-radio:checked + .el-radio-button__inner {
  background: var(--thi-radio-active-bg);
  border-color: var(--thi-radio-active-border);
  color: var(--thi-radio-active-text);
  box-shadow: none;
}

.thi-ep-dialog .legend-settings__footer {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.thi-ep-dialog .legend-settings__footer-spacer {
  flex: 1;
}
</style>
