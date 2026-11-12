<template>
  <div ref="wrap" class="barb-profile" :style="frameStyle">
    <svg ref="svg" class="chart-el"></svg>
    <canvas ref="canvas" class="canvas-layer"></canvas>
    <div v-show="empty" class="chart-empty">无数据</div>
    <div v-show="tooltip.visible" ref="tooltipEl" class="chart-tooltip" :style="tooltipStyle">
      <div class="tip-title">{{ displayTitle }}</div>
      <div>高度: {{ tooltip.height }} m</div>
      <div>风速: {{ tooltip.speed }} m/s</div>
      <div>风向: {{ tooltip.dir }}°</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import * as d3 from "d3";
import { applyInwardAxes, buildYMajorTicks } from "./axis";
import { buildBarbs, drawWindBarbPath, hasDrawableBarb, pickBarbSlots, type BarbSlot } from "./barbSeries";
import { resolvePalette, type ChartPalette, type ChartThemeName } from "./themes";

const MARGIN = { top: 36, right: 16, bottom: 36, left: 52 };

const props = withDefaults(defineProps<{
  title?: string;
  color?: string;
  heightArr?: unknown[];
  value?: unknown[];
  dirArr?: unknown[];
  heightMin?: number;
  heightMax?: number;
  theme?: ChartThemeName;
  palette?: Partial<ChartPalette> | null;
}>(), {
  title: "风羽",
  color: "",
  heightArr: () => [],
  value: () => [],
  dirArr: () => [],
  heightMin: 0,
  heightMax: 10000,
  theme: "dark",
  palette: null,
});

const wrap = ref<HTMLDivElement | null>(null);
const svg = ref<SVGSVGElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const tooltipEl = ref<HTMLDivElement | null>(null);
const empty = ref(true);
const tooltip = reactive({ visible: false, x: 0, y: 0, height: "", speed: "", dir: "" });

let resizeObserver: ResizeObserver | null = null;
let updateRaf = 0;
let drawn: BarbSlot[] = [];
let yScale: d3.ScaleLinear<number, number> | null = null;
let xCenter = 0;

const palette = computed(() => resolvePalette(props.theme, props.palette));
const strokeColor = computed(() => props.color || palette.value.barb);
const frameStyle = computed(() => ({
  background: palette.value.frameBg,
  borderColor: palette.value.frameBorder,
  color: palette.value.label,
}));
const displayTitle = computed(() => props.title || "风羽");
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

