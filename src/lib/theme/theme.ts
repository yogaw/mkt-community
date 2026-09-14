export type Theme = "light" | "dark";

/** Namespaced: localStorage is shared by every app served from the same origin. */
export const THEME_STORAGE_KEY = "piranha-theme";

/** Matches the data-theme rendered by the server in app/layout.tsx. */
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** The stored choice, or the default when nothing is saved or storage is blocked. */
export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private-mode or blocked storage: the theme still applies for this page view.
  }
}
