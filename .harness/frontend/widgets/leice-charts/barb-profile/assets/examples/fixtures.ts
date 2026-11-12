export const normalBarbs = {
  title: "风羽",
  heightArr: [0, 1000, 2000, 3000, 4000],
  value: [2, 0, 8, 22, 4],
  dirArr: [0, 90, 180, 270, 45],
};

export const gapBarbs = {
  title: "含缺测",
  heightArr: [0, 1000, 2000, 3000],
  value: [3, 999, 5, 1],
  dirArr: [10, 20, "", 40],
};

export const emptyBarbs = {
  title: "空序列",
  heightArr: [] as number[],
  value: [] as number[],
  dirArr: [] as number[],
};

export const allMissingBarbs = {
  title: "全部缺测",
  heightArr: [0, 1000, 2000],
  value: [999, -999, -1000],
  dirArr: [0, 0, 0],
};
