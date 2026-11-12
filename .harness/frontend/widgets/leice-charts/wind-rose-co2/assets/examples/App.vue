<template>
  <div class="page" :class="theme">
    <button type="button" @click="theme = theme === 'dark' ? 'light' : 'dark'">{{ theme === "dark" ? "明亮" : "黑暗" }}</button>
    <div class="grid">
      <section class="wide">
        <WindRoseCo2Chart :samples="demoSamples" :max-value="1000" :height-m="100" :theme="theme" />
      </section>
      <section class="side">
        <WindRoseCo2Chart :samples="emptySamples" :theme="theme" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import WindRoseCo2Chart from "../src/WindRoseCo2Chart.vue";
import { demoSamples, emptySamples } from "./fixtures";
import type { ChartThemeName } from "../src/themes";

const theme = ref<ChartThemeName>("dark");
</script>

<style>
html, body, #app { margin: 0; height: 100%; }
.page { min-height: 100%; padding: 12px; box-sizing: border-box; background: #04162e; color: #d7ecff; }
.page.light { background: #f4f7fb; color: #1a2a3a; }
button { margin-bottom: 8px; }
.grid { display: grid; grid-template-columns: minmax(0, 1fr) 240px; gap: 12px; height: calc(100vh - 48px); }
.wide, .side { min-height: 0; }
</style>
