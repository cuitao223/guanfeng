<template>
  <div ref="wrap" class="compare-chart" :style="frameStyle">
    <svg ref="svg" class="chart-el"></svg>
    <div v-show="empty" class="chart-empty">无数据</div>
    <div v-show="tooltip.visible" ref="tooltipEl" class="chart-tooltip" :style="tooltipStyle">
      <div class="tip-title">{{ displayTitle }}</div>
      <div>高度: {{ tooltip.height }} m</div>
      <div v-for="row in tooltip.rows" :key="row.key" class="tip-row">
        <span class="dot" :style="{ background: row.color }"></span>
        <span>{{ row.name }}: {{ row.value }}<span v-if="unit"> {{ unit }}</span></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import * as d3 from "d3";
import { applyInwardAxes, buildYMajorTicks } from "./axis";
import {
  buildCompareSeries,
  compareLinePath,
  hasDrawableSeries,
  resolveXDomain,
  sampleAtHeight,
  type ComparePoint,
  type CompareSeries,
  type CompareSeriesInput,
} from "./compareSeries";
import { resolvePalette, type ChartPalette, type ChartThemeName } from "./themes";

const MARGIN = { top: 36, right: 16, bottom: 36, left: 52 };
let clipSerial = 0;

const props = withDefaults(defineProps<{
  title?: string;
  unit?: string;
  heightMin?: number;
  heightMax?: number;
  series?: CompareSeriesInput[];
  empty?: boolean;
  valueDecimals?: number;
  theme?: ChartThemeName;
  palette?: Partial<ChartPalette> | null;
}>(), {
  title: "",
  unit: "",
  heightMin: 0,
  heightMax: 10000,
  series: () => [],
  empty: false,
  valueDecimals: 2,
  theme: "dark",
  palette: null,
});

const wrap = ref<HTMLDivElement | null>(null);
const svg = ref<SVGSVGElement | null>(null);
const tooltipEl = ref<HTMLDivElement | null>(null);
const empty = ref(true);
const clipId = `compare-clip-${clipSerial += 1}`;
const tooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  height: "",
  rows: [] as { key: string; name: string; color: string; value: string }[],
});

let resizeObserver: ResizeObserver | null = null;
let updateRaf = 0;
let drawn: CompareSeries[] = [];

const palette = computed(() => resolvePalette(props.theme, props.palette));
const frameStyle = computed(() => ({
  background: palette.value.frameBg,
  borderColor: palette.value.frameBorder,
  color: palette.value.label,
}));
const displayTitle = computed(() => {
  const title = props.title || "";
  const unit = (props.unit || "").trim();
  if (!unit || title.includes(unit)) return title;
  return `${title}(${unit})`;
});
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

function formatX(value: d3.NumberValue): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "0";
  return n.toFixed(Math.abs(n) >= 0.1 ? 1 : 2);
}

