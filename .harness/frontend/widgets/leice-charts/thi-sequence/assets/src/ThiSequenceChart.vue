<template>
  <div ref="wrap" class="thi-sequence" :class="legendClass" :style="frameStyle">
    <div ref="plot" class="seq-plot">
      <canvas ref="fillCanvas" class="fill-canvas"></canvas>
      <svg ref="svg" class="chart-el"></svg>
      <canvas ref="windCanvas" class="wind-canvas"></canvas>
      <div v-show="empty" class="chart-empty">无数据</div>
      <div v-show="tooltip.visible" ref="tooltipEl" class="chart-tooltip" :style="tooltipStyle">
        <div class="tip-title">{{ tooltip.timeText }}</div>
        <div v-for="row in tooltip.rows" :key="row.key" class="tip-row">
          <span class="dot" :style="{ background: row.color }"></span>
          <span>{{ row.name }}: {{ row.text }}</span>
        </div>
      </div>
    </div>
    <SequenceColorLegend
      v-if="shownScales.length"
      :scales="shownScales"
      :placement="activePlacement"
      :tick-side="tickSide"
      :tick-gap="tickGap"
      :style="legendStyle"
      @open-settings="openScaleSettings"
    />
    <SequenceLegendDialog
      :open="dialogOpen"
      :name="editingScale?.name || ''"
      :theme="theme"
      :color-mode="editingScale?.colorMode || 'threshold'"
      :colors="editingScale?.colors || []"
      :breakpoints="editingScale?.breakpoints || []"
      :opacity="editingScale?.opacity ?? 0.7"
      :placement="activePlacement"
      :tick-side="editingScale?.tickSide || tickSide"
      :tick-gap="editingScale?.tickGap ?? tickGap"
      :factory-mode="factoryScale?.colorMode || 'threshold'"
      :factory-colors="factoryScale?.colors || []"
      :factory-breakpoints="factoryScale?.breakpoints || []"
      :factory-opacity="factoryScale?.opacity ?? 0.7"
      :factory-placement="legendPlacement"
      :factory-tick-side="tickSide"
      :factory-tick-gap="tickGap"
      @apply="applyScaleSettings"
      @reset="resetScaleSettings"
      @close="dialogOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import * as d3 from "d3";
import { applyInwardAxes, buildYMajorTicks } from "./axis";
import { drawWindBarbPath } from "./barbSeries";
import { buildSequenceColorScale } from "./sequenceColor";
import { fillColorScales, type ScaleOverride } from "./sequenceLegend";
import SequenceColorLegend from "./SequenceColorLegend.vue";
import SequenceLegendDialog from "./SequenceLegendDialog.vue";
import {
  barbSamples,
  heightsAt,
  lineSeriesOf,
  nearestFiniteIndex,
  parseTimeMs,
  readCell,
  resolveTimeDomain,
  sequenceHasData,
  tipRows,
  type SequenceLayer,
} from "./sequenceData";
import { resolvePalette, type ChartPalette, type ChartThemeName } from "./themes";

const MARGIN = { top: 28, right: 16, bottom: 42, left: 52 };
let clipSerial = 0;

const props = withDefaults(defineProps<{
  timeStart?: string | number;
  timeEnd?: string | number;
  heightMin?: number;
  heightMax?: number;
  layers?: SequenceLayer[];
  windDensity?: number;
  windBarbScale?: number;
  windBarbLineWidth?: number;
  legendPlacement?: "right" | "bottom";
  tickSide?: "left" | "right";
  tickGap?: number;
  theme?: ChartThemeName;
  palette?: Partial<ChartPalette> | null;
}>(), {
  timeStart: "",
  timeEnd: "",
  heightMin: 0,
  heightMax: 10000,
  layers: () => [],
  windDensity: 3,
  windBarbScale: 0.8,
  windBarbLineWidth: 1,
  legendPlacement: "right",
  tickSide: "right",
  tickGap: 8,
  theme: "dark",
  palette: null,
});

