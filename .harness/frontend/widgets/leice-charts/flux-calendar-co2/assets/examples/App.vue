<template>
  <div class="page">
    <section>
      <h1>二氧化碳通量日历热力图</h1>
      <div class="tools">
        <label><input v-model="mode" type="radio" value="day" />日通量</label>
        <label><input v-model="mode" type="radio" value="week" />周通量</label>
        <label><input v-model="mode" type="radio" value="month" />月通量</label>
        <label><input v-model="field" type="radio" value="verticalAvg" />垂直</label>
        <label><input v-model="field" type="radio" value="eastAvg" />东西</label>
        <label><input v-model="field" type="radio" value="northAvg" />南北</label>
      </div>
      <FluxCalendarChart :rows="rows" :years="years" :field="field" :mode="mode" unit="µg/m²/s" theme="light" />
    </section>
    <section>
      <h2>无数据</h2>
      <FluxCalendarChart :rows="emptyRows" :years="years" :mode="mode" theme="light" />
    </section>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import FluxCalendarChart from "../src/FluxCalendarChart.vue";
import { demoRows, demoYears, emptyRows } from "./fixtures";

const rows = demoRows();
const years = demoYears;
const mode = ref<"day" | "week" | "month">("day");
const field = ref("verticalAvg");
</script>

<style>
body {
  margin: 0;
  font-family: "Microsoft YaHei", sans-serif;
  background: #f4f7fb;
}
.page {
  display: grid;
  gap: 16px;
  padding: 16px;
}
section {
  background: #fff;
  padding: 12px;
}
.tools {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}
h1, h2 {
  margin: 0 0 8px;
  font-size: 16px;
}
</style>
