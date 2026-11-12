export const DEFAULT_MAP_CENTER = [35, 105]
export const BASEMAPS = {
  vector: { url: 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}', attribution: '&copy; 高德地图' },
  satellite: { url: 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', label: 'https://webst01.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}', attribution: '&copy; 高德地图' },
  terrain: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, USGS, NGA' }
}
export function basemapFor(type) { return BASEMAPS[({img:'satellite',vec:'vector',ter:'terrain'})[type] || type] || BASEMAPS.vector }