const wrap = ref<HTMLDivElement | null>(null);
const plot = ref<HTMLDivElement | null>(null);
const svg = ref<SVGSVGElement | null>(null);
const fillCanvas = ref<HTMLCanvasElement | null>(null);
const windCanvas = ref<HTMLCanvasElement | null>(null);
const tooltipEl = ref<HTMLDivElement | null>(null);
const empty = ref(true);
const clipId = `seq-clip-${clipSerial += 1}`;
const tooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  timeText: "",
  rows: [] as { key: string; name: string; color: string; text: string }[],
});

let resizeObserver: ResizeObserver | null = null;
let updateRaf = 0;
let view: {
  x: d3.ScaleLinear<number, number>;
  y: d3.ScaleLinear<number, number>;
  layers: SequenceLayer[];
} | null = null;

const palette = computed(() => resolvePalette(props.theme, props.palette));
const scaleOverrides = reactive<Record<string, ScaleOverride>>({});
const placementOverride = ref<"right" | "bottom" | null>(null);
const dialogOpen = ref(false);
const editingKey = ref("");
const baseScales = computed(() => fillColorScales(props.layers || []));
const shownScales = computed(() => baseScales.value.map((scale) => {
  const over = scaleOverrides[scale.key];
  if (!over) {
    return { ...scale, tickSide: props.tickSide, tickGap: props.tickGap };
  }
  return {
    ...scale,
    colorMode: over.colorMode,
    breakpoints: over.breakpoints,
    colors: over.colors,
    opacity: over.opacity,
    tickSide: over.tickSide,
    tickGap: over.tickGap,
  };
}));
const activePlacement = computed(() => placementOverride.value ?? props.legendPlacement);
const editingScale = computed(() => shownScales.value.find((scale) => scale.key === editingKey.value) || null);
const factoryScale = computed(() => baseScales.value.find((scale) => scale.key === editingKey.value) || null);
const frameStyle = computed(() => ({
  background: palette.value.frameBg,
  borderColor: palette.value.frameBorder,
  color: palette.value.label,
}));
const colorScales = shownScales;
const legendClass = computed(() => (
  colorScales.value.length
    ? (activePlacement.value === "bottom" ? "is-legend-bottom" : "is-legend-right")
    : ""
));
const legendStyle = computed(() => ({
  "--seq-bar-bg": palette.value.tooltipBg,
  "--seq-bar-border": palette.value.tooltipBorder,
  "--seq-bar-tick": palette.value.label,
  "--seq-bar-unit": palette.value.tipTitle,
  "--seq-bar-title": palette.value.title,
}));
const tooltipStyle = computed(() => ({
  left: `${tooltip.x}px`,
  top: `${tooltip.y}px`,
  background: palette.value.tooltipBg,
  borderColor: palette.value.tooltipBorder,
  color: palette.value.tooltipText,
}));

function schedule(): void {
  if (updateRaf) return;
  updateRaf = requestAnimationFrame(() => {
    updateRaf = 0;
    updateChart();
  });
}

function resolvePaintLayers(layers: SequenceLayer[]): SequenceLayer[] {
  return layers.map((layer) => {
    const over = scaleOverrides[layer.key];
    if (!over || layer.drawType !== "fill") return layer;
    return {
      ...layer,
      colorType: over.colorMode,
      breakpoints: over.breakpoints,
      colors: over.colors,
      opacity: over.opacity,
    };
  });
}

function openScaleSettings(key: string): void {
  editingKey.value = key;
  dialogOpen.value = true;
}

function applyScaleSettings(value: ScaleOverride & { placement: "right" | "bottom" }): void {
  if (!editingKey.value) return;
  scaleOverrides[editingKey.value] = {
    colorMode: value.colorMode,
    breakpoints: value.breakpoints,
    colors: value.colors,
    opacity: value.opacity,
    tickSide: value.tickSide,
    tickGap: value.tickGap,
  };
  placementOverride.value = value.placement;
  dialogOpen.value = false;
  schedule();
}

function resetScaleSettings(): void {
  if (editingKey.value) delete scaleOverrides[editingKey.value];
  placementOverride.value = null;
  schedule();
}

