export const normalLayers = [
  { heightKm: 0.5, windSpeed: 4, windDir: 0 },
  { heightKm: 1.2, windSpeed: 0, windDir: 90 },
  { heightKm: 2, windSpeed: 8, windDir: 180 },
  { heightKm: 3, windSpeed: 12, windDir: 270 },
];

export const gapLayers = [
  { heightKm: 0.4, windSpeed: 6, windDir: 30 },
  { heightKm: 1, windSpeed: 999, windDir: 40 },
  { heightKm: 1.5, windSpeed: 7, windDir: -1000 },
  { heightKm: 999, windSpeed: 5, windDir: 120 },
];

export const emptyLayers: { heightKm: number; windSpeed: number; windDir: number }[] = [];

export const allMissingLayers = [
  { heightKm: 1, windSpeed: 999, windDir: 10 },
  { heightKm: 2, windSpeed: -999, windDir: 20 },
  { heightKm: 3, windSpeed: -1, windDir: 30 },
];
