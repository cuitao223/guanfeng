<template>
  <div ref="wrap" class="barb-chart" :class="themeClass" :style="frameStyle">
    <div class="barb-toolbar">
      <button type="button" class="barb-tool barb-tool--zoom" :class="{ 'is-active': zooming }" title="框选缩放" @click="zooming = !zooming">
        <span class="barb-tool__icon" v-html="zoomIcon"></span>
      </button>
      <button type="button" class="barb-tool" title="还原缩放" @click="resetZoom">
        <img class="reg" :src="refreshReg" alt="" />
        <img class="hover" :src="refreshHover" alt="" />
      </button>
      <button type="button" class="barb-tool" title="图片下载" :disabled="downloading" @click="download">
        <img class="reg" :src="downloadReg" alt="" />
        <img class="hover" :src="downloadHover" alt="" />
      </button>
      <button type="button" class="barb-tool" title="设置" @click="openSettings">
        <img class="reg" :src="setReg" alt="" />
        <img class="hover" :src="setHover" alt="" />
      </button>
    </div>
    <div ref="figure" class="barb-figure" :class="legendPlace === 'right' ? 'is-right' : 'is-bottom'">
      <div
        ref="plot"
        class="barb-plot"
        :class="{ 'is-zoom': zooming, 'is-pan': panning }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerLeave"
      >
        <canvas ref="layer" class="barb-layer"></canvas>
        <svg ref="axes" class="barb-axes"></svg>
        <svg class="barb-cross" aria-hidden="true">
          <line v-show="cross.show" class="cross-y" :x1="cross.x" :x2="cross.x" :y1="cross.y1" :y2="cross.y2" />
          <line v-show="cross.show" class="cross-x" :x1="cross.x1" :x2="cross.x2" :y1="cross.y" :y2="cross.y" />
        </svg>
        <div v-show="empty" class="barb-empty">无数据</div>
        <div v-show="tip.show" ref="tipEl" class="chart-tooltip" :style="{ left: tip.left + 'px', top: tip.top + 'px' }">
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
        <div v-if="drag" class="barb-brush" :style="brushStyle"></div>
      </div>
      <ValueColorBar
        :colors="activeColors"
        :breakpoints="activeBreakpoints"
        :color-mode="activeMode"
        :unit="unitLabel"
        :placement="legendPlace"
        :tick-side="tickSide"
        :tick-gap="tickGap"
        @open-settings="openLegend"
      />
    </div>
    <el-dialog v-model="settingsOpen" title="绘图设置" width="480px" append-to-body :close-on-click-modal="false" :class="dialogClass">
      <div class="legend-settings__section">
        <div class="legend-settings__section-title">高度范围</div>
        <div class="height-slider-wrap">
          <span class="height-val">{{ draftHeight[0] }}</span>
          <el-slider v-model="draftHeight" range :min="sliderBounds.min" :max="sliderBounds.max" :step="heightSliderStep" :show-tooltip="true" @input="onHeightSlide" />
          <span class="height-val">{{ draftHeight[1] }}</span>
        </div>
      </div>
      <div class="legend-settings__section">
        <div class="legend-settings__section-title">风羽疏密</div>
        <div class="height-slider-wrap">
          <span class="height-val">密</span>
          <el-slider v-model="barbDensity" :min="1" :max="8" :step="1" :show-tooltip="true" @input="schedule" />
          <span class="height-val">疏</span>
          <span class="height-val">1/{{ barbDensity }}</span>
        </div>
      </div>
      <div class="legend-settings__section">
        <div class="legend-settings__section-title">风羽大小</div>
        <div class="height-slider-wrap">
          <span class="height-val">小</span>
          <el-slider v-model="barbSize" :min="2" :max="20" :step="1" :show-tooltip="true" @input="schedule" />
          <span class="height-val">大</span>
          <span class="height-val">{{ sizeText }}</span>
        </div>
      </div>
      <div class="legend-settings__section">
        <div class="legend-settings__section-title">风羽粗细</div>
        <div class="height-slider-wrap">
          <span class="height-val">细</span>
          <el-slider v-model="barbStroke" :min="1" :max="10" :step="1" :show-tooltip="true" @input="schedule" />
          <span class="height-val">粗</span>
          <span class="height-val">{{ strokeText }}</span>
        </div>
      </div>
      <template #footer>
        <el-button size="small" @click="factoryReset">恢复出厂</el-button>
        <el-button size="small" @click="settingsOpen = false">取消</el-button>
        <el-button size="small" type="primary" @click="applySettings">应用</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="legendOpen" title="色标配置" width="520px" append-to-body :close-on-click-modal="false" :class="dialogClass">
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
          <el-slider v-model="draftTickGap" :min="0" :max="24" :step="1" :show-tooltip="true" />
          <span class="legend-settings__opacity-value">{{ draftTickGap }}px</span>
        </div>
      </div>
      <div class="legend-settings__section">
        <div class="legend-settings__section-title">图层透明度</div>
        <div class="legend-settings__opacity-row">
          <el-slider v-model="draftOpacity" :min="0" :max="100" :step="1" :show-tooltip="true" />
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import * as d3 from "d3";
import { ElButton, ElColorPicker, ElDialog, ElInputNumber, ElRadioButton, ElRadioGroup, ElSlider } from "element-plus";
import "element-plus/dist/index.css";
import ValueColorBar from "./ValueColorBar.vue";
import { buildBarbColorScale, type BarbColorMode } from "./barbColor";
import { buildBarbField, hasDrawableBarb, nearestBarb, sampleBarbHits, type BarbField } from "./barbGrid";
import { drawWindBarbPath } from "./barbSeries";
import { barbDensityGap, barbSizeScale, barbStrokeWidth } from "./barbStyle";
import { barbTimeToDate } from "./barbTime";
import { panWindow, wheelZoomWindow, windowFromDrag, type PlotBox, type PlotWindow } from "./barbView";
import { resolvePalette, type BarbPalette, type BarbThemeName } from "./themes";
import zoomIcon from "./icons/chart-zoom.svg?raw";
import refreshReg from "./icons/btn_drawing_refresh_reg.svg";
import refreshHover from "./icons/btn_drawing_refresh_hover.svg";
import downloadReg from "./icons/btn_drawing_download_reg.svg";
import downloadHover from "./icons/btn_drawing_download_hover.svg";
import setReg from "./icons/btn_drawing_set_reg.svg";
import setHover from "./icons/btn_drawing_set_hover.svg";

