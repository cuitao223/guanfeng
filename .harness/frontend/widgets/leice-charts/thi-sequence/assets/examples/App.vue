<template>
  <main :class="theme">
    <button type="button" class="theme-switch" @click="theme = theme === 'dark' ? 'light' : 'dark'">
      {{ theme === "dark" ? "明亮" : "黑暗" }}
    </button>
    <section class="wide">
      <ThiSequenceChart
        :time-start="demoTimeStart"
        :time-end="demoTimeEnd"
        :height-max="5000"
        :layers="demoLayers"
        :wind-density="3"
        :wind-barb-scale="0.7"
        :theme="theme"
      />
    </section>
    <section class="side">
      <ThiSequenceChart :layers="emptyLayers" :theme="theme" />
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ThiSequenceChart } from "../src/index";
import { demoLayers, demoTimeEnd, demoTimeStart, emptyLayers } from "./fixtures";

const theme = ref<"dark" | "light">("dark");
</script>

<style>
html, body, #app { margin: 0; }
main { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 12px; padding: 12px; }
main.dark { background: #061830; color: #d7ecff; }
main.light { background: #f4f7fb; color: #1a2a3a; }
.theme-switch { grid-column: 1 / -1; justify-self: start; height: 28px; padding: 0 12px; }
.wide { height: 760px; }
.side { height: 280px; }
</style>
