export const DEFAULT_TIME_PLAYER_THEME = {
  panelBg: 'rgba(0, 0, 0, 0.5)',
  panelBorder: '#30a0a4',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.75)',
  textMuted: 'rgba(232, 244, 248, 0.55)',
  textLabel: 'rgba(255, 255, 255, 0.78)',
  textLabelActive: '#ffffff',
  accent: '#29dbc9',
  accentSoft: 'rgba(41, 219, 201, 0.85)',
  accentBorder: 'rgba(48, 160, 164, 0.45)',
  accentBorderStrong: 'rgba(48, 160, 164, 0.65)',
  accentBorderHover: '#46c4c8',
  accentBgHover: 'rgba(41, 219, 201, 0.18)',
  accentBgSoft: 'rgba(41, 219, 201, 0.12)',
  accentDivider: 'rgba(48, 160, 164, 0.35)',
  controlText: '#d8e8f0',
  controlBg: 'rgba(4, 16, 22, 0.82)',
  inputBg: 'rgba(0, 0, 0, 0.55)',
  inputText: '#ffffff',
  inputIcon: 'rgba(255, 255, 255, 0.85)',
  trackBg: 'rgba(255, 255, 255, 0.12)',
  trackActiveBg: 'rgba(41, 219, 201, 0.12)',
  progressStart: 'rgba(41, 219, 201, 0.4)',
  progressEnd: 'rgba(48, 160, 164, 0.85)',
  tooltipBg: 'rgba(0, 0, 0, 0.75)',
  tooltipText: '#ffffff',
  markerNow: '#ffb347',
  markerNowShadow: '0 0 6px rgba(255, 179, 71, 0.75)',
  markerForecast: 'rgba(41, 219, 201, 0.55)',
  markerForecastShadow: '0 0 6px rgba(41, 219, 201, 0.45)'
}

const THEME_VAR_MAP = {
  panelBg: '--tps-panel-bg',
  panelBorder: '--tps-panel-border',
  textPrimary: '--tps-text-primary',
  textSecondary: '--tps-text-secondary',
  textMuted: '--tps-text-muted',
  textLabel: '--tps-text-label',
  textLabelActive: '--tps-text-label-active',
  accent: '--tps-accent',
  accentSoft: '--tps-accent-soft',
  accentBorder: '--tps-accent-border',
  accentBorderStrong: '--tps-accent-border-strong',
  accentBorderHover: '--tps-accent-border-hover',
  accentBgHover: '--tps-accent-bg-hover',
  accentBgSoft: '--tps-accent-bg-soft',
  accentDivider: '--tps-accent-divider',
  controlText: '--tps-control-text',
  controlBg: '--tps-control-bg',
  inputBg: '--tps-input-bg',
  inputText: '--tps-input-text',
  inputIcon: '--tps-input-icon',
  trackBg: '--tps-track-bg',
  trackActiveBg: '--tps-track-active-bg',
  progressStart: '--tps-progress-start',
  progressEnd: '--tps-progress-end',
  tooltipBg: '--tps-tooltip-bg',
  tooltipText: '--tps-tooltip-text',
  markerNow: '--tps-marker-now',
  markerNowShadow: '--tps-marker-now-shadow',
  markerForecast: '--tps-marker-forecast',
  markerForecastShadow: '--tps-marker-forecast-shadow'
}

export function buildTimePlayerThemeVars(theme) {
  const merged = Object.assign({}, DEFAULT_TIME_PLAYER_THEME, theme || {})
  const vars = {}
  Object.keys(THEME_VAR_MAP).forEach((key) => {
    vars[THEME_VAR_MAP[key]] = merged[key]
  })
  return vars
}