const MARGIN = { top: 12, right: 8, bottom: 52, left: 72 };
const MIN_SIZE = 100;

const props = withDefaults(defineProps<{
  title?: string;
  times?: unknown[];
  heightArr?: unknown[];
  values?: unknown[][];
  dirs?: unknown[][];
  heightMin?: number | null;
  heightMax?: number | null;
  unit?: string;
  breakpoints?: number[];
  colors?: string[];
  colorMode?: BarbColorMode;
  theme?: BarbThemeName;
  palette?: Partial<BarbPalette> | null;
  legendPlacement?: "right" | "bottom";
}>(), {
  title: "风羽",
  times: () => [],
  heightArr: () => [],
  values: () => [],
  dirs: () => [],
  heightMin: null,
  heightMax: null,
  unit: "m/s",
  breakpoints: () => [0, 10],
  colors: () => ["#1d4e89", "#f2e6c2"],
  colorMode: "linear",
  theme: "dark",
  palette: null,
  legendPlacement: "right",
});

const wrap = ref<HTMLDivElement | null>(null);
const figure = ref<HTMLDivElement | null>(null);
const plot = ref<HTMLDivElement | null>(null);
const axes = ref<SVGSVGElement | null>(null);
const layer = ref<HTMLCanvasElement | null>(null);
const empty = ref(true);
const zooming = ref(false);
const panning = ref(false);
const downloading = ref(false);
const settingsOpen = ref(false);
const legendOpen = ref(false);
const view = ref<PlotWindow | null>(null);
const drag = ref<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
const appliedHeight = ref<{ min: number; max: number } | null>(null);
const appliedMode = ref<BarbColorMode | null>(null);
const appliedBreakpoints = ref<number[] | null>(null);
const appliedColors = ref<string[] | null>(null);
const appliedPlacement = ref<"right" | "bottom" | null>(null);
const appliedTickSide = ref<"left" | "right" | null>(null);
const appliedTickGap = ref<number | null>(null);
const fillOpacity = ref(1);
const draftHeight = ref<number[]>([0, 1]);
const draftLegendMode = ref<BarbColorMode>("linear");
const draftColors = ref<string[]>([]);
const draftBreakpoints = ref<number[]>([]);
const draftPlacement = ref<"right" | "bottom">("right");
const draftTickSide = ref<"left" | "right">("right");
const draftTickGap = ref(8);
const draftOpacity = ref(100);
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

