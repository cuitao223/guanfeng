<template>
  <div ref="wrap" class="scan-chart" :class="themeClass" :style="frameStyle">
    <div class="scan-toolbar">
      <button type="button" class="scan-tool scan-tool--zoom" :class="{ 'is-active': zooming }" title="框选缩放" @click="zooming = !zooming">
        <span class="scan-tool__icon" v-html="zoomIcon"></span>
      </button>
      <button type="button" class="scan-tool" title="还原缩放" @click="resetZoom">
        <img class="reg" :src="refreshReg" alt="" />
        <img class="hover" :src="refreshHover" alt="" />
      </button>
      <button type="button" class="scan-tool" title="图片下载" :disabled="downloading" @click="download">
        <img class="reg" :src="downloadReg" alt="" />
        <img class="hover" :src="downloadHover" alt="" />
      </button>
      <button type="button" class="scan-tool" title="设置" @click="openSettings">
        <img class="reg" :src="setReg" alt="" />
        <img class="hover" :src="setHover" alt="" />
      </button>
    </div>
    <div ref="figure" class="scan-figure" :class="legendPlace === 'right' ? 'is-right' : 'is-bottom'">
      <div
        ref="plot"
        class="scan-plot"
        :class="{ 'is-zoom': zooming, 'is-pan': panning }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerLeave"
      >
        <canvas ref="layer" class="scan-layer"></canvas>
        <svg ref="axes" class="scan-axes"></svg>
        <div v-show="empty" class="scan-empty">无数据</div>
        <div v-show="tip.show" ref="tipEl" class="chart-tooltip" :style="{ left: tip.left + 'px', top: tip.top + 'px' }">
          <div class="tip-time">{{ tip.heading }}</div>
          <div v-if="tip.empty" class="tip-empty">无数据</div>
          <template v-else>
            <div v-if="title" class="tip-group-title">{{ title }}</div>
            <div v-for="row in tip.rows" :key="row.label" class="tip-row">
              <span class="tip-dot" :style="{ background: row.color }"></span>
              <span>{{ row.label }}</span>
              <span>{{ row.value }}</span>
            </div>
          </template>
        </div>
        <div v-if="drag" class="scan-brush" :style="brushStyle"></div>
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
    <el-dialog v-model="settingsOpen" title="距离范围" width="420px" append-to-body :close-on-click-modal="false" :class="dialogClass">
      <div class="height-slider-wrap">
        <span class="height-val">{{ draftRange[0] }}</span>
        <el-slider v-model="draftRange" range :min="0" :max="rangeSliderMax" :step="rangeStep" @input="onRangeSlide" />
        <span class="height-val">{{ draftRange[1] }}</span>
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
          <el-slider v-model="draftTickGap" :min="0" :max="24" :step="1" />
          <span class="legend-settings__opacity-value">{{ draftTickGap }}px</span>
        </div>
      </div>
      <div class="legend-settings__section">
        <div class="legend-settings__section-title">图层透明度</div>
        <div class="legend-settings__opacity-row">
          <el-slider v-model="draftOpacity" :min="0" :max="100" :step="1" />
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
import { isLidarMissingCell } from "./lidarMissing";
import { buildScanColorScale, type ScanColorMode } from "./scanColor";
import { angleSectors, hasDrawableScan, polarPoint, rangeBounds, scanCellAt, type ScanMode } from "./scanGeometry";
import { resolvePalette, type ScanPalette, type ScanThemeName } from "./themes";
import zoomIcon from "./icons/chart-zoom.svg?raw";
import refreshReg from "./icons/btn_drawing_refresh_reg.svg";
import refreshHover from "./icons/btn_drawing_refresh_hover.svg";
import downloadReg from "./icons/btn_drawing_download_reg.svg";
import downloadHover from "./icons/btn_drawing_download_hover.svg";
import setReg from "./icons/btn_drawing_set_reg.svg";
import setHover from "./icons/btn_drawing_set_hover.svg";

