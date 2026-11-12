/**
 * 调色板沿用扫描图页面的深色 / 白色。不是公司设计令牌。
 */

export type ScanThemeName = "dark" | "light";

export interface ScanPalette {
  plotBg: string;
  frameBg: string;
  frameBorder: string;
  axis: string;
  grid: string;
  label: string;
  title: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tipTitle: string;
  /** 未使用色标时的风羽颜色。 */
  barb: string;
  downloadBackground: string;
}

export const darkPalette: ScanPalette = {
  plotBg: "transparent",
  frameBg: "rgba(4, 22, 46, 0.45)",
  frameBorder: "rgba(90, 170, 240, 0.45)",
  axis: "rgba(120,180,230,0.55)",
  grid: "rgba(90,140,190,0.28)",
  label: "#9ec9ef",
  title: "#d7ecff",
  tooltipBg: "rgba(6, 24, 48, 0.94)",
  tooltipBorder: "rgba(90, 170, 240, 0.45)",
  tooltipText: "#d7ecff",
  tipTitle: "#9ec9ef",
  barb: "#FFFFFF",
  downloadBackground: "#061830",
};

export const lightPalette: ScanPalette = {
  plotBg: "#ffffff",
  frameBg: "#ffffff",
  frameBorder: "rgba(120, 140, 160, 0.5)",
  axis: "rgba(70, 90, 110, 0.75)",
  grid: "rgba(90, 110, 130, 0.55)",
  label: "#334455",
  title: "#1a2a3a",
  tooltipBg: "rgba(255, 255, 255, 0.96)",
  tooltipBorder: "rgba(100, 130, 160, 0.45)",
  tooltipText: "#243447",
  tipTitle: "#1a2a3a",
  barb: "#1a2a3a",
  downloadBackground: "#ffffff",
};

export function resolvePalette(theme: ScanThemeName, override?: Partial<ScanPalette> | null): ScanPalette {
  return { ...(theme === "light" ? lightPalette : darkPalette), ...(override || {}) };
}
