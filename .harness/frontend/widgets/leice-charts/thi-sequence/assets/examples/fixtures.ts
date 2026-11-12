const times = ["2026-01-01 00:00:00", "2026-01-01 00:30:00", "2026-01-01 01:00:00"];
const heightArr = [0, 1000, 2000];

export const normalLayers = [
  {
    key: "verticalWind",
    drawType: "fill" as const,
    name: "垂直风",
    unit: "m/s",
    color: "#4EA8FF",
    breakpoints: [-2, 0, 2],
    colors: ["#313695", "#ffffbf", "#a50026"],
    colorType: "linear" as const,
    timeArr: times,
    heightArr,
    value: [
      [ -1, 0, 1 ],
      [ 0.4, 999, -0.2 ],
      [ 1, 0.2, null ],
    ],
  },
  {
    key: "boundaryLayer",
    drawType: "line" as const,
    name: "边界层",
    unit: "m",
    color: "#F5D76E",
    timeArr: times,
    heightArr: [800, 999, 1500],
  },
  {
    key: "horizontalWind",
    drawType: "windBarb" as const,
    name: "水平风",
    color: "#FFFFFF",
    density: 1,
    timeArr: times,
    heightArr,
    speed: [
      [4, 0, 12],
      [999, 8, 2],
      [6, -999, 10],
    ],
    dir: [
      [0, 90, 180],
      [45, 120, 200],
      [270, 10, 30],
    ],
  },
];

export const emptyLayers: never[] = [];

/** 12 hours at 10 minutes, heights every 200 m. Synthetic values only. */
const DEMO_HOURS = 12;
const DEMO_STEP_MIN = 10;
const DEMO_HEIGHT_STEP = 200;
const DEMO_HEIGHT_MAX = 5000;

export const demoTimeStart = "2026-01-01 00:00:00";
export const demoTimeEnd = "2026-01-01 12:00:00";

function demoTimes(): string[] {
  const times: string[] = [];
  const last = DEMO_HOURS * 60;
  for (let minute = 0; minute <= last; minute += DEMO_STEP_MIN) {
    const hour = Math.floor(minute / 60);
    const mm = minute % 60;
    const hh = String(hour).padStart(2, "0");
    const minText = String(mm).padStart(2, "0");
    times.push(`2026-01-01 ${hh}:${minText}:00`);
  }
  return times;
}

