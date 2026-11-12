/** 按真实时高网格的形状生成数据：每分钟一列，高度间隔 50 m。不是生产文件拷贝。 */

export interface LargeThiFixture {
  times: number[];
  heightArr: number[];
  values: Array<Array<number | string>>;
  windpara: number[][];
  timeCount: number;
  heightCount: number;
}

export function buildLargeThi(timeCount: number, heightCount: number, seed = 20261019): LargeThiFixture {
  const random = mulberry32(seed);
  const times: number[] = [];
  const heightArr: number[] = [];
  const values: Array<Array<number | string>> = [];
  const windpara: number[][] = [];
  const origin = 1700000000;
  for (let h = 0; h < heightCount; h += 1) heightArr.push(h * 50);
  for (let i = 0; i < timeCount; i += 1) {
    const gap = i === Math.floor(timeCount / 2) ? 3600 : 0;
    const previous = i === 0 ? origin - 60 : times[i - 1];
    times.push(previous + 60 + gap);
    const column: Array<number | string> = [];
    for (let h = 0; h < heightCount; h += 1) {
      const roll = random();
      if (roll < 0.03) column.push(999);
      else if (roll < 0.05) column.push(-999);
      else if (roll < 0.06) column.push("");
      else {
        const wave = Math.sin(i / 36) * 3 + Math.cos(h / 8) * 2 + (h * 50) / 1000;
        column.push(roll < 0.08 ? 0 : Math.max(0, wave + random()));
      }
    }
    values.push(column);
    windpara.push([0, 0, 60]);
  }
  return { times, heightArr, values, windpara, timeCount, heightCount };
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
