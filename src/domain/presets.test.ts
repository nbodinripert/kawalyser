import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPreset, parsePresetList, presetListFile, type Preset } from "./presets";

// The real folder: a contributor who breaks a file learns here which file and which field to fix.
const folder = join(process.cwd(), "layouts");
const read = (file: string) => readFileSync(join(folder, file), "utf8");

const list = parsePresetList(read(presetListFile));

function load(toml: string): Preset {
  if (!list.ok) throw new Error(list.problem);
  const entry = list.value.find((item) => item.toml === toml);
  if (!entry) throw new Error(`${toml} is not listed in ${presetListFile}`);
  const built = buildPreset(entry, read(entry.toml), entry.replacements ? read(entry.replacements) : null);
  if (!built.ok) throw new Error(built.problem);
  return built.value;
}

describe("the layouts folder", () => {
  it(`has a valid ${presetListFile}`, () => {
    expect(list.ok ? "valid" : list.problem).toBe("valid");
  });

  for (const entry of list.ok ? list.value : []) {
    it(`loads ${entry.name} (${entry.toml})`, () => {
      for (const file of [entry.toml, entry.replacements]) {
        if (file !== undefined) expect(existsSync(join(folder, file)) ? file : `${file} is listed in ${presetListFile} but missing from the layouts folder`).toBe(file);
      }
      const built = buildPreset(entry, read(entry.toml), entry.replacements ? read(entry.replacements) : null);
      expect(built.ok ? "loaded" : built.problem).toBe("loaded");
    });
  }
});

describe("buildPreset", () => {
  it("places Propergol's thumbs, replacements and corpus", () => {
    const preset = load("propergol.toml");
    expect(preset.layout.keys.tlo).toMatchObject({ base: "e", shift: "E", dk: "ê" });
    expect(preset.layout.keys.tli).toEqual({ base: "#" });
    expect(preset.layout.keys.tri).toEqual({ base: "$" });
    expect(preset.layout.keys.tro).toMatchObject({ base: " ", dk: "_" });
    expect(preset.replacementsName).toBe("propergol.json");
    expect(preset.replacements.essentialCorrections.length).toBeGreaterThan(0);
    expect(preset.corpus).toBe("fr");
  });

  it("leaves a thumb key empty when the list does not describe it (question 43 of the specs)", () => {
    const preset = load("ergol.toml");
    expect(preset.layout.keys.tlo).toBeUndefined();
    expect(preset.layout.keys.tli).toBeUndefined();
    expect(preset.layout.keys.tri).toBeUndefined();
    // Ergo-L types the apostrophe with the dead key and space; the curly one is read as straight.
    expect(preset.layout.keys.tro).toMatchObject({ base: " ", dk: "'" });
    expect(preset.replacementsName).toBeNull();
  });

  it("puts a character the .toml does not draw alone on its thumb key", () => {
    const entry = { name: "Test", toml: "ergol.toml", thumbs: { leftHome: "*" } };
    const built = buildPreset(entry, read("ergol.toml"), null);
    expect(built.ok && built.value.layout.keys.tlo).toEqual({ base: "*" });
  });

  it("names the missing replacements file", () => {
    const built = buildPreset({ name: "Test", toml: "ergol.toml", replacements: "nowhere.json", thumbs: {} }, read("ergol.toml"), null);
    expect(!built.ok && built.problem).toBe("nowhere.json is missing from the layouts folder");
  });
});

describe("parsePresetList", () => {
  it("names an unknown thumb key, so that a typo does not go unnoticed", () => {
    const parsed = parsePresetList('[{ "name": "A", "toml": "a.toml", "thumbs": { "rightOuter": " " } }]');
    expect(!parsed.ok && parsed.problem).toBe('layouts.json: entry 1 (A), thumbs: Unrecognized key: "rightOuter"');
  });

  it("refuses a thumb key with more than one character", () => {
    const parsed = parsePresetList('[{ "name": "A", "toml": "a.toml", "thumbs": { "rightHome": "ab" } }]');
    expect(!parsed.ok && parsed.problem).toBe("layouts.json: entry 1 (A), thumbs.rightHome: must be a single character");
  });

  it("refuses a file listed twice", () => {
    const parsed = parsePresetList('[{ "name": "A", "toml": "a.toml" }, { "name": "B", "toml": "a.toml" }]');
    expect(!parsed.ok && parsed.problem).toBe('layouts.json: "a.toml" is listed twice');
  });

  it("refuses a path outside the layouts folder", () => {
    const parsed = parsePresetList('[{ "name": "A", "toml": "../secret.toml" }]');
    expect(parsed.ok).toBe(false);
  });
});
