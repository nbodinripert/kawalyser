export type Theme = "light" | "dark";

export const themeStorageKey = "theme";

const systemThemeQuery = "(prefers-color-scheme: dark)";

/**
 * Runs in <head> before the first paint, so a saved dark theme never flashes light.
 * Keep it in sync with resolveTheme below.
 */
export const themeScript = `(function(){var t;try{t=localStorage.getItem("${themeStorageKey}")}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("${systemThemeQuery}").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)})()`;

export function getSavedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(themeStorageKey);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    // Storage can be blocked, for example in some private windows.
    return null;
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // The choice still applies to the current page.
  }
}

export function getSystemThemeQuery(): MediaQueryList {
  return matchMedia(systemThemeQuery);
}

export function resolveTheme(): Theme {
  return getSavedTheme() ?? (getSystemThemeQuery().matches ? "dark" : "light");
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export function getAppliedTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}
