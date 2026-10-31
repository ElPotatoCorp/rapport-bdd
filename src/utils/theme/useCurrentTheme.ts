import { useSyncExternalStore } from "react";
import { getAppliedTheme, type Theme } from "./theme";

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

/**
 * Tracks the `dark` class on <html> as React state.
 *
 * The class is set directly on the DOM by ThemeToggle (production) or
 * ThemePanel (dev preview), so React doesn't know when it changes. Any
 * component that must re-render on a theme change subscribes here.
 */
export function useCurrentTheme(): Theme {
  return useSyncExternalStore(subscribe, getAppliedTheme);
}