const barbDensity = ref(3);
const barbSize = ref(8);
const barbStroke = ref(2);
let frame = 0;
let lastHeight: [number, number] = [0, 1];
let panLast: { x: number; y: number } | null = null;

const themeClass = computed(() => (props.theme === "light" ? "is-light" : "is-dark"));
const dialogClass = computed(() => ["thi-ep-dialog", themeClass.value]);
const palette = computed(() => resolvePalette(props.theme, props.palette));
const field = computed(() => buildBarbField(props.times, props.heightArr, props.values, props.dirs));
const activeMode = computed(() => appliedMode.value ?? props.colorMode);
const activeBreakpoints = computed(() => appliedBreakpoints.value ?? props.breakpoints);
const activeColors = computed(() => appliedColors.value ?? props.colors);
const legendPlace = computed(() => appliedPlacement.value ?? props.legendPlacement);
const tickSide = computed(() => appliedTickSide.value ?? "right");
const tickGap = computed(() => appliedTickGap.value ?? 8);
const unitLabel = computed(() => props.unit || "m/s");
const displayTitle = computed(() => props.title || "风羽");
const frameStyle = computed(() => ({
  background: palette.value.frameBg,
  borderColor: palette.value.frameBorder,
  color: palette.value.label,
}));
const sliderBounds = computed(() => {
  const heights = field.value.heights;
  const dataMin = heights.length ? heights[0] : 0;
  const dataMax = heights.length ? heights[heights.length - 1] : 1;
  const min = props.heightMin ?? dataMin;
  const max = props.heightMax ?? dataMax;
  if (max > min) return { min, max };
  return { min: dataMin, max: dataMax > dataMin ? dataMax : dataMin + 1 };
});
const heightSliderStep = computed(() => {
  const span = sliderBounds.value.max - sliderBounds.value.min;
  if (!(span > 0)) return 1;
  const raw = span / 50;
  const power = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / power;
  const nice = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return Math.min(nice * power, span);
});
const sizeText = computed(() => `${barbSizeScale(barbSize.value).toFixed(1)}x`);
const strokeText = computed(() => `${barbStrokeWidth(barbStroke.value).toFixed(1)}px`);
const brushStyle = computed(() => {
  const box = drag.value;
  if (!box) return {};
  const left = Math.min(box.x0, box.x1);
  const top = Math.min(box.y0, box.y1);
  return { left: `${left}px`, top: `${top}px`, width: `${Math.abs(box.x1 - box.x0)}px`, height: `${Math.abs(box.y1 - box.y0)}px` };
});

function schedule(): void {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    paint();
  });
}

function baseWindow(source: BarbField): PlotWindow | null {
  if (!source.times.length || !source.heights.length) return null;
  const heightMin = appliedHeight.value?.min ?? props.heightMin ?? source.heights[0];
  const heightMax = appliedHeight.value?.max ?? props.heightMax ?? source.heights[source.heights.length - 1];
  if (!(heightMax > heightMin)) return null;
  return {
    timeStart: source.times[0],
    timeEnd: source.times[source.times.length - 1],
    heightMin,
    heightMax,
  };
}

function plotBox(width: number, height: number): PlotBox {
  return {
    left: MARGIN.left,
    top: MARGIN.top,
    width: Math.max(0, width - MARGIN.left - MARGIN.right),
    height: Math.max(0, height - MARGIN.top - MARGIN.bottom),
  };
}

