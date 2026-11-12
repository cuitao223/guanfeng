<template>
  <div ref="wrap" class="flux-calendar" :class="themeClass">
    <svg ref="svg" class="chart-el"></svg>
    <div v-show="tip.show" class="chart-tip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">{{ tip.text }}</div>
  </div>
</template>

<script lang="ts" setup>
import * as d3 from "d3";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import {
  DBS_DOMAIN,
  EMPTY_TEXT,
  FLUX_COLORS,
  INVALID_FLUX_TEXT,
  MONTH_LABELS,
  WEEKDAY_LABELS,
  buildDaySeries,
  buildMonthMatrix,
  buildWeekMatrix,
  fluxColor,
  type FluxRow,
} from "./fluxCalendar";

const CELL = 14;
const GAP = 2;
const STEP = CELL + GAP;

const props = withDefaults(
  defineProps<{
    rows?: FluxRow[];
    years?: Array<number | string>;
    field?: string;
    mode?: "day" | "week" | "month";
    domain?: number[];
    unit?: string;
    theme?: "dark" | "light";
  }>(),
  {
    rows: () => [],
    years: () => [],
    field: "verticalAvg",
    mode: "day",
    domain: () => DBS_DOMAIN.slice(),
    unit: "µg/m²/s",
    theme: "light",
  }
);

const wrap = ref<HTMLDivElement | null>(null);
const svg = ref<SVGSVGElement | null>(null);
const tip = reactive({ show: false, x: 0, y: 0, text: "" });
const themeClass = computed(() => (props.theme === "dark" ? "is-dark" : "is-light"));
let raf = 0;
let observer: ResizeObserver | null = null;

const ink = computed(() => (props.theme === "dark" ? "#d7ecff" : "#2c3e50"));
const emptyFill = computed(() => (props.theme === "dark" ? "#1c3148" : "#ededed"));
const border = computed(() => (props.theme === "dark" ? "#4d6d8c" : "#c8c8c8"));
const paper = computed(() => (props.theme === "dark" ? "#0d1b2a" : "#ffffff"));

function schedule() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    raf = 0;
    draw();
  });
}

function hideTip() {
  tip.show = false;
}

function showTip(event: MouseEvent, text: string) {
  const host = wrap.value;
  if (!host) return;
  const rect = host.getBoundingClientRect();
  tip.text = text;
  tip.x = event.clientX - rect.left + 12;
  tip.y = event.clientY - rect.top + 12;
  tip.show = true;
}

function hasFiniteValue(): boolean {
  if (props.mode === "month") return buildMonthMatrix(props.rows, props.field, props.years).length > 0;
  if (props.mode === "week") return buildWeekMatrix(props.rows, props.field, props.years).length > 0;
  return props.years.some((year) => buildDaySeries(props.rows, props.field, year).length > 0);
}

function paintCell(
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number | null,
  text: string
) {
  parent
    .append("rect")
    .attr("x", x)
    .attr("y", y)
    .attr("width", w)
    .attr("height", h)
    .attr("fill", value == null ? emptyFill.value : fluxColor(value, props.domain, FLUX_COLORS))
    .attr("stroke", border.value)
    .on("mousemove", (event: MouseEvent) => showTip(event, text))
    .on("mouseleave", hideTip);
}

function drawLegend(root: d3.Selection<SVGGElement, unknown, null, undefined>, y: number, width: number) {
  const domain = props.domain.length >= 2 ? props.domain : DBS_DOMAIN;
  const barW = Math.min(420, Math.max(180, width - 160));
  const x0 = Math.max(24, (width - barW) / 2);
  const n = FLUX_COLORS.length;
  FLUX_COLORS.forEach((color, index) => {
    root
      .append("rect")
      .attr("x", x0 + (barW * index) / n)
      .attr("y", y)
      .attr("width", barW / n)
      .attr("height", 12)
      .attr("fill", color);
  });
  root
    .append("text")
    .attr("x", x0)
    .attr("y", y + 28)
    .attr("fill", ink.value)
    .attr("font-size", 11)
    .text(String(domain[0]));
  root
    .append("text")
    .attr("x", x0 + barW)
    .attr("y", y + 28)
    .attr("text-anchor", "end")
    .attr("fill", ink.value)
    .attr("font-size", 11)
    .text(String(domain[domain.length - 1]));
  root
    .append("text")
    .attr("x", width / 2)
    .attr("y", y - 6)
    .attr("text-anchor", "middle")
    .attr("fill", ink.value)
    .attr("font-size", 12)
    .text(props.unit ? `通量 (${props.unit})` : "");
}

function drawEmpty(root: d3.Selection<SVGGElement, unknown, null, undefined>, width: number, height: number) {
  root
    .append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", ink.value)
    .attr("font-size", 14)
    .text(EMPTY_TEXT);
}

function dayBlockHeight() {
  return 28 + 7 * STEP + 18;
}

