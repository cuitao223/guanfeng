/**
 * light 对应 default，dark 对应 map。
 * 刻度线虚线为 4,4。
 * 这些不是已锁定的设计令牌。
 */

export type ThiThemeName = "dark" | "light";

export interface ThiPalette {
  axisText: string;
  axis: string;
  gridStroke: string;
  gridOpacity: number;
  frameBg: string;
  frameBorder: string;
  plotBg: string;
  label: string;
  missingFill: string;
  /** 下载底色来自 thiCanvasCore 的 downloadBackground，不是新的设计令牌。 */
  downloadBackground: string;
}

export const lightPalette: ThiPalette = {
  axisText: "#000000",
  axis: "rgba(70, 90, 110, 0.75)",
  gridStroke: "rgba(90, 110, 130, 0.55)",
  gridOpacity: 1,
  frameBg: "#ffffff",
  frameBorder: "rgba(120, 140, 160, 0.5)",
  plotBg: "#ffffff",
  label: "#334455",
  missingFill: "rgba(128, 128, 128, 0.4)",
  downloadBackground: "#ffffff",
};

export const darkPalette: ThiPalette = {
  axisText: "#ffffff",
  axis: "rgba(120,180,230,0.55)",
  gridStroke: "rgba(90,150,210,0.22)",
  gridOpacity: 1,
  frameBg: "rgba(4, 22, 46, 0.35)",
  frameBorder: "rgba(90, 170, 240, 0.28)",
  plotBg: "rgba(4, 22, 46, 0.35)",
  label: "#9ec9ef",
  missingFill: "rgba(128, 128, 128, 0.4)",
  downloadBackground: "#000000",
};

export function resolvePalette(theme: ThiThemeName, override?: Partial<ThiPalette> | null): ThiPalette {
  return { ...(theme === "light" ? lightPalette : darkPalette), ...(override || {}) };
}
