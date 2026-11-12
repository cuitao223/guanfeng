<template>
  <main :class="theme">
    <button type="button" class="theme-switch" @click="theme = theme === 'dark' ? 'light' : 'dark'">
      {{ theme === "dark" ? "明亮" : "黑暗" }}
    </button>
    <section class="large">
      <ThiChart
        :times="sample.timeAxis"
        :height-arr="sample.heightAxis"
        :values="sample.values"
        unit="m/s"
        :breakpoints="verticalWindBreakpoints"
        :colors="verticalWindColors"
        color-mode="threshold"
        :theme="theme"
      />
    </section>
    <section v-for="item in panels" :key="item.title">
      <ThiChart
        :times="item.times"
        :height-arr="item.heightArr"
        :values="item.values"
        :windpara="item.windpara"
        :unit="item.unit"
        :breakpoints="[0, 4, 8]"
        :colors="['#1d4e89', '#7eb6d9', '#f2e6c2']"
        color-mode="linear"
        :height-max="2000"
        :theme="theme"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef } from "vue";
import { ThiChart } from "../src/index";
import { allMissingThi, emptyThi, gapThi, normalThi } from "./fixtures";
import { verticalWindBreakpoints, verticalWindColors } from "./verticalWindScale";

const theme = ref<"dark" | "light">("dark");
const sample = shallowRef<{ timeAxis: string[]; heightAxis: number[]; values: number[][] }>({
  timeAxis: [],
  heightAxis: [],
  values: [],
});
const panels = [normalThi, gapThi, emptyThi, allMissingThi];

onMounted(async () => {
  const response = await fetch(new URL("./test.json", import.meta.url));
  const record = await response.json();
  sample.value = record.data;
});
</script>

<style>
html, body, #app { margin: 0; }
main.dark { background: #061830; color: #d7ecff; }
main.light { background: #f4f7fb; color: #1a2a3a; }
main { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px; }
.theme-switch {
  grid-column: 1 / -1;
  justify-self: start;
  height: 28px;
  padding: 0 12px;
  border: 1px solid rgba(120, 140, 160, 0.45);
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.large { grid-column: 1 / -1; height: 560px; }
main > section { height: 340px; }
</style>