function demoHeights(): number[] {
  const heights: number[] = [];
  for (let height = 0; height <= DEMO_HEIGHT_MAX; height += DEMO_HEIGHT_STEP) heights.push(height);
  return heights;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildDemoLayers() {
  const times = demoTimes();
  const heights = demoHeights();
  const timeCount = times.length;
  const vertical = times.map((_, timeIndex) => heights.map((height, heightIndex) => {
    if (timeIndex >= 18 && timeIndex <= 26 && heightIndex >= 8 && heightIndex <= 14) return 999;
    if (timeIndex >= 48 && timeIndex <= 56 && height >= 3600) return null;
    if (timeIndex % 29 === 0 && height === 1800) return -1000;
    const phase = (timeIndex / (timeCount - 1)) * Math.PI * 2;
    const wave = Math.sin(phase) * Math.cos(height / 1500);
    const profile = (height / DEMO_HEIGHT_MAX) * 1.5 - 0.7;
    if (timeIndex === 8 && heightIndex === 4) return 0;
    return round2(wave * 1.15 + profile * 0.55);
  }));
  const boundary = times.map((_, timeIndex) => {
    if (timeIndex >= 30 && timeIndex <= 38) return 999;
    const phase = (timeIndex / (timeCount - 1)) * Math.PI * 2;
    return Math.round(1400 + 800 * Math.sin(phase) + 180 * Math.sin(phase * 3));
  });
  const aerosol = times.map((_, timeIndex) => {
    if (timeIndex >= 44 && timeIndex <= 50) return null;
    const phase = (timeIndex / (timeCount - 1)) * Math.PI * 2;
    return Math.round(500 + 220 * Math.cos(phase * 1.5));
  });
  const freezing = times.map((_, timeIndex) => {
    if (timeIndex >= 20 && timeIndex <= 28) return 999;
    const phase = (timeIndex / (timeCount - 1)) * Math.PI * 2;
    return Math.round(2200 + 500 * Math.sin(phase + 0.4));
  });
  const minus20 = times.map((_, timeIndex) => {
    const phase = (timeIndex / (timeCount - 1)) * Math.PI * 2;
    return Math.round(3800 + 350 * Math.cos(phase));
  });
  const humidity = times.map((_, timeIndex) => heights.map((height, heightIndex) => {
    if (timeIndex >= 8 && timeIndex <= 16 && heightIndex >= 3 && heightIndex <= 8) return 999;
    if (height === 0 && timeIndex % 31 === 0) return 0;
    const phase = (timeIndex / (timeCount - 1)) * Math.PI * 2;
    const base = 88 - (height / DEMO_HEIGHT_MAX) * 62 + Math.sin(phase + height / 2000) * 7;
    return Math.max(0, Math.min(100, round2(base)));
  }));
  const speed = times.map((_, timeIndex) => heights.map((height, heightIndex) => {
    if (vertical[timeIndex][heightIndex] === 999 || vertical[timeIndex][heightIndex] == null) return 999;
    if (timeIndex === 12 && heightIndex === 2) return 0;
    const phase = (timeIndex / (timeCount - 1)) * Math.PI * 2;
    return round2(3 + (height / DEMO_HEIGHT_MAX) * 12 + Math.sin(phase) * 2);
  }));
  const dir = times.map((_, timeIndex) => heights.map((height, heightIndex) => {
    if (timeIndex >= 60 && timeIndex <= 64 && heightIndex <= 3) return -999;
    const turn = (timeIndex / (timeCount - 1)) * 220;
    return Math.round((turn + height / 40) % 360);
  }));

  return [
    {
      key: "verticalWind",
      drawType: "fill" as const,
      name: "垂直风",
      unit: "m/s",
      opacity: 0.86,
      breakpoints: [-2, -1.6, -1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2, 1.6, 2],
      colors: ["#313695", "#4575b4", "#74add1", "#abd9e9", "#91bfdb", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"],
      colorType: "threshold" as const,
      timeArr: times,
      heightArr: heights,
      value: vertical,
    },
    {
      key: "humidity",
      drawType: "fill" as const,
      name: "相对湿度",
      unit: "%",
      opacity: 0.42,
      breakpoints: [0, 60, 65, 70, 75, 80, 85, 90, 95, 100],
      colors: ["#CCCCCC", "#E0EC69", "#C4DD67", "#A8CF66", "#8CC064", "#70B263", "#54A361", "#389560", "#1C865E"],
      colorType: "threshold" as const,
      timeArr: times,
      heightArr: heights,
      value: humidity,
    },
    {
      key: "boundaryLayer",
      drawType: "line" as const,
      name: "边界层",
      unit: "m",
      color: "#F5D76E",
      smooth: true,
      timeArr: times,
      heightArr: boundary,
    },
    {
      key: "aerosolThickness",
      drawType: "line" as const,
      name: "气溶胶层厚度",
      unit: "m",
      color: "#C084FC",
      smooth: true,
      timeArr: times,
      heightArr: aerosol,
    },
    {
      key: "temperature",
      drawType: "line" as const,
      name: "温度",
      unit: "m",
      timeArr: times,
      tempArr: [0, -20],
      heightValueArr: [freezing, minus20],
    },
    {
      key: "horizontalWind",
      drawType: "windBarb" as const,
      name: "水平风",
      density: 3,
      timeArr: times,
      heightArr: heights,
      speed,
      dir,
    },
  ];
}

export const demoLayers = buildDemoLayers();
