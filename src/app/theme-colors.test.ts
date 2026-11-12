import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ogColors } from "@/lib/og-colors";

// Failure messages are read by contributors who edit colors from GitHub without reading the code (CONTRIBUTING.md).
const css = readFileSync(join(__dirname, "globals.css"), "utf8");
const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
const hex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Every `--name: value;` declaration of the main :root block. */
const declarations = new Map(Array.from(rootBlock.matchAll(/--([\w-]+):\s*([^;]+);/g), (match) => [match[1] ?? "", match[2]?.trim() ?? ""]));
const colors = new Map(
  Array.from(declarations).filter(([name]) => name !== "heat-switch"),
);

function lightDark(value: string): [string, string] | null {
  const match = /^light-dark\(\s*([^,\s]+)\s*,\s*([^)\s]+)\s*\)$/.exec(value);
  return match ? [match[1] ?? "", match[2] ?? ""] : null;
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

describe("globals.css colors", () => {
  it("finds the colors", () => {
    expect(colors.size).toBeGreaterThan(20);
  });

  it.each(Array.from(colors))("--%s is written light-dark(#light, #dark) with two hexadecimal colors", (name, value) => {
    const pair = lightDark(value);
    expect(pair, `In src/app/globals.css, --${name} should look like light-dark(#00766f, #3fc4b6), found: ${value}`).not.toBeNull();
    for (const color of pair ?? []) {
      expect(color, `In src/app/globals.css, --${name}: "${color}" is not a color like #00766f`).toMatch(hex);
    }
  });

  it.each(Object.entries(ogColors))("the sharing image uses the light color of --%s", (name, value) => {
    const light = lightDark(colors.get(kebab(name)) ?? "")?.[0];
    expect(
      value.toLowerCase(),
      `src/lib/og-colors.ts: ${name} must equal the light color of --${kebab(name)} in src/app/globals.css (${light})`,
    ).toBe(light?.toLowerCase());
  });
});
