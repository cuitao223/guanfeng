/** 手写最小样例。数值 0 是有效风速或要素值，不是缺测。 */

export const normalProfile = {
  title: "风速",
  unit: "m/s",
  heightArr: [0, 1000, 2000, 3000, 4000],
  value: [1.2, 3.4, 0, 5.5, 4.1],
};

export const gapProfile = {
  title: "含缺测",
  unit: "m/s",
  heightArr: [0, 1000, 2000, 3000, 4000, 5000],
  value: [2, 999, null, -999, "", 6],
};

export const emptyProfile = {
  title: "空序列",
  unit: "m/s",
  heightArr: [] as number[],
  value: [] as number[],
};

export const allMissingProfile = {
  title: "全部缺测",
  unit: "m/s",
  heightArr: [0, 1000, 2000, 3000],
  value: [999, -999, -1000, null],
};
