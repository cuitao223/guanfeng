<template>
  <main :class="theme">
    <header>
      <span>风羽时高图</span>
      <button type="button" @click="theme = theme === 'dark' ? 'light' : 'dark'">{{ theme === "dark" ? "明亮" : "黑暗" }}</button>
    </header>
    <section>
      <BarbThiChart
        title="水平风羽"
        :times="sample.timeAxis"
        :height-arr="sample.heightAxis"
        :values="sample.windSpeed"
        :dirs="sample.windDir"
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
import { onMounted, ref, shallowRef } from "vue";
import { BarbThiChart } from "../src";

const theme = ref<"dark" | "light">("dark");
const sample = shallowRef<{ timeAxis: string[]; heightAxis: number[]; windSpeed: number[][]; windDir: number[][] }>({
  timeAxis: [],
  heightAxis: [],
  windSpeed: [],
  windDir: [],
});

/** 示例色标，覆盖这份数据的风速 0–17 m/s。不是产品风色标。 */
const breakpoints = [0, 2, 4, 6, 8, 10, 12, 14, 18];
const colors = ["#d0e6f5", "#74add1", "#abd9e9", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"];

onMounted(async () => {
  const response = await fetch(new URL("./wind.json", import.meta.url));
  const record = await response.json();
  sample.value = record.data;
});
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