const props = withDefaults(defineProps<{
  mode?: ScanMode;
  title?: string;
  angles?: unknown[];
  heightArr?: unknown[];
  values?: unknown[][];
  maxRange?: number;
  unit?: string;
  breakpoints?: number[];
  colors?: string[];
  colorMode?: ScanColorMode;
  theme?: ScanThemeName;
  palette?: Partial<ScanPalette> | null;
  legendPlacement?: "right" | "bottom";
}>(), {
  mode: "ppi",
  title: "",
  angles: () => [],
  heightArr: () => [],
  values: () => [],
  maxRange: 15000,
  unit: "",
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
const tipEl = ref<HTMLDivElement | null>(null);
const empty = ref(true);
const zooming = ref(false);
const panning = ref(false);
const downloading = ref(false);
const settingsOpen = ref(false);
const legendOpen = ref(false);
const view = ref({ k: 1, x: 0, y: 0 });
const drag = ref<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
const appliedRange = ref<[number, number] | null>(null);
const appliedMode = ref<ScanColorMode | null>(null);
const appliedBreakpoints = ref<number[] | null>(null);
const appliedColors = ref<string[] | null>(null);
const appliedPlacement = ref<"right" | "bottom" | null>(null);
const appliedTickSide = ref<"left" | "right" | null>(null);
const appliedTickGap = ref<number | null>(null);
const fillOpacity = ref(1);
const draftRange = ref<[number, number]>([0, 15000]);
const draftLegendMode = ref<ScanColorMode>("linear");
const draftColors = ref<string[]>([]);
const draftBreakpoints = ref<number[]>([]);
const draftPlacement = ref<"right" | "bottom">("right");
const draftTickSide = ref<"left" | "right">("right");
const draftTickGap = ref(8);
const draftOpacity = ref(100);
const tip = reactive({
  show: false,
  left: 0,
  top: 0,
  heading: "",
  empty: false,
  rows: [] as Array<{ label: string; value: string; color: string }>,
});
let resizeObserver: ResizeObserver | null = null;
let frame = 0;
let panLast: { x: number; y: number } | null = null;
let lastRange: [number, number] = [0, 15000];
let center = { x: 0, y: 0, r: 1 };

const themeClass = computed(() => (props.theme === "light" ? "is-light" : "is-dark"));
const dialogClass = computed(() => ["thi-ep-dialog", themeClass.value]);
const palette = computed(() => resolvePalette(props.theme, props.palette));
const angles = computed(() => props.angles.map((item) => Number(item)));
const ranges = computed(() => props.heightArr.map((item) => Number(item)));
const activeMode = computed(() => appliedMode.value ?? props.colorMode);
const activeBreakpoints = computed(() => appliedBreakpoints.value ?? props.breakpoints);
const activeColors = computed(() => appliedColors.value ?? props.colors);
const legendPlace = computed(() => appliedPlacement.value ?? props.legendPlacement);
const tickSide = computed(() => appliedTickSide.value ?? "right");
const tickGap = computed(() => appliedTickGap.value ?? 8);
const unitLabel = computed(() => props.unit);
const modeLabel = computed(() => (props.mode === "rhi" ? "RHI" : "PPI"));
const angleLabel = computed(() => (props.mode === "rhi" ? "俯仰角" : "方位角"));
const rangeWindow = computed(() => appliedRange.value ?? [0, props.maxRange > 0 ? props.maxRange : 15000]);
const rangeSliderMax = computed(() => Math.max(props.maxRange, ranges.value.length ? ranges.value[ranges.value.length - 1] : 15000, 1000));
const rangeStep = computed(() => (rangeSliderMax.value >= 3000 ? 500 : 100));
const frameStyle = computed(() => ({ background: palette.value.frameBg, borderColor: palette.value.frameBorder, color: palette.value.label }));
const brushStyle = computed(() => {
  const box = drag.value;
  if (!box) return {};
  return {
    left: `${Math.min(box.x0, box.x1)}px`,
    top: `${Math.min(box.y0, box.y1)}px`,
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

function paint(): void {
  const plotEl = plot.value;
  const svgEl = axes.value;
  const canvas = layer.value;
  if (!plotEl || !svgEl || !canvas) return;
  const width = plotEl.clientWidth;
  const height = plotEl.clientHeight;
  if (width < 100 || height < 100) return;
  const colors = palette.value;
  const [rangeMin, rangeMax] = rangeWindow.value;
  const span = Math.max(1, rangeMax - rangeMin);
  const pad = 36;
  const radius = Math.max(20, Math.min(width, height) / 2 - pad);
  center = { x: width / 2, y: height / 2, r: radius };
  empty.value = !hasDrawableScan(props.values);
  const root = d3.select(svgEl);
  root.attr("width", width).attr("height", height);
  root.selectAll("*").remove();
  const layerG = root.append("g").attr("transform", `translate(${view.value.x},${view.value.y}) scale(${view.value.k})`);
  const rings: number[] = [];
  const step = span >= 9000 ? 3000 : span >= 3000 ? 1000 : Math.max(100, Math.round(span / 4));
  for (let ring = Math.ceil(rangeMin / step) * step; ring <= rangeMax + 1e-6; ring += step) {
    if (ring > rangeMin) rings.push(ring);
  }
  if (!rings.length) rings.push(rangeMax);
  // 距离刻度写在对应圆环内侧靠下的位置，避开圆外的俯仰角或方位角。
  const ringDeg = props.mode === "rhi" ? 270 : 180;
  const ringInset = 14;
  for (const ring of rings) {
    const rPix = ((ring - rangeMin) / span) * radius;
    if (rPix <= 0) continue;
    layerG.append("circle").attr("cx", center.x).attr("cy", center.y).attr("r", rPix)
      .attr("fill", "none").attr("stroke", colors.grid).attr("stroke-dasharray", "4,6");
    if (rPix > ringInset + 8) {
      const label = polarPoint(props.mode, center.x, center.y, rPix - ringInset, ringDeg);
      layerG.append("text").attr("x", label.x).attr("y", label.y).attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", colors.label).attr("font-size", 11).text(`${Math.round(ring)}m`);
    }
  }
  for (const deg of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const end = polarPoint(props.mode, center.x, center.y, radius, deg);
    layerG.append("line").attr("x1", center.x).attr("y1", center.y).attr("x2", end.x).attr("y2", end.y)
      .attr("stroke", colors.grid);
    const text = polarPoint(props.mode, center.x, center.y, radius + 16, deg);
    layerG.append("text").attr("x", text.x).attr("y", text.y).attr("text-anchor", "middle")
      .attr("fill", colors.label).attr("font-size", 12).text(`${deg}°`);
  }
  layerG.append("circle").attr("cx", center.x).attr("cy", center.y).attr("r", 3).attr("fill", colors.label);

  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.translate(view.value.x, view.value.y);
  ctx.scale(view.value.k, view.value.k);
  if (empty.value) return;
  const color = buildScanColorScale(activeBreakpoints.value, activeColors.value, activeMode.value);
  const sectors = angleSectors(angles.value);
  const bounds = rangeBounds(ranges.value);
  ctx.globalAlpha = fillOpacity.value;
  angles.value.forEach((angle, angleIndex) => {
    const sector = sectors[angleIndex];
    if (!sector || !Number.isFinite(sector.start)) return;
    const row = props.values[angleIndex] || [];
    const gates = Math.min(ranges.value.length, row.length, Math.max(0, bounds.length - 1));
    for (let gate = 0; gate < gates; gate += 1) {
      if (isLidarMissingCell(row[gate])) continue;
      const inner = ((bounds[gate] - rangeMin) / span) * radius;
      const outer = ((bounds[gate + 1] - rangeMin) / span) * radius;
      if (!(outer > inner) || outer <= 0) continue;
      ctx.fillStyle = String(color(Number(row[gate])));
      ctx.beginPath();
      const outerStart = polarPoint(props.mode, center.x, center.y, Math.max(0, outer), sector.start);
      ctx.moveTo(outerStart.x, outerStart.y);
      const sweep = ((sector.end - sector.start + 540) % 360) - 180;
      for (let step = 1; step <= 8; step += 1) {
        const deg = sector.start + (sweep * step) / 8;
        const point = polarPoint(props.mode, center.x, center.y, Math.max(0, outer), ((deg % 360) + 360) % 360);
        ctx.lineTo(point.x, point.y);
      }
      for (let step = 8; step >= 0; step -= 1) {
        const deg = sector.start + (sweep * step) / 8;
        const point = polarPoint(props.mode, center.x, center.y, Math.max(0, inner), ((deg % 360) + 360) % 360);
        ctx.lineTo(point.x, point.y);
      }
      ctx.closePath();
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
}

function localPoint(event: PointerEvent): { x: number; y: number } {
  const rect = plot.value?.getBoundingClientRect();
  return { x: event.clientX - (rect?.left || 0), y: event.clientY - (rect?.top || 0) };
}

function unproject(point: { x: number; y: number }): { angle: number; range: number } | null {
  const [rangeMin, rangeMax] = rangeWindow.value;
  const x = center.x + (point.x - view.value.x - center.x) / view.value.k;
  const y = center.y + (point.y - view.value.y - center.y) / view.value.k;
  const dx = x - center.x;
  const dy = y - center.y;
  const pixel = Math.hypot(dx, dy);
  if (!(center.r > 0) || pixel > center.r) return null;
  const range = rangeMin + (pixel / center.r) * (rangeMax - rangeMin);
  let angle: number;
  if (props.mode === "rhi") {
    const theta = Math.atan2(-dy, dx);
    angle = 180 - (theta * 180) / Math.PI;
  } else {
    angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  }
  angle = ((angle % 360) + 360) % 360;
  return { angle, range };
}

function onPointerDown(event: PointerEvent): void {
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
    view.value = { ...view.value, x: view.value.x + point.x - panLast.x, y: view.value.y + point.y - panLast.y };
    panLast = point;
    schedule();
    return;
  }
  showTip(point);
}

function onPointerUp(event: PointerEvent): void {
  const box = drag.value;
  drag.value = null;
  panning.value = false;
  panLast = null;
  if (!box || !plot.value) return;
  const width = Math.abs(box.x1 - box.x0);
  const height = Math.abs(box.y1 - box.y0);
  if (width < 8 || height < 8) return;
  const hostW = plot.value.clientWidth;
  const hostH = plot.value.clientHeight;
  const nextK = Math.min(8, Math.max(view.value.k, Math.min(hostW / width, hostH / height) * view.value.k));
  const midX = (box.x0 + box.x1) / 2;
  const midY = (box.y0 + box.y1) / 2;
  view.value = {
    k: nextK,
    x: hostW / 2 - (midX - view.value.x) * (nextK / view.value.k),
    y: hostH / 2 - (midY - view.value.y) * (nextK / view.value.k),
  };
  schedule();
}

function onPointerLeave(): void {
  if (!panning.value && !drag.value) tip.show = false;
}

function showTip(point: { x: number; y: number }): void {
  const hitSpace = unproject(point);
  if (!hitSpace || empty.value) {
    tip.show = false;
    return;
  }
  const hit = scanCellAt(angles.value, ranges.value, props.values, hitSpace.angle, hitSpace.range);
  if (!hit) {
    tip.show = false;
    return;
  }
  const color = String(buildScanColorScale(activeBreakpoints.value, activeColors.value, activeMode.value)(hit.value));
  tip.show = true;
  tip.empty = false;
  tip.heading = modeLabel.value;
  tip.rows = [
    { label: angleLabel.value, value: `${hit.angle.toFixed(0)}°`, color },
    { label: "距离", value: `${hit.range.toFixed(0)} m`, color },
    { label: "数值", value: `${hit.value.toFixed(2)}${unitLabel.value ? ` ${unitLabel.value}` : ""}`, color },
  ];
  const host = plot.value;
  const width = tipEl.value?.offsetWidth || 180;
  const heightPx = tipEl.value?.offsetHeight || 88;
  let left = point.x + 14;
  let top = point.y - 8;
  if (host && left + width + 8 > host.clientWidth) left = Math.max(8, point.x - width - 16);
  if (host && top + heightPx + 8 > host.clientHeight) top = Math.max(8, host.clientHeight - heightPx - 8);
  tip.left = left;
  tip.top = Math.max(8, top);
}

function resetZoom(): void {
  view.value = { k: 1, x: 0, y: 0 };
  zooming.value = false;
  schedule();
}

function openSettings(): void {
  draftRange.value = [Math.round(rangeWindow.value[0]), Math.round(rangeWindow.value[1])];
  lastRange = draftRange.value;
  settingsOpen.value = true;
}

function onRangeSlide(value: number[] | number): void {
  if (!Array.isArray(value) || value.length < 2) return;
  let low = value[0];
  let high = value[1];
  if (high - low < rangeStep.value) {
    if (high !== lastRange[1]) high = Math.min(rangeSliderMax.value, low + rangeStep.value);
    else low = Math.max(0, high - rangeStep.value);
    draftRange.value = [low, high];
  }
  lastRange = [draftRange.value[0], draftRange.value[1]];
}

function applySettings(): void {
  appliedRange.value = [draftRange.value[0], draftRange.value[1]];
  settingsOpen.value = false;
  schedule();
}

function factoryReset(): void {
  appliedRange.value = null;
  view.value = { k: 1, x: 0, y: 0 };
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
  const points = draftBreakpoints.value.filter((item) => Number.isFinite(item));
  const target = draftLegendMode.value === "threshold" ? draftColors.value.length + 1 : draftColors.value.length;
  if (points.length >= 2 && target >= 2) {
    while (points.length < target) points.push(points[points.length - 1] + (points[points.length - 1] - points[points.length - 2] || 1));
    if (points.length > target) points.splice(target);
  }
  draftBreakpoints.value = points;
}

function evenLegend(): void {
  const points = draftBreakpoints.value.slice();
  if (points.length < 2) return;
  const step = (points[points.length - 1] - points[0]) / (points.length - 1);
  draftBreakpoints.value = points.map((_, index) => Number((points[0] + step * index).toPrecision(8)));
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
    const plotBox = plot.value?.getBoundingClientRect();
    const rootBox = root.getBoundingClientRect();
    if (plotBox) ctx.drawImage(canvas, (plotBox.left - rootBox.left) * ratio, (plotBox.top - rootBox.top) * ratio, plotBox.width * ratio, plotBox.height * ratio);
    if (svg && plotBox) {
      const xml = new XMLSerializer().serializeToString(svg);
      const image = new Image();
      const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
      await new Promise<void>((resolve) => { image.onload = () => resolve(); image.onerror = () => resolve(); image.src = url; });
      ctx.drawImage(image, (plotBox.left - rootBox.left) * ratio, (plotBox.top - rootBox.top) * ratio, plotBox.width * ratio, plotBox.height * ratio);
      URL.revokeObjectURL(url);
    }
    const link = document.createElement("a");
    link.href = output.toDataURL("image/png");
    link.download = "scan.png";
    link.click();
  } finally {
    downloading.value = false;
  }
}

function onWheel(event: WheelEvent): void {
  if (!plot.value) return;
  event.preventDefault();
  const point = { x: event.clientX - plot.value.getBoundingClientRect().left, y: event.clientY - plot.value.getBoundingClientRect().top };
  const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
  const nextK = Math.min(8, Math.max(1, view.value.k * factor));
  const applied = nextK / view.value.k;
  view.value = {
    k: nextK,
    x: point.x - (point.x - view.value.x) * applied,
    y: point.y - (point.y - view.value.y) * applied,
  };
  schedule();
}

watch(() => [props.mode, props.angles, props.heightArr, props.values, props.maxRange, props.theme, props.breakpoints, props.colors, props.colorMode, props.legendPlacement, props.unit, props.title], () => schedule());

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
.scan-chart { width: 100%; height: 100%; box-sizing: border-box; border: 1px solid; display: flex; flex-direction: column; overflow: hidden; }
.scan-toolbar { display: flex; justify-content: flex-end; gap: 8px; height: 28px; padding: 4px 8px 0; }
.scan-tool { position: relative; width: 20px; height: 20px; padding: 0; border: 0; background: transparent; cursor: pointer; }
.scan-tool img, .scan-tool__icon { position: absolute; left: 0; top: 0; width: 20px; height: 20px; }
.scan-tool__icon :deep(svg) { display: block; width: 20px; height: 20px; }
.scan-tool .hover { display: none; }
.scan-tool:hover:not(:disabled) .reg { display: none; }
.scan-tool:hover:not(:disabled) .hover { display: block; }
.scan-tool--zoom { border-radius: 50%; background: rgba(255, 255, 255, 0.1); }
.scan-tool--zoom .scan-tool__icon { display: flex; align-items: center; justify-content: center; }
.scan-tool--zoom :deep(svg) { width: 12px; height: 11px; }
.scan-tool--zoom :deep(path) { fill: #ffffff; fill-opacity: 0.8; }
.scan-tool--zoom:hover:not(:disabled), .scan-tool--zoom.is-active { background: rgba(32, 106, 255, 0.3); }
.scan-figure { display: flex; flex: 1; min-height: 0; gap: 6px; padding: 4px 8px 8px; }
.scan-figure.is-right { flex-direction: row; }
.scan-figure.is-bottom { flex-direction: column; }
.scan-plot { position: relative; flex: 1; min-width: 0; min-height: 0; cursor: crosshair; }
.scan-plot.is-pan { cursor: grabbing; }
.scan-axes, .scan-layer { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.scan-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.chart-tooltip { position: absolute; z-index: 5; min-width: 140px; max-width: 260px; padding: 8px 10px; border: 1px solid var(--thi-tip-border); border-radius: 2px; background: var(--thi-tip-bg); color: var(--thi-tip-text); font-size: 12px; line-height: 1.45; pointer-events: none; white-space: nowrap; }
.tip-time { margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid var(--thi-tip-line); color: var(--thi-tip-title); }
.tip-group-title { margin-bottom: 4px; }
.tip-row { display: flex; align-items: center; gap: 6px; }
.tip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.tip-empty { color: var(--thi-tip-muted); }
.scan-brush { position: absolute; z-index: 4; border: 1px solid var(--thi-brush-border); background: var(--thi-brush-fill); pointer-events: none; }
</style>

<style>
.scan-chart.is-dark, .thi-ep-dialog.is-dark {
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
.scan-chart.is-light, .thi-ep-dialog.is-light {
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
.scan-chart.is-light .scan-tool img, .scan-chart.is-light .scan-tool--zoom { filter: brightness(0); opacity: 0.72; }
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
.thi-ep-dialog .el-input__wrapper, .thi-ep-dialog .el-input-number__decrease, .thi-ep-dialog .el-input-number__increase { background: var(--thi-field-bg); box-shadow: 0 0 0 1px var(--thi-field-border) inset; }
.thi-ep-dialog .el-input__inner { color: var(--thi-field-text); }
.thi-ep-dialog .el-radio-button__inner { background: var(--thi-radio-bg); border-color: var(--thi-field-border); color: var(--thi-radio-text); }
.thi-ep-dialog .el-radio-button__original-radio:checked + .el-radio-button__inner { background: var(--thi-radio-active-bg); border-color: var(--thi-radio-active-border); color: var(--thi-radio-active-text); box-shadow: none; }
.thi-ep-dialog .legend-settings__footer { display: flex; align-items: center; gap: 8px; width: 100%; }
.thi-ep-dialog .legend-settings__footer-spacer { flex: 1; }
</style>
