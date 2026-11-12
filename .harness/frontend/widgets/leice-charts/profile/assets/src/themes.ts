/**
 * dark 对应 default，light 对应 white。
 * 这是该页现有颜色，不是已锁定的设计令牌。调用方用 palette 覆盖。
 */

export type ProfileThemeName = "dark" | "light";

export interface ProfilePalette {
  plotBg: string;
  frameBg: string;
  frameBorder: string;
  axis: string;
  grid: string;
  label: string;
  title: string;
  cross: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tipTitle: string;
  focusDotStroke: string;
  /** 未传入 color 时的折线色。暗色沿用原默认蓝，亮色加深以便在白底上辨认。 */
  series: string;
}

export const darkPalette: ProfilePalette = {
  plotBg: "transparent",
  frameBg: "rgba(4, 22, 46, 0.45)",
  frameBorder: "rgba(90, 170, 240, 0.45)",
  axis: "rgba(120,180,230,0.55)",
  grid: "rgba(90,140,190,0.28)",
  label: "#9ec9ef",
  title: "#d7ecff",
  cross: "rgba(180,210,240,0.55)",
  tooltipBg: "rgba(6, 24, 48, 0.94)",
  tooltipBorder: "rgba(90, 170, 240, 0.45)",
  tooltipText: "#d7ecff",
  tipTitle: "#9ec9ef",
  focusDotStroke: "#ffffff",
  series: "#4EA8FF",
};

export const lightPalette: ProfilePalette = {
  plotBg: "#ffffff",
  frameBg: "#ffffff",
  frameBorder: "rgba(120, 140, 160, 0.5)",
  axis: "rgba(70, 90, 110, 0.75)",
  grid: "rgba(90, 110, 130, 0.55)",
  label: "#334455",
  title: "#1a2a3a",
  cross: "rgba(220, 100, 40, 0.75)",
  tooltipBg: "rgba(255, 255, 255, 0.96)",
  tooltipBorder: "rgba(100, 130, 160, 0.45)",
  tooltipText: "#243447",
  tipTitle: "#1a2a3a",
  focusDotStroke: "#1a2a3a",
  series: "#1d6fbf",
};

export function resolvePalette(theme: ProfileThemeName, override?: Partial<ProfilePalette> | null): ProfilePalette {
  const base = theme === "light" ? lightPalette : darkPalette;
  return { ...base, ...(override || {}) };
}
