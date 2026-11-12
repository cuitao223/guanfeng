export { default as CompareProfileChart } from "./CompareProfileChart.vue";
export {
  buildCompareSeries,
  compareLinePath,
  hasDrawableSeries,
  sampleAtHeight,
} from "./compareSeries";
export { isLidarMissingCell, LIDAR_MISSING_HIGH, LIDAR_MISSING_LOW } from "./lidarMissing";
export { resolvePalette } from "./themes";
export type { CompareSeries, CompareSeriesInput } from "./compareSeries";
export type { ChartPalette, ChartThemeName } from "./themes";
