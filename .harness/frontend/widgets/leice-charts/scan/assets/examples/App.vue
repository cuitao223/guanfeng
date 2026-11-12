<template>
  <main :class="theme">
    <header>
      <span>扫描图</span>
      <button type="button" @click="mode = mode === 'ppi' ? 'rhi' : 'ppi'">{{ mode === "ppi" ? "PPI" : "RHI" }}</button>
      <button type="button" @click="theme = theme === 'dark' ? 'light' : 'dark'">{{ theme === "dark" ? "明亮" : "黑暗" }}</button>
    </header>
    <section>
      <ScanChart
        :mode="mode"
        :title="mode === 'ppi' ? '径向风' : '径向风'"
        :angles="frame.angles"
        :height-arr="frame.ranges"
        :values="frame.values"
        :max-range="6000"
        unit="m/s"
        :theme="theme"
        color-mode="threshold"
        :breakpoints="breakpoints"
        :colors="colors"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ScanChart } from "../src";

const theme = ref<"dark" | "light">("dark");
const mode = ref<"ppi" | "rhi">("ppi");

/** 示例色标，不是产品扫描色标。 */
const breakpoints = [0, 2, 4, 6, 8, 10, 12];
const colors = ["#313695", "#74add1", "#abd9e9", "#fee090", "#fdae61", "#d73027"];

const ranges: number[] = [];
for (let range = 200; range <= 6000; range += 200) ranges.push(range);

function build(step: number, start: number, stop: number): { angles: number[]; ranges: number[]; values: number[][] } {
  const angles: number[] = [];
  const values: number[][] = [];
  for (let angle = start; angle <= stop; angle += step) {
    angles.push(angle);
    values.push(ranges.map((range, index) => {
      if (index % 19 === 0) return 999;
      return Math.max(0, 6 + 4 * Math.sin((angle * Math.PI) / 180) + Math.cos(range / 700));
    }));
  }
  return { angles, ranges, values };
}

const ppi = build(5, 0, 355);
const rhi = build(2, 0, 60);
const frame = computed(() => (mode.value === "rhi" ? rhi : ppi));
</script>

<style>
html, body, #app { margin: 0; height: 100%; }
main { height: 100%; display: flex; flex-direction: column; }
main.dark { background: #061830; color: #d7ecff; }
main.light { background: #f4f7fb; color: #1a2a3a; }
header { display: flex; gap: 12px; align-items: center; padding: 8px 12px; }
button { background: transparent; color: inherit; border: 1px solid currentColor; padding: 2px 10px; cursor: pointer; }
main > section { flex: 1; min-height: 0; padding: 0 12px 12px; }
</style>