function updateChart(): void {
  const wrapEl = wrap.value;
  const svgEl = svg.value;
  if (!wrapEl || !svgEl) return;
  const width = wrapEl.clientWidth || 0;
  const height = wrapEl.clientHeight || 0;
  if (width < 40 || height < 40) return;

  const innerW = Math.max(10, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(10, height - MARGIN.top - MARGIN.bottom);
  const yDomain: [number, number] = [props.heightMin, props.heightMax];
  if (!(yDomain[1] > yDomain[0])) return;

  const inputs = props.empty ? [] : props.series;
  drawn = inputs.map((item, index) => buildCompareSeries(item, props.heightMin, props.heightMax, index));
  empty.value = !hasDrawableSeries(drawn);

  const xDomain = resolveXDomain(drawn);
  const x = d3.scaleLinear().domain(xDomain).range([0, innerW]);
  const y = d3.scaleLinear().domain(yDomain).range([innerH, 0]);
  const colors = palette.value;
  const rootSel = d3.select(svgEl);
  rootSel.attr("width", width).attr("height", height);
  rootSel.selectAll("*").remove();

  rootSel.append("text")
    .attr("class", "chart-title")
    .attr("text-anchor", "middle")
    .attr("fill", colors.title)
    .attr("font-size", 13)
    .attr("font-weight", 500)
    .attr("x", width / 2)
    .attr("y", 18)
    .text(displayTitle.value);

  const root = rootSel.append("g").attr("class", "plot-root")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  root.append("defs").append("clipPath").attr("id", clipId)
    .append("rect").attr("width", innerW).attr("height", innerH);

  root.append("rect")
    .attr("class", "plot-bg")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", colors.plotBg)
    .attr("pointer-events", "none");

  const yTicks = buildYMajorTicks(yDomain);
  root.append("g").attr("class", "grid-x")
    .selectAll("line")
    .data(x.ticks(5))
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
  applyInwardAxes(root, {
    x,
    y,
    innerW,
    innerH,
    yMajorTicks: yTicks,
    xTickFormat: formatX,
    stroke: colors.axis,
  });
  root.selectAll(".axis-x text, .axis-y text").attr("fill", colors.label).attr("font-size", 11);
  root.append("text")
    .attr("class", "y-name")
    .attr("text-anchor", "middle")
    .attr("fill", colors.label)
    .attr("font-size", 11)
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -40)
    .text("高度(m)");

  const layer = root.append("g").attr("class", "series-layer").attr("clip-path", `url(#${clipId})`);
  for (const series of drawn) {
    const path = compareLinePath(series.slots, (value) => x(value), (h) => y(h));
    if (path) {
      layer.append("path")
        .attr("class", "series-line")
        .attr("fill", "none")
        .attr("stroke", series.color)
        .attr("stroke-width", 2)
        .attr("d", path);
    }
    const isolated = series.slots.filter((slot, index): slot is ComparePoint => {
      if (!slot) return false;
      const before = index > 0 && series.slots[index - 1] != null;
      const after = index + 1 < series.slots.length && series.slots[index + 1] != null;
      return !before && !after;
    });
    layer.append("g")
      .selectAll("circle")
      .data(isolated)
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("fill", series.color)
      .attr("cx", (slot) => x(slot.value))
      .attr("cy", (slot) => y(slot.height));
  }

  const focus = root.append("g").attr("class", "focus").style("display", "none");
  focus.append("line").attr("class", "cross-h").attr("stroke", colors.cross).attr("stroke-dasharray", "3,3");
  focus.append("g").attr("class", "focus-dots");

  root.append("rect")
    .attr("class", "overlay")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "transparent")
    .style("cursor", empty.value ? "default" : "crosshair")
    .on("mouseenter", () => {
      if (empty.value) return;
      focus.style("display", null);
      tooltip.visible = true;
    })
    .on("mouseleave", () => {
      focus.style("display", "none");
      tooltip.visible = false;
    })
    .on("mousemove", (event) => {
      if (empty.value) return;
      const [, mouseY] = d3.pointer(event);
      const target = y.invert(mouseY);
      const cy = y(Math.min(yDomain[1], Math.max(yDomain[0], target)));
      focus.select(".cross-h").attr("x1", 0).attr("x2", innerW).attr("y1", cy).attr("y2", cy);
      const dots = focus.select(".focus-dots");
      dots.selectAll("*").remove();
      const rows: { key: string; name: string; color: string; value: string }[] = [];
      for (const series of drawn) {
        const sampled = sampleAtHeight(series.slots, target);
        if (sampled == null || !Number.isFinite(sampled)) continue;
        dots.append("circle")
          .attr("r", 3.5)
          .attr("cx", x(sampled))
          .attr("cy", cy)
          .attr("fill", series.color)
          .attr("stroke", colors.focusDotStroke);
        rows.push({
          key: series.key,
          name: series.name,
          color: series.color,
          value: sampled.toFixed(Math.max(0, props.valueDecimals)),
        });
      }
      tooltip.height = target.toFixed(0);
      tooltip.rows = rows;
      tooltip.visible = rows.length > 0;
      placeTooltip(wrapEl, MARGIN.left + 12, MARGIN.top + cy - 28);
    });
}

function placeTooltip(wrapEl: HTMLDivElement, prefX: number, prefY: number): void {
  const tip = tooltipEl.value;
  const tipW = tip?.offsetWidth || 150;
  const tipH = tip?.offsetHeight || 64;
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
  () => [props.title, props.unit, props.heightMin, props.heightMax, props.empty, props.valueDecimals, props.theme, props.palette, props.series],
  () => schedule(),
  { deep: true },
);

onMounted(() => {
  schedule();
  resizeObserver = new ResizeObserver(() => schedule());
  if (wrap.value) resizeObserver.observe(wrap.value);
});

onBeforeUnmount(() => {
  if (updateRaf) cancelAnimationFrame(updateRaf);
  resizeObserver?.disconnect();
  if (svg.value) d3.select(svg.value).selectAll("*").remove();
});
</script>

<style scoped>
.compare-chart {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 1px solid;
  position: relative;
  overflow: hidden;
}

.chart-el {
  width: 100%;
  height: 100%;
  display: block;
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
  min-width: 120px;
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
