<template>
  <div class="page" :class="theme">
    <div class="tools">
      <button type="button" @click="theme = theme === 'dark' ? 'light' : 'dark'">{{ theme === 'dark' ? '明亮' : '深色' }}</button>
    </div>
    <section class="panel">
      <h1>温度对数压力图</h1>
      <SkewTChart :temperature="demoTemperature" :dew-point="demoDewPoint" :state-curve="demoStateCurve" :theme="theme" />
    </section>
    <section class="panel">
      <h2>无数据</h2>
      <SkewTChart :temperature="emptyTemperature" :dew-point="emptyDewPoint" :state-curve="emptyStateCurve" :theme="theme" />
    </section>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import SkewTChart from "../src/SkewTChart.vue";
import { demoDewPoint, demoStateCurve, demoTemperature, emptyDewPoint, emptyStateCurve, emptyTemperature } from "./fixtures";

const theme = ref<"dark" | "light">("dark");
</script>

<style>
body {
  margin: 0;
  font-family: "Microsoft YaHei", sans-serif;
}
.page {
  min-height: 100vh;
  padding: 12px;
}
.page.dark {
  background: #061426;
  color: #d7ecff;
}
.page.light {
  background: #f4f7fb;
  color: #243447;
}
.panel {
  height: 640px;
  margin-bottom: 16px;
}
h1, h2 {
  margin: 0 0 8px;
  font-size: 16px;
}
button {
  margin-bottom: 8px;
}
</style>
