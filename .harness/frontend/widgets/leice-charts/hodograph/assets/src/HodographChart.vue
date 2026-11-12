<template>
  <div ref="wrap" class="hodograph" :style="frameStyle">
    <svg ref="svg" class="chart-el"></svg>
    <div v-show="empty" class="chart-empty">无数据</div>
    <div v-show="tooltip.visible" ref="tooltipEl" class="chart-tooltip" :style="tooltipStyle">
      <div>高度: {{ tooltip.height }} km</div>
      <div>风速: {{ tooltip.speed }} m/s</div>
      <div>风向: {{ tooltip.dir }}°</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import * as d3 from "d3";
import {
  buildHodographPoints,
  hodographPath,
  niceMaxSpeed,
  toXY,
  type HodographPoint,
} from "./hodographSeries";
import { resolvePalette, type ChartPalette, type ChartThemeName } from "./themes";

const TRACE = "#F1414D";
const DOT = "#ff6b6b";
const DIR_LABELS = [
  { deg: 0, text: "N" },
  { deg: 90, text: "E" },
  { deg: 180, text: "S" },
  { deg: 270, text: "W" },
];

const props = withDefaults(defineProps<{
  layers?: { heightKm?: unknown; windSpeed?: unknown; windDir?: unknown }[] | null;
  theme?: ChartThemeName;
  palette?: Partial<ChartPalette> | null;
}>(), {
  layers: () => [],
  theme: "dark",
  palette: null,
});

const wrap = ref<HTMLDivElement | null>(null);
const svg = ref<SVGSVGElement | null>(null);
const tooltipEl = ref<HTMLDivElement | null>(null);
const empty = ref(true);
const tooltip = reactive({ visible: false, x: 0, y: 0, height: "", speed: "", dir: "" });

let resizeObserver: ResizeObserver | null = null;
let updateRaf = 0;
let points: HodographPoint[] = [];
let geometry: { cx: number; cy: number; radius: (speed: number) => number } | null = null;

const palette = computed(() => resolvePalette(props.theme, props.palette));
const frameStyle = computed(() => ({
  background: palette.value.frameBg,
  color: palette.value.label,
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

function updateChart(): void {
  const wrapEl = wrap.value;
  const svgEl = svg.value;
  if (!wrapEl || !svgEl) return;
  const width = wrapEl.clientWidth || 0;
  const height = wrapEl.clientHeight || 0;
  if (width < 40 || height < 40) return;

  const size = Math.min(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.max(24, size / 2 - 18);
  points = buildHodographPoints(props.layers);
  empty.value = points.length === 0;
  const maxSpeed = niceMaxSpeed(d3.max(points, (point) => point.speed) || 0);
  const radius = d3.scaleLinear().domain([0, maxSpeed]).range([0, maxR]);
  geometry = { cx, cy, radius };

  const colors = palette.value;
  const rootSel = d3.select(svgEl);
  rootSel.selectAll("*").remove();
  rootSel.attr("width", width).attr("height", height);
  const g = rootSel.append("g");

  if (colors.plotBg && colors.plotBg !== "transparent") {
    g.append("rect").attr("width", width).attr("height", height).attr("fill", colors.plotBg);
  }

  for (let index = 1; index <= 4; index += 1) {
    const speed = (maxSpeed * index) / 4;
    g.append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", radius(speed))
      .attr("fill", "none")
      .attr("stroke", colors.grid)
      .attr("stroke-dasharray", "1,1");
  }

  for (let angle = 0; angle < 360; angle += 22.5) {
    const tip = toXY(cx, cy, maxSpeed, angle, radius);
    g.append("line")
      .attr("x1", cx)
      .attr("y1", cy)
      .attr("x2", tip.x)
      .attr("y2", tip.y)
      .attr("stroke", angle % 90 === 0 ? colors.axis : colors.grid)
      .attr("stroke-width", angle % 90 === 0 ? 1.2 : 0.8)
      .attr("stroke-dasharray", angle % 90 === 0 ? null : "1,1");
  }

  for (const label of DIR_LABELS) {
    const at = toXY(cx, cy, maxSpeed, label.deg, () => maxR + 10);
    g.append("text")
      .attr("x", at.x)
      .attr("y", at.y)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", colors.label)
      .attr("font-size", 10)
      .attr("font-weight", 600)
      .text(label.text);
  }

  g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 2).attr("fill", colors.axis);

  const plotted = points.map((point) => ({ ...point, ...toXY(cx, cy, point.speed, point.dir, radius) }));
  const path = hodographPath(cx, cy, plotted);
  if (path) {
    g.append("path")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", TRACE)
      .attr("stroke-width", 2)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");
    g.selectAll("circle.layer-dot")
      .data(plotted)
      .enter()
      .append("circle")
      .attr("class", "layer-dot")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 2.5)
      .attr("fill", DOT)
      .attr("stroke", colors.focusDotStroke)
      .attr("stroke-width", 0.6);
  }
}

function onMove(event: MouseEvent): void {
  if (!points.length || !geometry || !wrap.value) {
    tooltip.visible = false;
    return;
  }
  const rect = wrap.value.getBoundingClientRect();
  const mx = event.clientX - rect.left;
  const my = event.clientY - rect.top;
  let best: HodographPoint | null = null;
  let bestDist = Infinity;
  for (const point of points) {
    const at = toXY(geometry.cx, geometry.cy, point.speed, point.dir, geometry.radius);
    const dist = Math.hypot(at.x - mx, at.y - my);
    if (dist < bestDist) {
      bestDist = dist;
      best = point;
    }
  }
  if (!best || bestDist > 14) {
    tooltip.visible = false;
    return;
  }
  tooltip.height = best.heightKm == null ? "--" : best.heightKm.toFixed(1);
  tooltip.speed = best.speed.toFixed(1);
  tooltip.dir = best.dir.toFixed(1);
  tooltip.visible = true;
  const tipW = tooltipEl.value?.offsetWidth || 120;
  const tipH = tooltipEl.value?.offsetHeight || 56;
  let x = mx + 12;
  let y = my - tipH - 8;
  if (x + tipW > rect.width) x = mx - tipW - 8;
  if (y < 0) y = my + 12;
  tooltip.x = Math.max(0, x);
  tooltip.y = Math.max(0, y);
}

watch(() => [props.layers, props.theme, props.palette], () => schedule(), { deep: true });

onMounted(() => {
  schedule();
  svg.value?.addEventListener("mousemove", onMove);
  svg.value?.addEventListener("mouseleave", () => {
    tooltip.visible = false;
  });
  resizeObserver = new ResizeObserver(() => schedule());
  if (wrap.value) resizeObserver.observe(wrap.value);
});

onBeforeUnmount(() => {
  if (updateRaf) cancelAnimationFrame(updateRaf);
  resizeObserver?.disconnect();
  svg.value?.removeEventListener("mousemove", onMove);
});
</script>

<style scoped>
.hodograph {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.chart-el {
  display: block;
  width: 100%;
  height: 100%;
}

.chart-empty {
  position: absolute;
  inset: 0;
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
  padding: 6px 8px;
  border: 1px solid;
  border-radius: 2px;
  font-size: 11px;
  line-height: 1.45;
  white-space: nowrap;
}
</style>
