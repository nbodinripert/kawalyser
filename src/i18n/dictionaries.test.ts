import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Failure messages are read by contributors who edit texts from GitHub without reading the code (CONTRIBUTING.md).

/** Parsed here rather than imported, so that a syntax error names the file. */
function load(name: string): unknown {
  const file = `src/i18n/dictionaries/${name}`;
  try {
    return JSON.parse(readFileSync(join(__dirname, "dictionaries", name), "utf8"));
  } catch (error) {
    throw new Error(`${file} is not valid JSON (a missing comma or quote?): ${error instanceof Error ? error.message : String(error)}`);
  }
}

const en = load("en.json");
const fr = load("fr.json");

type Entry = { path: string; value: unknown };

/** Every value of a dictionary with its path, such as "layout.legend.dead" or "about.measures[2]". */
function entries(value: unknown, path = ""): Entry[] {
  if (Array.isArray(value)) return [{ path, value }, ...value.flatMap((item, index) => entries(item, `${path}[${index}]`))];
  if (value !== null && typeof value === "object") {
    return [{ path, value }, ...Object.entries(value).flatMap(([key, item]) => entries(item, path ? `${path}.${key}` : key))];
  }
  return [{ path, value }];
}

function kind(value: unknown): string {
  if (Array.isArray(value)) return `a list of ${value.length}`;
  return typeof value;
}

/** The {variables} a text contains, which the site replaces with a character, a key name, a number… */
function variables(text: string): string[] {
  return Array.from(text.matchAll(/\{(\w+)\}/g), (match) => match[1] ?? "").sort();
}

const english = new Map(entries(en).map((entry) => [entry.path, entry.value]));
const french = new Map(entries(fr).map((entry) => [entry.path, entry.value]));

describe("dictionaries", () => {
  it("fr.json has every entry of en.json, and no other", () => {
    const missing = [...english.keys()].filter((path) => !french.has(path));
    const extra = [...french.keys()].filter((path) => !english.has(path));
    expect(missing, `Missing from fr.json: ${missing.join(", ")}`).toEqual([]);
    expect(extra, `In fr.json but not in en.json: ${extra.join(", ")}`).toEqual([]);
  });

  it.each([...english].filter(([path]) => path !== ""))("%s has the same shape in both languages", (path, value) => {
    const translated = french.get(path);
    if (translated === undefined) return;
    expect(kind(translated), `"${path}" is ${kind(value)} in en.json but ${kind(translated)} in fr.json`).toBe(kind(value));
  });

  it.each([...english].filter(([, value]) => typeof value === "string"))("%s keeps its {variables} and is not empty", (path, value) => {
    const translated = french.get(path);
    if (typeof translated !== "string" || typeof value !== "string") return;
    expect(value.trim(), `"${path}" is empty in en.json`).not.toBe("");
    expect(translated.trim(), `"${path}" is empty in fr.json`).not.toBe("");
    expect(
      variables(translated),
      `"${path}" must contain the same {variables} in both languages. en.json: "${value}", fr.json: "${translated}"`,
    ).toEqual(variables(value));
  });
});
