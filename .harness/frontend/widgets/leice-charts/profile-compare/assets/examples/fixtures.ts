/** Hand-written samples. The value 0 is a real measurement, not a missing cell. */

export const normalCompare = {
  title: "对比",
  unit: "m/s",
  series: [
    { key: "a", name: "甲", color: "#4EA8FF", heightArr: [0, 1000, 2000, 3000], value: [1.2, 0, 3.4, 2.2] },
    { key: "b", name: "乙", color: "#F1414D", heightArr: [0, 1000, 2000, 3000], value: [2, 2.5, 1.1, 4] },
  ],
};

export const gapCompare = {
  title: "含缺测",
  unit: "m/s",
  series: [
    { key: "gap", name: "缺测", color: "#2FC151", heightArr: [0, 1000, 2000, 3000], value: [1, 999, null, 4] },
  ],
};

export const emptyCompare = {
  title: "空序列",
  unit: "m/s",
  series: [] as { key: string; name: string; color: string; heightArr: number[]; value: number[] }[],
};

export const allMissingCompare = {
  title: "全部缺测",
  unit: "m/s",
  series: [
    { key: "miss", name: "缺测", color: "#FDB840", heightArr: [0, 1000, 2000], value: [999, -999, -1000] },
  ],
};