function formatClock(ms: number, withDate: boolean): string {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, "0");
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (!withDate) return clock;
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${clock}`;
}

function timeTicks(domain: [number, number]): number[] {
  const span = domain[1] - domain[0];
  const hour = 3600 * 1000;
  const step = span <= 6 * hour ? 30 * 60 * 1000 : span <= 24 * hour ? 2 * hour : 6 * hour;
  const ticks: number[] = [];
  let cursor = Math.ceil(domain[0] / step) * step;
  for (; cursor <= domain[1]; cursor += step) ticks.push(cursor);
  if (!ticks.length || ticks[0] !== domain[0]) ticks.unshift(domain[0]);
  if (ticks[ticks.length - 1] !== domain[1]) ticks.push(domain[1]);
  return ticks;
}

function prepareCanvas(canvasEl: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  canvasEl.width = Math.max(1, Math.floor(width * dpr));
  canvasEl.height = Math.max(1, Math.floor(height * dpr));
  canvasEl.style.width = `${width}px`;
  canvasEl.style.height = `${height}px`;
  const ctx = canvasEl.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return ctx;
}

function paintFill(
  ctx: CanvasRenderingContext2D,
  layer: SequenceLayer,
  x: d3.ScaleLinear<number, number>,
  y: d3.ScaleLinear<number, number>,
  innerW: number,
  innerH: number,
): void {
  const times = (layer.timeArr || []).map(parseTimeMs);
  if (!times.some((item) => item != null)) return;
  const scale = layer.breakpoints && layer.colors
    ? buildSequenceColorScale(layer.breakpoints, layer.colors, layer.colorType === "linear" ? "linear" : "threshold")
    : null;
  const fallback = layer.color || "#4EA8FF";
  ctx.save();
  ctx.beginPath();
  ctx.rect(MARGIN.left, MARGIN.top, innerW, innerH);
  ctx.clip();
  ctx.globalAlpha = layer.opacity ?? 0.7;
  const step = 2;
  for (let px = 0; px < innerW; px += step) {
    const timeIndex = nearestFiniteIndex(times, x.invert(px));
    if (timeIndex < 0) continue;
    const heights = heightsAt(layer, timeIndex);
    for (let py = 0; py < innerH; py += step) {
      const heightIndex = nearestFiniteIndex(heights, y.invert(py));
      if (heightIndex < 0) continue;
      const value = readCell(layer, timeIndex, heightIndex);
      if (value == null) continue;
      ctx.fillStyle = scale ? String(scale(value)) : fallback;
      ctx.fillRect(MARGIN.left + px, MARGIN.top + py, step, step);
    }
  }
  ctx.restore();
}

function updateChart(): void {
  const plotEl = plot.value;
  const svgEl = svg.value;
  const fillEl = fillCanvas.value;
  const windEl = windCanvas.value;
  if (!plotEl || !svgEl || !fillEl || !windEl) return;
  const width = plotEl.clientWidth || 0;
  const height = plotEl.clientHeight || 0;
  if (width < 40 || height < 40) return;

  const innerW = Math.max(10, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(10, height - MARGIN.top - MARGIN.bottom);
  const yDomain: [number, number] = [props.heightMin, props.heightMax];
  if (!(yDomain[1] > yDomain[0])) return;
  const layers = resolvePaintLayers(props.layers || []);
  const timeDomain = resolveTimeDomain(props.timeStart, props.timeEnd, layers);
  empty.value = !timeDomain || !sequenceHasData(layers, props.windDensity);
  const xDomain = timeDomain || [0, 1];
  const x = d3.scaleLinear().domain(xDomain).range([0, innerW]);
  const y = d3.scaleLinear().domain(yDomain).range([innerH, 0]);
  view = empty.value || !timeDomain ? null : { x, y, layers };
  const colors = palette.value;

  const fillCtx = prepareCanvas(fillEl, width, height);
  const windCtx = prepareCanvas(windEl, width, height);
  if (fillCtx && !empty.value) {
    if (colors.plotBg && colors.plotBg !== "transparent") {
      fillCtx.fillStyle = colors.plotBg;
      fillCtx.fillRect(MARGIN.left, MARGIN.top, innerW, innerH);
    }
    for (const layer of layers) {
      if (layer.visible === false || layer.drawType !== "fill") continue;
      paintFill(fillCtx, layer, x, y, innerW, innerH);
    }
  }

  const rootSel = d3.select(svgEl);
  rootSel.selectAll("*").remove();
  rootSel.attr("width", width).attr("height", height);
  const root = rootSel.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
  root.append("defs").append("clipPath").attr("id", clipId)
    .append("rect").attr("width", innerW).attr("height", innerH);

  const yTicks = buildYMajorTicks(yDomain);
  const ticks = timeDomain ? timeTicks(timeDomain) : [];
  const withDate = !!timeDomain && timeDomain[1] - timeDomain[0] > 24 * 3600 * 1000;
  root.append("g").attr("class", "grid-x")
    .selectAll("line")
    .data(ticks)
    .enter()
    .append("line")
    .attr("stroke", colors.grid)
    .attr("stroke-dasharray", "4,4")
    .attr("x1", (d) => x(d))
    .attr("x2", (d) => x(d))
    .attr("y1", 0)
    .attr("y2", innerH);
  root.append("g").attr("class", "grid-y")
    .selectAll("line")
    .data(yTicks)
    .enter()
    .append("line")
    .attr("stroke", colors.grid)
    .attr("stroke-dasharray", "4,4")
    .attr("x1", 0)
    .attr("x2", innerW)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d));

  root.append("g").attr("class", "axis-x");
  root.append("g").attr("class", "axis-y-minor");
  root.append("g").attr("class", "axis-y");
  root.append("rect").attr("class", "plot-frame").attr("fill", "none").attr("pointer-events", "none");
  if (timeDomain) {
    applyInwardAxes(root, {
      x,
      y,
      innerW,
      innerH,
      yMajorTicks: yTicks,
      xTickValues: ticks,
      xTickFormat: (value) => formatClock(Number(value), withDate),
      stroke: colors.axis,
    });
  }
  root.selectAll(".axis-x text, .axis-y text").attr("fill", colors.label).attr("font-size", 11);
  root.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .attr("fill", colors.label)
    .attr("font-size", 11)
    .text("高度(m)");

  const lineLayer = root.append("g").attr("clip-path", `url(#${clipId})`);
  if (!empty.value) {
    for (const layer of layers) {
      if (layer.visible === false || layer.drawType !== "line") continue;
      const smooth = layer.smooth !== false;
      for (const series of lineSeriesOf(layer)) {
        const generator = d3.line<{ t: number; h: number | null }>()
          .defined((point) => point.h != null && Number.isFinite(point.t))
          .x((point) => x(point.t))
          .y((point) => y(point.h as number))
          .curve(smooth ? d3.curveMonotoneX : d3.curveLinear);
        const path = generator(series.points);
        if (!path) continue;
        lineLayer.append("path")
          .attr("fill", "none")
          .attr("stroke", series.color)
          .attr("stroke-width", 1.6)
          .attr("d", path);
      }
    }
  }

  if (windCtx && !empty.value) {
    windCtx.save();
    windCtx.beginPath();
    windCtx.rect(MARGIN.left, MARGIN.top, innerW, innerH);
    windCtx.clip();
    windCtx.lineCap = "round";
    windCtx.lineJoin = "round";
    for (const layer of layers) {
      if (layer.visible === false || layer.drawType !== "windBarb") continue;
      windCtx.strokeStyle = layer.color || colors.barb;
      const samples = barbSamples(layer, layer.density ?? props.windDensity);
      for (const sample of samples) {
        const px = MARGIN.left + x(sample.timeMs);
        const py = MARGIN.top + y(sample.height);
        if (px < MARGIN.left - 20 || px > MARGIN.left + innerW + 20) continue;
        if (py < MARGIN.top - 20 || py > MARGIN.top + innerH + 20) continue;
        drawWindBarbPath(windCtx, px, py, sample.speed, sample.dir, {
          sizeScale: props.windBarbScale,
          lineWidth: props.windBarbLineWidth,
        });
      }
    }
    windCtx.restore();
  }

  const focus = root.append("g").attr("class", "focus").style("display", "none");
  focus.append("line").attr("class", "cross-x").attr("stroke", colors.cross).attr("stroke-dasharray", "3,3");
  focus.append("line").attr("class", "cross-y").attr("stroke", colors.cross).attr("stroke-dasharray", "3,3");
  root.append("rect")
    .attr("class", "overlay")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "transparent")
    .style("cursor", empty.value ? "default" : "crosshair")
    .on("mouseenter", () => {
      if (empty.value) return;
      focus.style("display", null);
    })
    .on("mouseleave", () => {
      focus.style("display", "none");
      tooltip.visible = false;
    })
    .on("mousemove", (event) => {
      if (!view) return;
      const [mouseX, mouseY] = d3.pointer(event);
      const timeMs = view.x.invert(mouseX);
      const heightM = view.y.invert(mouseY);
      focus.select(".cross-x").attr("x1", 0).attr("x2", innerW).attr("y1", mouseY).attr("y2", mouseY);
      focus.select(".cross-y").attr("x1", mouseX).attr("x2", mouseX).attr("y1", 0).attr("y2", innerH);
      const rows = tipRows(view.layers, timeMs, heightM);
      tooltip.rows = rows;
      tooltip.timeText = formatClock(timeMs, withDate);
      tooltip.visible = rows.length > 0;
      placeTooltip(plotEl, MARGIN.left + mouseX + 12, MARGIN.top + mouseY - 28);
    });
}