function updateChart(): void {
  const wrapEl = wrap.value;
  const svgEl = svg.value;
  const canvasEl = canvas.value;
  if (!wrapEl || !svgEl || !canvasEl) return;
  const width = wrapEl.clientWidth || 0;
  const height = wrapEl.clientHeight || 0;
  if (width < 40 || height < 40) return;

  const innerW = Math.max(10, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(10, height - MARGIN.top - MARGIN.bottom);
  const yDomain: [number, number] = [props.heightMin, props.heightMax];
  if (!(yDomain[1] > yDomain[0])) return;

  const slots = buildBarbs(props.heightArr, props.value, props.dirArr);
  const y = d3.scaleLinear().domain(yDomain).range([innerH, 0]);
  drawn = pickBarbSlots(slots, (h) => y(h), innerH);
  empty.value = !hasDrawableBarb(slots);
  yScale = y;
  xCenter = MARGIN.left + innerW / 2;
  const colors = palette.value;

  const rootSel = d3.select(svgEl);
  rootSel.selectAll("*").remove();
  rootSel.attr("width", width).attr("height", height);
  rootSel.append("text")
    .attr("x", width / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("fill", colors.title)
    .attr("font-size", 13)
    .attr("font-weight", 500)
    .text(displayTitle.value);

  const root = rootSel.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
  root.append("rect")
    .attr("class", "plot-bg")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", colors.plotBg)
    .attr("pointer-events", "none");

  const yTicks = buildYMajorTicks(yDomain);
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

  root.append("line")
    .attr("x1", innerW / 2)
    .attr("x2", innerW / 2)
    .attr("y1", 0)
    .attr("y2", innerH)
    .attr("stroke", colors.grid)
    .attr("stroke-dasharray", "3,3");

  root.append("g").attr("class", "axis-y-minor");
  root.append("g").attr("class", "axis-y");
  root.append("rect").attr("class", "plot-frame").attr("fill", "none").attr("pointer-events", "none");
  applyInwardAxes(root, {
    x: d3.scaleLinear().domain([0, 1]).range([0, innerW]),
    y,
    innerW,
    innerH,
    yMajorTicks: yTicks,
    showX: false,
    stroke: colors.axis,
  });
  root.selectAll(".axis-y text").attr("fill", colors.label).attr("font-size", 11);
  root.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .attr("fill", colors.label)
    .attr("font-size", 11)
    .text("高度(m)");

  const dpr = window.devicePixelRatio || 1;
  canvasEl.width = Math.floor(width * dpr);
  canvasEl.height = Math.floor(height * dpr);
  canvasEl.style.width = `${width}px`;
  canvasEl.style.height = `${height}px`;
  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(MARGIN.left, MARGIN.top, innerW, innerH);
  ctx.clip();
  ctx.strokeStyle = strokeColor.value;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const slot of drawn) {
    drawWindBarbPath(ctx, xCenter, MARGIN.top + y(slot.height), slot.speed, slot.dir, { lineWidth: 1.5 });
  }
  ctx.restore();
}

function onMove(event: MouseEvent): void {
  if (!yScale || !drawn.length || !canvas.value) {
    tooltip.visible = false;
    return;
  }
  const rect = canvas.value.getBoundingClientRect();
  const target = yScale.invert(event.clientY - rect.top - MARGIN.top);
  let best = drawn[0];
  let bestDist = Math.abs(best.height - target);
  for (const slot of drawn) {
    const dist = Math.abs(slot.height - target);
    if (dist < bestDist) {
      best = slot;
      bestDist = dist;
    }
  }
  tooltip.visible = true;
  tooltip.height = best.height.toFixed(0);
  tooltip.speed = best.speed.toFixed(1);
  tooltip.dir = best.dir.toFixed(0);
  const cy = MARGIN.top + yScale(best.height);
  placeTooltip(xCenter + 16, cy - 40);
}

function placeTooltip(prefX: number, prefY: number): void {
  const wrapEl = wrap.value;
  const tip = tooltipEl.value;
  if (!wrapEl) return;
  const tipW = tip?.offsetWidth || 130;
  const tipH = tip?.offsetHeight || 70;
  const maxX = Math.max(8, wrapEl.clientWidth - tipW - 8);
  const maxY = Math.max(8, wrapEl.clientHeight - tipH - 8);
  let x = Math.min(Math.max(8, prefX), maxX);
  let y = prefY;
  if (y + tipH > wrapEl.clientHeight - 8) y = prefY - tipH - 12;
  if (y < 8) y = 8;
  if (y > maxY) y = maxY;
  tooltip.x = x;
  tooltip.y = y;
}

watch(
  () => [props.title, props.color, props.heightMin, props.heightMax, props.theme, props.palette, props.heightArr, props.value, props.dirArr],
  () => schedule(),
  { deep: true },
);

onMounted(() => {
  schedule();
  canvas.value?.addEventListener("mousemove", onMove);
  canvas.value?.addEventListener("mouseleave", () => {
    tooltip.visible = false;
  });
  resizeObserver = new ResizeObserver(() => schedule());
  if (wrap.value) resizeObserver.observe(wrap.value);
});

onBeforeUnmount(() => {
  if (updateRaf) cancelAnimationFrame(updateRaf);
  resizeObserver?.disconnect();
  canvas.value?.removeEventListener("mousemove", onMove);
});
</script>

<style scoped>
.barb-profile {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 1px solid;
  position: relative;
  overflow: hidden;
}

.chart-el,
.canvas-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.chart-el { z-index: 1; pointer-events: none; }
.canvas-layer { z-index: 2; }

.chart-empty {
  position: absolute;
  inset: 0;
  z-index: 3;
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
  min-width: 110px;
  padding: 6px 8px;
  border: 1px solid;
  border-radius: 2px;
  font-size: 12px;
  line-height: 1.45;
}

.tip-title { margin-bottom: 2px; }

:deep(.axis-y .domain),
:deep(.axis-y-minor .domain) {
  display: none;
}
</style>
