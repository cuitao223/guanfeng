export const WIND_FORMS = ["particle", "barb", "arrow"];

export function toggleWindForm(current, next) {
  if (!WIND_FORMS.includes(next)) return current;
  if (current === next) return null;
  return next;
}

export const PARTICLE_DENSITY = {
  1: 1 / 300,
  2: 1 / 400,
  3: 1 / 600,
  4: 1 / 800,
  5: 1 / 1000,
};

export function particleMultiplierForDensity(density) {
  const key = Number(density);
  return PARTICLE_DENSITY[key] || PARTICLE_DENSITY[1];
}

export function gridStrideForDensity(density) {
  const key = Math.round(Number(density));
  if (PARTICLE_DENSITY[key]) return key;
  return 1;
}