function paint(): void {
  const plotEl = plot.value;
  const svgEl = axes.value;
  const canvas = layer.value;
  const source = field.value;
  if (!plotEl || !svgEl || !canvas) return;
  const width = plotEl.clientWidth;
  const height = plotEl.clientHeight;
  if (width < MIN_SIZE || height < MIN_SIZE) return;
  const box = plotBox(width, height);
  const base = baseWindow(source);
  empty.value = !hasDrawableBarb(source);
  const colors = palette.value;
  const rootSel = d3.select(svgEl);
  rootSel.attr("width", width).attr("height", height);
  rootSel.selectAll("*").remove();
  if (!base || box.width < 10 || box.height < 10) return;
  const current = view.value ?? base;
  const x = d3.scaleTime().domain([barbTimeToDate(current.timeStart), barbTimeToDate(current.timeEnd)]).range([box.left, box.left + box.width]);
  const y = d3.scaleLinear().domain([current.heightMin, current.heightMax]).range([box.top + box.height, box.top]);
  const xTicks = x.ticks(4);
  const yTicks = y.ticks(5);
  const root = rootSel;
  root.append("g").attr("class", "grid").selectAll("line").data(yTicks).enter().append("line")
    .attr("stroke", colors.grid).attr("stroke-dasharray", "4,4")
    .attr("x1", box.left).attr("x2", box.left + box.width)
    .attr("y1", (item) => y(item)).attr("y2", (item) => y(item));
  root.append("g").attr("class", "grid").selectAll("line").data(xTicks).enter().append("line")
    .attr("stroke", colors.grid).attr("stroke-dasharray", "4,4")
    .attr("y1", box.top).attr("y2", box.top + box.height)
    .attr("x1", (item) => x(item)).attr("x2", (item) => x(item));
  const xGroup = root.append("g").attr("class", "axis-x").attr("transform", `translate(0,${box.top + box.height})`)
    .call(d3.axisBottom(x).tickValues(xTicks).tickSizeOuter(0).tickFormat(() => ""));
  xGroup.selectAll<SVGGElement, Date>("g.tick").each(function (datum, index, nodes) {
    const text = d3.select(this).select("text").attr("fill", colors.label).attr("font-size", 11);
    text.text(null);
    if (index === 0) text.attr("text-anchor", "start");
    else if (index === nodes.length - 1) text.attr("text-anchor", "end");
    text.append("tspan").attr("x", 0).attr("dy", "0.95em").text(d3.timeFormat("%Y-%m-%d")(datum));
    text.append("tspan").attr("x", 0).attr("dy", "1.15em").text(d3.timeFormat("%H:%M:%S")(datum));
  });
  root.append("g").attr("class", "axis-y").attr("transform", `translate(${box.left},0)`)
    .call(d3.axisLeft(y).tickValues(yTicks).tickSizeOuter(0))
    .call((group) => group.selectAll("text").attr("fill", colors.label).attr("font-size", 11))
    .call((group) => group.selectAll("line, path").attr("stroke", colors.axis));
  root.append("rect").attr("fill", "none").attr("stroke", colors.axis)
    .attr("x", box.left).attr("y", box.top).attr("width", box.width).attr("height", box.height);
  root.append("text").attr("fill", colors.label).attr("font-size", 11).attr("text-anchor", "middle")
    .attr("transform", `translate(16,${box.top + box.height / 2}) rotate(-90)`).text("高度(m)");

  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (empty.value) return;
  const color = buildBarbColorScale(activeBreakpoints.value, activeColors.value, activeMode.value);
  const hits = sampleBarbHits(
    source,
    current.timeStart,
    current.timeEnd,
    current.heightMin,
    current.heightMax,
    (time) => x(barbTimeToDate(time)),
    (item) => y(item),
    barbDensityGap(barbDensity.value),
  );
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.left, box.top, box.width, box.height);
  ctx.clip();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = fillOpacity.value;
  const sizeScale = barbSizeScale(barbSize.value);
  const lineWidth = barbStrokeWidth(barbStroke.value);
  for (const hit of hits) {
    ctx.strokeStyle = String(color(hit.speed));
    drawWindBarbPath(ctx, x(barbTimeToDate(hit.time)), y(hit.height), Math.max(0, hit.speed), hit.dir, { sizeScale, lineWidth });
  }
  ctx.restore();
}

function localPoint(event: PointerEvent): { x: number; y: number } {
  const rect = plot.value?.getBoundingClientRect();
  return { x: event.clientX - (rect?.left || 0), y: event.clientY - (rect?.top || 0) };
}

function metrics(): { box: PlotBox; window: PlotWindow } | null {
  const plotEl = plot.value;
  const source = field.value;
  const base = baseWindow(source);
  if (!plotEl || !base) return null;
  const box = plotBox(plotEl.clientWidth, plotEl.clientHeight);
  if (box.width < 10 || box.height < 10) return null;
  return { box, window: view.value ?? base };
}

