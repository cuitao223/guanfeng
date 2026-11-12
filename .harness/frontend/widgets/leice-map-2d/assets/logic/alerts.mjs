export const ALERT_ICON_KEYS = ["1", "2", "3", "4", "14", "24", "34"];

export function alertIconKey(alarmType) {
  if (!Array.isArray(alarmType) || alarmType.length === 0) return "";
  return alarmType.slice().sort((a, b) => Number(a) - Number(b)).join("");
}

export function alertSpeedText(value) {
  return value || "-";
}

export function listAlerts(source) {
  if (!source) return [];
  const rows = Array.isArray(source)
    ? source
    : Object.keys(source).map((stationNo) => ({ stationNo, ...source[stationNo] }));
  return rows
    .map((row) => {
      const key = alertIconKey(row.alarmType);
      if (!key || !ALERT_ICON_KEYS.includes(key)) return null;
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return {
        stationNo: row.stationNo == null ? "" : String(row.stationNo),
        latitude,
        longitude,
        alarmType: row.alarmType.slice(),
        iconKey: key,
        maxWindSpeed: alertSpeedText(row.maxWindSpeed),
        windHeightLayer: row.windHeightLayer,
        lljheightLayer: row.lljheightLayer,
      };
    })
    .filter(Boolean);
}