function placeTooltip(plotEl: HTMLDivElement, prefX: number, prefY: number): void {
  const tip = tooltipEl.value;
  const tipW = tip?.offsetWidth || 160;
  const tipH = tip?.offsetHeight || 72;
  const maxX = Math.max(8, plotEl.clientWidth - tipW - 8);
  const maxY = Math.max(8, plotEl.clientHeight - tipH - 8);
  let x = Math.min(Math.max(8, prefX), maxX);
  let y = prefY;
  if (y + tipH > plotEl.clientHeight - 8) y = prefY - tipH - 12;
  if (y < 8) y = 8;
  if (y > maxY) y = maxY;
  tooltip.x = x;
  tooltip.y = y;
}

watch(
  () => [props.timeStart, props.timeEnd, props.heightMin, props.heightMax, props.layers, props.windDensity, props.windBarbScale, props.windBarbLineWidth, props.legendPlacement, props.tickSide, props.tickGap, props.theme, props.palette],
  () => schedule(),
  { deep: true },
);

onMounted(() => {
  schedule();
  resizeObserver = new ResizeObserver(() => schedule());
  if (plot.value) resizeObserver.observe(plot.value);
  if (wrap.value) resizeObserver.observe(wrap.value);
});

onBeforeUnmount(() => {
  if (updateRaf) cancelAnimationFrame(updateRaf);
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.thi-sequence {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 1px solid;
  overflow: hidden;
}

.thi-sequence.is-legend-bottom {
  flex-direction: column;
}

.seq-plot {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.fill-canvas,
.chart-el,
.wind-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.fill-canvas { z-index: 1; pointer-events: none; }
.chart-el { z-index: 2; }
.wind-canvas { z-index: 3; pointer-events: none; }

.chart-empty {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  pointer-events: none;
}

.chart-tooltip {
  position: absolute;
  z-index: 5;
  pointer-events: none;
  min-width: 140px;
  padding: 6px 8px;
  border: 1px solid;
  border-radius: 2px;
  font-size: 12px;
  line-height: 1.45;
}

.tip-title { margin-bottom: 2px; }
.tip-row { display: flex; align-items: center; gap: 6px; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }

:deep(.axis-x .domain),
:deep(.axis-y .domain),
:deep(.axis-y-minor .domain) {
  display: none;
}
</style>
