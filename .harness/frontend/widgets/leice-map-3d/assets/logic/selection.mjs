export const WIND_FORMS = ["field", "barb", "particle"];
export const COLOR_STYLES = ["smooth", "contour"];
export const WARN_TYPES = ["horizontal", "vertical", "gale"];

export function toggleWindForm(selected, form) {
  if (!WIND_FORMS.includes(form)) return (selected || []).slice();
  const next = new Set(selected || []);
  if (next.has(form)) next.delete(form);
  else next.add(form);
  return WIND_FORMS.filter((item) => next.has(item));
}

export function selectColorStyle(style) {
  return style === "contour" ? "contour" : "smooth";
}

export function toggleWarnType(current, next) {
  if (!WARN_TYPES.includes(next)) return current ?? null;
  return current === next ? null : next;
}
