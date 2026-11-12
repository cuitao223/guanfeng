import { inject, onBeforeUnmount, watch } from "vue";
import { LEICE_MAP_KEY } from "./mapKey.js";

export function useLeiceMap(attach) {
  const mapRef = inject(LEICE_MAP_KEY, null);
  let cleanup = () => {};
  const stop = mapRef
    ? watch(
        mapRef,
        (map) => {
          cleanup();
          cleanup = () => {};
          if (!map) return;
          const next = attach(map);
          if (typeof next === "function") cleanup = next;
        },
        { immediate: true },
      )
    : () => {};
  onBeforeUnmount(() => {
    cleanup();
    if (typeof stop === "function") stop();
  });
}
