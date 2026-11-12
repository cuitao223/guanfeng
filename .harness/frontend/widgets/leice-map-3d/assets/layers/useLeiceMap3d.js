import { inject, onBeforeUnmount, watch } from "vue";
import { LEICE_MAP3D_KEY } from "./mapKey.js";

export function useLeiceMap3d(attach) {
  const ctx = inject(LEICE_MAP3D_KEY, null);
  let cleanup = () => {};
  const stop = ctx
    ? watch(
        () => ctx.ready,
        (ready) => {
          cleanup();
          cleanup = () => {};
          if (!ready) return;
          const next = attach(ctx);
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
