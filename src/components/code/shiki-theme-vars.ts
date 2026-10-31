export const SHIKI_LIGHT_VAR = '--code-theme-light';
export const SHIKI_DARK_VAR = '--code-theme-dark';
export const SHIKI_PREVIEW_EVENT = 'report-maker:shiki-theme-preview';

export const DEFAULT_SHIKI_LIGHT = 'github-light';
export const DEFAULT_SHIKI_DARK = 'github-dark';

export interface ShikiThemePair {
  light: string;
  dark: string;
}

/**
 * Reads the persisted choice from style.css (via the computed CSS custom
 * property on <html>), falling back to sane defaults if never set.
 */
export function getPersistedShikiThemes(): ShikiThemePair {
  const styles = getComputedStyle(document.documentElement);
  const light = styles.getPropertyValue(SHIKI_LIGHT_VAR).trim() || DEFAULT_SHIKI_LIGHT;
  const dark = styles.getPropertyValue(SHIKI_DARK_VAR).trim() || DEFAULT_SHIKI_DARK;
  return { light, dark };
}

/**
 * Dev-only live preview channel: ThemePanel dispatches this whenever the
 * reader changes a combobox (or loads/resets), every <Code type="bloc">
 * on the page listens and re-highlights immediately — without this, a CSS
 * variable change alone wouldn't touch already-rendered Shiki HTML, since
 * that HTML was generated once at highlight time, not derived live from CSS.
 */
export function previewShikiThemes(detail: ShikiThemePair) {
  window.dispatchEvent(new CustomEvent<ShikiThemePair>(SHIKI_PREVIEW_EVENT, { detail }));
}
