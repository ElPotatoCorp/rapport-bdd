export type Theme = "light" | "dark";

// Must match the key used in the anti-flash inline script in index.html.
export const THEME_STORAGE_KEY = "report-theme";

const DARK_CLASS = "dark";

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    // Storage unavailable (blocked, private mode, some file:// setups).
    return null;
  }
}

/** Stored choice if the reader made one, OS preference otherwise. */
export function resolveIsDark(): boolean {
  const stored = readStoredTheme();
  if (stored !== null) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(isDark: boolean): void {
  document.documentElement.classList.toggle(DARK_CLASS, isDark);
}

/** The theme currently applied to <html>: the single source of truth. */
export function getAppliedTheme(): Theme {
  return document.documentElement.classList.contains(DARK_CLASS)
    ? "dark"
    : "light";
}

export function saveTheme(isDark: boolean): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  } catch {
    // The toggle still works for this page view, it just won't be remembered.
  }
}
