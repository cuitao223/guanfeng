<template>
  <main :class="theme">
    <button type="button" class="theme-switch" @click="theme = theme === 'dark' ? 'light' : 'dark'">
      {{ theme === "dark" ? "明亮" : "黑暗" }}
    </button>
    <section v-for="item in panels" :key="item.title">
      <BarbProfileChart
        :title="item.title"
        :height-arr="item.heightArr"
        :value="item.value"
        :dir-arr="item.dirArr"
        :height-max="5000"
        :theme="theme"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { BarbProfileChart } from "../src/index";
import { allMissingBarbs, emptyBarbs, gapBarbs, normalBarbs } from "./fixtures";

const theme = ref<"dark" | "light">("dark");
const panels = [normalBarbs, gapBarbs, emptyBarbs, allMissingBarbs];
</script>

<style>
html, body, #app { margin: 0; }
main { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px; }
main.dark { background: #061830; color: #d7ecff; }
main.light { background: #f4f7fb; color: #1a2a3a; }
.theme-switch { grid-column: 1 / -1; justify-self: start; height: 28px; padding: 0 12px; }
section { height: 360px; }
</style>
