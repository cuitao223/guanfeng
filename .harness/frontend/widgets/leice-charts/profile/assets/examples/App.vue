<template>
  <main :class="theme">
    <button type="button" class="theme-switch" @click="theme = theme === 'dark' ? 'light' : 'dark'">
      {{ theme === "dark" ? "明亮" : "黑暗" }}
    </button>
    <section v-for="item in panels" :key="item.title">
      <ProfileChart
        :title="item.title"
        :unit="item.unit"
        :height-arr="item.heightArr"
        :value="item.value"
        :height-max="6000"
        :theme="theme"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ProfileChart } from "../src/index";
import { allMissingProfile, emptyProfile, gapProfile, normalProfile } from "./fixtures";

const theme = ref<"dark" | "light">("dark");
const panels = [normalProfile, gapProfile, emptyProfile, allMissingProfile];
</script>

<style>
html, body, #app {
  margin: 0;
}

main.dark { background: #061830; }
main.light { background: #f4f7fb; }

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

main.dark { color: #d7ecff; }
main.light { color: #1a2a3a; }

main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px;
}

section {
  height: 360px;
}
</style>