function onPointerDown(event: PointerEvent): void {
  if (empty.value) return;
  try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* 合成事件没有捕获 */ }
  const point = localPoint(event);
  if (zooming.value) drag.value = { x0: point.x, y0: point.y, x1: point.x, y1: point.y };
  else {
    panning.value = true;
    panLast = point;
  }
}

function onPointerMove(event: PointerEvent): void {
  const point = localPoint(event);
  if (drag.value && zooming.value) {
    drag.value = { ...drag.value, x1: point.x, y1: point.y };
    return;
  }
  if (panning.value && panLast) {
    const current = metrics();
    const base = baseWindow(field.value);
    if (!current || !base) return;
    const dx = point.x - panLast.x;
    const dy = point.y - panLast.y;
    panLast = point;
    const next = panWindow(base, current.window, dx, dy, current.box.width, current.box.height);
    view.value = next.reset ? null : next.window;
    schedule();
    return;
  }
  showTip(point.x, point.y);
}

function onPointerUp(event: PointerEvent): void {
  const box = drag.value;
  drag.value = null;
  panning.value = false;
  panLast = null;
  if (!box) return;
  const current = metrics();
  if (!current) return;
  const point = localPoint(event);
  const next = windowFromDrag(current.window, current.box, { ...box, x1: point.x, y1: point.y });
  if (!next) return;
  view.value = next;
  schedule();
}

function onPointerLeave(): void {
  if (!panning.value && !drag.value) {
    tip.show = false;
    cross.show = false;
  }
}

function showTip(pointerX: number, pointerY: number): void {
  const current = metrics();
  if (!current || empty.value) {
    tip.show = false;
    cross.show = false;
    return;
  }
  const { box, window: currentWindow } = current;
  if (pointerX < box.left || pointerX > box.left + box.width || pointerY < box.top || pointerY > box.top + box.height) {
    tip.show = false;
    cross.show = false;
    return;
  }
  const time = currentWindow.timeStart + ((pointerX - box.left) / box.width) * (currentWindow.timeEnd - currentWindow.timeStart);
  const height = currentWindow.heightMax - ((pointerY - box.top) / box.height) * (currentWindow.heightMax - currentWindow.heightMin);
  const hit = nearestBarb(field.value, time, height);
  if (!hit) {
    tip.show = false;
    cross.show = false;
    return;
  }
  const x = box.left + ((hit.time - currentWindow.timeStart) / (currentWindow.timeEnd - currentWindow.timeStart)) * box.width;
  const y = box.top + ((currentWindow.heightMax - hit.height) / (currentWindow.heightMax - currentWindow.heightMin)) * box.height;
  cross.show = true;
  cross.x = x;
  cross.y = y;
  cross.x1 = box.left;
  cross.x2 = box.left + box.width;
  cross.y1 = box.top;
  cross.y2 = box.top + box.height;
  tip.show = true;
  tip.empty = false;
  tip.time = d3.timeFormat("%Y-%m-%d %H:%M:%S")(barbTimeToDate(hit.time));
  tip.title = displayTitle.value;
  const color = String(buildBarbColorScale(activeBreakpoints.value, activeColors.value, activeMode.value)(hit.speed));
  tip.rows = [
    { label: "高度", value: `${hit.height.toFixed(0)} m`, color },
    { label: "风速", value: `${hit.speed.toFixed(1)} ${unitLabel.value}`, color },
    { label: "风向", value: `${hit.dir.toFixed(0)}°`, color },
  ];
  const host = plot.value;
  const width = tipEl.value?.offsetWidth || 180;
  const heightPx = tipEl.value?.offsetHeight || 96;
  let left = x + 14;
  let top = y - 8;
  if (host && left + width + 8 > host.clientWidth) left = Math.max(8, x - width - 16);
  if (host && top + heightPx + 8 > host.clientHeight) top = Math.max(8, host.clientHeight - heightPx - 8);
  if (top < 8) top = 8;
  tip.left = left;
  tip.top = top;
}

function resetZoom(): void {
  view.value = null;
  zooming.value = false;
  schedule();
}

