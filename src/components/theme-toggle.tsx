"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import {
  applyTheme,
  getAppliedTheme,
  getSavedTheme,
  getSystemThemeQuery,
  resolveTheme,
  saveTheme,
} from "@/lib/theme";

type ThemeToggleProps = {
  labels: { toDark: string; toLight: string };
};

function subscribeToAppliedTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

export function ThemeToggle({ labels }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribeToAppliedTheme, getAppliedTheme, () => null);

  // In development, Strict Mode's remount clears the attribute set by the inline script.
  useLayoutEffect(() => {
    applyTheme(resolveTheme());
  }, []);

  // Follows the device setting for as long as the visitor has made no choice of their own.
  useEffect(() => {
    const query = getSystemThemeQuery();
    const onSystemChange = () => {
      if (!getSavedTheme()) applyTheme(resolveTheme());
    };
    query.addEventListener("change", onSystemChange);
    return () => query.removeEventListener("change", onSystemChange);
  }, []);

  function toggle() {
    const next = getAppliedTheme() === "dark" ? "light" : "dark";
    saveTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? labels.toLight : labels.toDark}
      className="flex size-9 items-center justify-center rounded-md border border-border text-muted transition-colors hover:text-foreground"
    >
      {/* The theme is unknown on the server, so CSS picks the icon to avoid a mismatch. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-4 dark:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="hidden size-4 dark:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