function drawDay(root: d3.Selection<SVGGElement, unknown, null, undefined>, width: number) {
  props.years.forEach((year, index) => {
    const top = index * dayBlockHeight();
    const byDate = new Map(buildDaySeries(props.rows, props.field, year).map((cell) => [cell.date, cell.value]));
    root
      .append("text")
      .attr("x", 8)
      .attr("y", top + 78)
      .attr("fill", ink.value)
      .attr("font-size", 12)
      .attr("transform", `rotate(-90, 16, ${top + 78})`)
      .text(String(year));
    WEEKDAY_LABELS.forEach((label, dow) => {
      root
        .append("text")
        .attr("x", 46)
        .attr("y", top + 28 + dow * STEP + 11)
        .attr("fill", ink.value)
        .attr("font-size", 9)
        .text(label);
    });
    const start = new Date(Number(year), 0, 1);
    const janDow = (start.getDay() + 6) % 7;
    const monthWeek = new Map<number, number>();
    for (let cursor = new Date(start); cursor.getFullYear() === Number(year); cursor.setDate(cursor.getDate() + 1)) {
      const doy = Math.round((cursor.getTime() - start.getTime()) / 86400000);
      const week = Math.floor((doy + janDow) / 7);
      const dow = (cursor.getDay() + 6) % 7;
      const month = cursor.getMonth();
      if (!monthWeek.has(month)) monthWeek.set(month, week);
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const value = byDate.has(key) ? (byDate.get(key) as number) : null;
      const text =
        value == null ? `${EMPTY_TEXT} on ${key}` : value === 0 ? `${INVALID_FLUX_TEXT} on ${key}` : `${value.toFixed(2)} ${props.unit} on ${key}`;
      paintCell(root, 58 + week * STEP, top + 28 + dow * STEP, CELL, CELL, value, text);
    }
    monthWeek.forEach((week, month) => {
      root
        .append("text")
        .attr("x", 58 + week * STEP)
        .attr("y", top + 16)
        .attr("fill", ink.value)
        .attr("font-size", 11)
        .attr("font-weight", 700)
        .text(MONTH_LABELS[month]);
    });
  });
  drawLegend(root, props.years.length * dayBlockHeight() + 16, width);
}

function drawMatrix(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  width: number,
  columns: string[],
  cells: Array<{ x: number; y: number; value: number }>,
  label: (x: number, y: number, value: number | null) => string
) {
  const left = 64;
  const top = 36;
  const rows = Math.max(1, props.years.length);
  const cellW = Math.max(10, (width - left - 24) / columns.length);
  const cellH = props.mode === "week" ? 18 : 28;
  columns.forEach((name, index) => {
    if (props.mode === "week" && index % 4 !== 0) return;
    root
      .append("text")
      .attr("x", left + index * cellW + cellW / 2)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("fill", ink.value)
      .attr("font-size", 11)
      .text(name);
  });
  props.years.forEach((year, yi) => {
    root
      .append("text")
      .attr("x", 8)
      .attr("y", top + yi * cellH + cellH * 0.7)
      .attr("fill", ink.value)
      .attr("font-size", 12)
      .text(String(year));
  });
  const lookup = new Map(cells.map((cell) => [`${cell.x}:${cell.y}`, cell.value]));
  for (let yi = 0; yi < rows; yi += 1) {
    for (let xi = 0; xi < columns.length; xi += 1) {
      const value = lookup.has(`${xi}:${yi}`) ? (lookup.get(`${xi}:${yi}`) as number) : null;
      paintCell(root, left + xi * cellW, top + yi * cellH, Math.max(8, cellW - 1), Math.max(8, cellH - 1), value, label(xi, yi, value));
    }
  }
  drawLegend(root, top + rows * cellH + 24, width);
}

function chartHeight(width: number): number {
  if (!props.years.length || !hasFiniteValue()) return 180;
  if (props.mode === "day") return props.years.length * dayBlockHeight() + 72;
  if (props.mode === "week") return 36 + props.years.length * 18 + 90;
  return 36 + props.years.length * 28 + 90;
}

function draw() {
  const host = wrap.value;
  const node = svg.value;
  if (!host || !node) return;
  const width = Math.max(720, host.clientWidth || 900);
  const height = chartHeight(width);
  host.style.height = `${height}px`;
  const root = d3.select(node);
  root.selectAll("*").remove();
  root.attr("width", width).attr("height", height);
  root.append("rect").attr("width", width).attr("height", height).attr("fill", paper.value);
  const g = root.append("g");
  if (!props.years.length || !hasFiniteValue()) {
    drawEmpty(g, width, height);
    return;
  }
  if (props.mode === "month") {
    drawMatrix(g, width, MONTH_LABELS, buildMonthMatrix(props.rows, props.field, props.years), (x, y, value) => {
      const month = MONTH_LABELS[x];
      const year = props.years[y];
      if (value == null) return EMPTY_TEXT;
      return `${value.toFixed(2)} ${props.unit} ${year}年${month}`;
    });
    return;
  }
  if (props.mode === "week") {
    const labels = Array.from({ length: 53 }, (_, index) => String(index + 1));
    drawMatrix(g, width, labels, buildWeekMatrix(props.rows, props.field, props.years), (x, y, value) => {
      const year = props.years[y];
      if (value == null) return EMPTY_TEXT;
      return `${value.toFixed(2)} ${props.unit} ${year}年第${x + 1}周`;
    });
    return;
  }
  drawDay(g, width);
}

onMounted(() => {
  draw();
  observer = new ResizeObserver(() => schedule());
  if (wrap.value) observer.observe(wrap.value);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  if (observer) observer.disconnect();
});

watch(() => [props.rows, props.years, props.field, props.mode, props.domain, props.unit, props.theme], schedule, { deep: true });
</script>

<style scoped>
.flux-calendar {
  position: relative;
  width: 100%;
  min-width: 720px;
  overflow: auto;
}
.chart-el {
  display: block;
}
.chart-tip {
  position: absolute;
  z-index: 2;
  pointer-events: none;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
}
.is-light {
  background: #fff;
  color: #2c3e50;
}
.is-light .chart-tip {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #c8c8c8;
  color: #2c3e50;
}
.is-dark {
  background: #0d1b2a;
  color: #d7ecff;
}
.is-dark .chart-tip {
  background: rgba(4, 20, 42, 0.94);
  border: 1px solid rgba(70, 150, 220, 0.55);
  color: #d7ecff;
}
</style>