function openSettings(): void {
  const bounds = sliderBounds.value;
  const current = metrics();
  const min = current ? Math.max(bounds.min, Math.min(bounds.max, current.window.heightMin)) : bounds.min;
  const max = current ? Math.max(bounds.min, Math.min(bounds.max, current.window.heightMax)) : bounds.max;
  draftHeight.value = max > min ? [Math.round(min), Math.round(max)] : [bounds.min, bounds.max];
  lastHeight = [draftHeight.value[0], draftHeight.value[1]];
  settingsOpen.value = true;
}

function onHeightSlide(value: number[] | number): void {
  if (!Array.isArray(value) || value.length < 2) return;
  const bounds = sliderBounds.value;
  const step = heightSliderStep.value;
  let low = value[0];
  let high = value[1];
  if (high - low < step) {
    if (high !== lastHeight[1] && low === lastHeight[0]) high = Math.min(bounds.max, low + step);
    else low = Math.max(bounds.min, high - step);
    draftHeight.value = [low, high];
  }
  lastHeight = [draftHeight.value[0], draftHeight.value[1]];
}

function applySettings(): void {
  appliedHeight.value = { min: draftHeight.value[0], max: draftHeight.value[1] };
  view.value = null;
  settingsOpen.value = false;
  schedule();
}

function factoryReset(): void {
  appliedHeight.value = null;
  view.value = null;
  barbDensity.value = 3;
  barbSize.value = 8;
  barbStroke.value = 2;
  settingsOpen.value = false;
  schedule();
}

function openLegend(): void {
  draftLegendMode.value = activeMode.value;
  draftColors.value = activeColors.value.slice();
  draftBreakpoints.value = activeBreakpoints.value.map((item) => Number(item));
  draftPlacement.value = legendPlace.value;
  draftTickSide.value = tickSide.value;
  draftTickGap.value = tickGap.value;
  draftOpacity.value = Math.round(fillOpacity.value * 100);
  fitDraftMode();
  legendOpen.value = true;
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
  if (points.length < 2) return;
  const min = points[0];
  const max = points[points.length - 1];
  const step = (max - min) / (points.length - 1);
  draftBreakpoints.value = points.map((_, index) => Number((min + step * index).toPrecision(8)));
}

function applyLegend(): void {
  fitDraftMode();
  appliedColors.value = draftColors.value.slice();
  appliedBreakpoints.value = draftBreakpoints.value.slice();
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
  const canvas = layer.value;
  const svg = axes.value;
  if (!root || !canvas || downloading.value) return;
  downloading.value = true;
  try {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const output = document.createElement("canvas");
    output.width = Math.floor(root.clientWidth * ratio);
    output.height = Math.floor(root.clientHeight * ratio);
    const ctx = output.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = palette.value.downloadBackground;
    ctx.fillRect(0, 0, output.width, output.height);
    const plotBoxNow = plot.value?.getBoundingClientRect();
    const rootBox = root.getBoundingClientRect();
    if (plotBoxNow) ctx.drawImage(canvas, (plotBoxNow.left - rootBox.left) * ratio, (plotBoxNow.top - rootBox.top) * ratio, plotBoxNow.width * ratio, plotBoxNow.height * ratio);
    if (svg && plotBoxNow) {
      const xml = new XMLSerializer().serializeToString(svg);
      const image = new Image();
      const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
      await new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = url;
      });
      ctx.drawImage(image, (plotBoxNow.left - rootBox.left) * ratio, (plotBoxNow.top - rootBox.top) * ratio, plotBoxNow.width * ratio, plotBoxNow.height * ratio);
      URL.revokeObjectURL(url);
    }
    const link = document.createElement("a");
    link.href = output.toDataURL("image/png");
    link.download = "barb-thi.png";
    link.click();
  } finally {
    downloading.value = false;
  }
}

function onWheel(event: WheelEvent): void {
  const current = metrics();
  const base = baseWindow(field.value);
  if (!plot.value || !current || !base) return;
  event.preventDefault();
  const rect = plot.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const anchorTime = current.window.timeStart + ((x - current.box.left) / current.box.width) * (current.window.timeEnd - current.window.timeStart);
  const anchorHeight = current.window.heightMax - ((y - current.box.top) / current.box.height) * (current.window.heightMax - current.window.heightMin);
  const next = wheelZoomWindow(base, current.window, anchorTime, anchorHeight, event.deltaY);
  view.value = next.reset ? null : next.window;
  schedule();
}

