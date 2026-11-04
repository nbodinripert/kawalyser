import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { themeScript, themeStorageKey } from "@/lib/theme";
import { ThemeToggle } from "./theme-toggle";

const labels = { toDark: "To dark", toLight: "To light" };

function setSystemTheme(theme: "light" | "dark") {
  vi.stubGlobal("matchMedia", () => ({
    matches: theme === "dark",
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function runThemeScript() {
  new Function(themeScript)();
}

const appliedTheme = () => document.documentElement.getAttribute("data-theme");

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  setSystemTheme("light");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("themeScript", () => {
  it("follows the device when nothing is saved", () => {
    setSystemTheme("dark");
    runThemeScript();
    expect(appliedTheme()).toBe("dark");
  });

  it("prefers the saved choice over the device", () => {
    setSystemTheme("dark");
    localStorage.setItem(themeStorageKey, "light");
    runThemeScript();
    expect(appliedTheme()).toBe("light");
  });

  it("ignores an unknown saved value", () => {
    localStorage.setItem(themeStorageKey, "pink");
    runThemeScript();
    expect(appliedTheme()).toBe("light");
  });
});

describe("ThemeToggle", () => {
  it("switches the theme and remembers the choice", async () => {
    render(<ThemeToggle labels={labels} />);

    fireEvent.click(await screen.findByRole("button", { name: labels.toDark }));

    expect(appliedTheme()).toBe("dark");
    expect(localStorage.getItem(themeStorageKey)).toBe("dark");
    expect(await screen.findByRole("button", { name: labels.toLight })).toBeTruthy();
  });

  it("applies the saved theme when it mounts", () => {
    localStorage.setItem(themeStorageKey, "dark");
    render(<ThemeToggle labels={labels} />);
    expect(appliedTheme()).toBe("dark");
  });
});
