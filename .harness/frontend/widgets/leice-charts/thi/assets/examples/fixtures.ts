/** 手写最小样例。色标只供示例，不是已锁定的产品色。数值 0 有效。 */

export const normalThi = {
  title: "风速",
  unit: "m/s",
  times: [1700000000, 1700000600, 1700001200],
  heightArr: [0, 1000, 2000],
  values: [
    [1, 0, 4],
    [2, 999, 5],
    [3, -999, ""],
  ],
  windpara: [[0, 0, 600], [0, 0, 600], [0, 0, 600]],
};

export const stringTimeThi = {
  title: "格式化时间",
  unit: "m/s",
  times: ["2026-10-19 08:00:00", "2026-10-19 08:10:00"],
  heightArr: [100, 500],
  values: [
    [1.5, 2.5],
    [3.5, 4.5],
  ],
  windpara: [[0, 0, 600], [0, 0, 600]],
};

export const emptyThi = {
  title: "空序列",
  unit: "m/s",
  times: [] as number[],
  heightArr: [] as number[],
  values: [] as number[][],
  windpara: [] as number[][],
};

export const allMissingThi = {
  title: "全部缺测",
  unit: "m/s",
  times: [1700000000, 1700000600],
  heightArr: [0, 1000],
  values: [
    [999, -999],
    [-1000, null],
  ],
  windpara: [[0, 0, 600], [0, 0, 600]],
};

export const gapThi = {
  title: "时间空档",
  unit: "m/s",
  times: [1700000000, 1700002000],
  heightArr: [0, 1000],
  values: [
    [2, 4],
    [6, 8],
  ],
  windpara: [[0, 0, 600], [0, 0, 600]],
};