watch(
  () => [props.times, props.heightArr, props.values, props.dirs, props.heightMin, props.heightMax, props.title, props.theme, props.breakpoints, props.colors, props.colorMode, props.legendPlacement, props.unit, barbDensity, barbSize, barbStroke],
  () => schedule(),
);

onMounted(() => {
  schedule();
  resizeObserver = new ResizeObserver(() => schedule());
  if (wrap.value) resizeObserver.observe(wrap.value);
  plot.value?.addEventListener("wheel", onWheel, { passive: false });
});

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
  plot.value?.removeEventListener("wheel", onWheel);
});
</script>

<style scoped>
.barb-chart { width: 100%; height: 100%; box-sizing: border-box; border: 1px solid; display: flex; flex-direction: column; position: relative; overflow: hidden; }
.barb-toolbar { display: flex; justify-content: flex-end; gap: 8px; height: 28px; padding: 4px 8px 0; }
.barb-tool { position: relative; width: 20px; height: 20px; padding: 0; border: 0; background: transparent; cursor: pointer; }
.barb-tool img, .barb-tool__icon { position: absolute; left: 0; top: 0; width: 20px; height: 20px; }
.barb-tool__icon :deep(svg) { display: block; width: 20px; height: 20px; }
.barb-tool .hover { display: none; }
.barb-tool:hover:not(:disabled) .reg { display: none; }
.barb-tool:hover:not(:disabled) .hover { display: block; }
.barb-tool--zoom { border-radius: 50%; background: rgba(255, 255, 255, 0.1); }
.barb-tool--zoom .barb-tool__icon { display: flex; align-items: center; justify-content: center; }
.barb-tool--zoom :deep(svg) { width: 12px; height: 11px; }
.barb-tool--zoom :deep(path) { fill: #ffffff; fill-opacity: 0.8; }
.barb-tool--zoom:hover:not(:disabled), .barb-tool--zoom.is-active { background: rgba(32, 106, 255, 0.3); }
.barb-figure { display: flex; flex: 1; min-height: 0; gap: 6px; padding: 4px 8px 8px; }
.barb-figure.is-right { flex-direction: row; }
.barb-figure.is-bottom { flex-direction: column; }
.barb-plot { position: relative; flex: 1; min-width: 0; min-height: 0; cursor: crosshair; }
.barb-plot.is-pan { cursor: grabbing; }
.barb-axes, .barb-layer, .barb-cross { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.barb-cross .cross-x, .barb-cross .cross-y { stroke: var(--thi-cross); stroke-width: 1; stroke-dasharray: 4 3; }
.barb-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; pointer-events: none; }
.chart-tooltip {
  position: absolute; z-index: 5; min-width: 140px; max-width: 260px; padding: 8px 10px;
  border: 1px solid var(--thi-tip-border); border-radius: 2px; background: var(--thi-tip-bg);
  color: var(--thi-tip-text); font-size: 12px; line-height: 1.45; pointer-events: none; white-space: nowrap;
}
.tip-time { margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid var(--thi-tip-line); color: var(--thi-tip-title); }
.tip-group-title { margin-bottom: 4px; }
.tip-row { display: flex; align-items: center; gap: 6px; }
.tip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.tip-empty { color: var(--thi-tip-muted); }
.barb-brush { position: absolute; z-index: 4; border: 1px solid var(--thi-brush-border); background: var(--thi-brush-fill); pointer-events: none; }
</style>

<style>
.barb-chart.is-dark, .thi-ep-dialog.is-dark {
  --thi-cross: rgba(255, 170, 80, 0.85);
  --thi-brush-border: rgba(255, 255, 255, 0.85);
  --thi-brush-fill: rgba(255, 255, 255, 0.12);
  --thi-tip-bg: rgba(6, 24, 48, 0.94);
  --thi-tip-border: rgba(90, 170, 240, 0.45);
  --thi-tip-text: #d7ecff;
  --thi-tip-title: #9ec9ef;
  --thi-tip-line: rgba(64, 140, 210, 0.3);
  --thi-tip-muted: #8ea4b8;
  --thi-bar-bg: rgba(4, 20, 42, 0.72);
  --thi-bar-border: rgba(64, 140, 210, 0.5);
  --thi-bar-tick: #cfe6ff;
  --thi-bar-unit: #9ec9ef;
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
.barb-chart.is-light, .thi-ep-dialog.is-light {
  --thi-cross: rgba(220, 100, 40, 0.85);
  --thi-brush-border: rgba(26, 42, 58, 0.55);
  --thi-brush-fill: rgba(26, 42, 58, 0.08);
  --thi-tip-bg: rgba(255, 255, 255, 0.96);
  --thi-tip-border: rgba(100, 130, 160, 0.45);
  --thi-tip-text: #243447;
  --thi-tip-title: #5c6b7a;
  --thi-tip-line: rgba(36, 52, 71, 0.12);
  --thi-tip-muted: #6b7c8d;
  --thi-bar-bg: #ffffff;
  --thi-bar-border: rgba(120, 140, 160, 0.5);
  --thi-bar-tick: #334455;
  --thi-bar-unit: #5c6b7a;
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
.barb-chart.is-light .barb-tool img, .barb-chart.is-light .barb-tool--zoom { filter: brightness(0); opacity: 0.72; }
.thi-ep-dialog.el-dialog { margin-top: 6vh; max-height: 88vh; display: flex; flex-direction: column; background: var(--thi-dialog-bg); border: 1px solid var(--thi-dialog-border); box-shadow: var(--thi-shadow); }
.thi-ep-dialog .el-dialog__header { padding: 14px 18px 10px; border-bottom: 1px solid var(--thi-dialog-line); margin-right: 0; }
.thi-ep-dialog .el-dialog__title { color: var(--thi-dialog-title); font-size: 16px; font-weight: 600; }
.thi-ep-dialog .el-dialog__headerbtn .el-dialog__close { color: var(--thi-dialog-muted); }
.thi-ep-dialog .el-dialog__body { padding: 12px 18px 8px; color: var(--thi-dialog-text); overflow: auto; }
.thi-ep-dialog .el-dialog__footer { padding: 10px 18px 14px; border-top: 1px solid var(--thi-dialog-line); }
.thi-ep-dialog .height-slider-wrap, .thi-ep-dialog .legend-settings__opacity-row { display: flex; align-items: center; gap: 12px; }
.thi-ep-dialog .el-slider { flex: 1; min-width: 0; }
.thi-ep-dialog .height-val, .thi-ep-dialog .legend-settings__opacity-value { min-width: 48px; color: var(--thi-dialog-muted); font-size: 13px; text-align: center; }
.thi-ep-dialog .el-slider__runway { background-color: var(--thi-slider-runway); }
.thi-ep-dialog .el-slider__bar { background-color: var(--thi-dialog-accent); }
.thi-ep-dialog .el-slider__button { border-color: var(--thi-dialog-accent); }
.thi-ep-dialog .legend-settings__section { margin-bottom: 14px; }
.thi-ep-dialog .legend-settings__section-title { margin-bottom: 8px; color: var(--thi-dialog-accent); font-size: 13px; font-weight: 600; }
.thi-ep-dialog .legend-settings__bands { max-height: 220px; overflow: auto; }
.thi-ep-dialog .legend-settings__band { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.thi-ep-dialog .legend-settings__band-label { flex: 0 0 36px; color: var(--thi-dialog-text); font-size: 12px; }
.thi-ep-dialog .legend-settings__band-input { width: 120px; }
.thi-ep-dialog .el-input__wrapper, .thi-ep-dialog .el-input-number__decrease, .thi-ep-dialog .el-input-number__increase { background: var(--thi-field-bg); box-shadow: 0 0 0 1px var(--thi-field-border) inset; color: var(--thi-field-text); }
.thi-ep-dialog .el-input__inner { color: var(--thi-field-text); }
.thi-ep-dialog .el-radio-button__inner { background: var(--thi-radio-bg); border-color: var(--thi-field-border); color: var(--thi-radio-text); }
.thi-ep-dialog .el-radio-button__original-radio:checked + .el-radio-button__inner { background: var(--thi-radio-active-bg); border-color: var(--thi-radio-active-border); color: var(--thi-radio-active-text); box-shadow: none; }
.thi-ep-dialog .legend-settings__footer { display: flex; align-items: center; gap: 8px; width: 100%; }
.thi-ep-dialog .legend-settings__footer-spacer { flex: 1; }
</style>
