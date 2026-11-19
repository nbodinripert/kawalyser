import { describe, expect, it } from "vitest";
import { propergolToml } from "@/domain/__fixtures__/propergol-toml";
import { importKalamine } from "@/domain/kalamine";
import { visibleZones } from "@/domain/layout";
import { emptyReplacements } from "@/domain/replacements";
import { analyse } from "./analyse";
import { createCodec } from "./codec";
import { ngramsCsv } from "./export";

const imported = importKalamine(propergolToml, "split40");
if (!imported.ok) throw new Error("default layout should import");
const layout = imported.layout;

const run = (corpus: string) => analyse(corpus, { layout, replacements: emptyReplacements, level: "raw" });

describe("characters missing from the map (question 34 of the specs)", () => {
  it("lists them by frequency, with their share of the corpus characters", () => {
    const { missingChars } = run("über über ü ô\n").result;
    // "ô" is typed with the dead key; "ü" is nowhere on Propergol.
    expect(missingChars.entries.map((entry) => entry.gram)).toEqual(["ü"]);
    expect(missingChars.entries[0]?.count).toBe(3);
    expect(missingChars.share).toBeCloseTo(3 / 13);
  });

  it("leaves out a character of a Shift zone: it is on the map", () => {
    // In Propergol, "?" is the Shift character of the "," key.
    expect(run("? ü\n").result.missingChars.entries.map((entry) => entry.gram)).toEqual(["ü"]);
  });

  describe("a character that a replacement types (feedback on characters typed by replacements)", () => {
    // Without the outer columns, Propergol has no apostrophe key: Repeat types it, as in propergol.json.
    const withoutApostrophe = { ...layout, shapeId: "split34" as const };
    const replacements = { essentialCorrections: [{ text: "'", keys: "$" }], optionalCorrections: [] };
    const missingAt = (level: "raw" | "corrections") =>
      analyse("l'eau ü\n", { layout: withoutApostrophe, replacements, level }).result.missingChars;

    it("is analysed, so it is not listed", () => {
      expect(missingAt("corrections").entries.map((entry) => entry.gram)).toEqual(["ü"]);
      expect(missingAt("corrections").share).toBeCloseTo(1 / 7);
    });

    it("is listed when the level leaves the replacements out", () => {
      expect(missingAt("raw").entries.map((entry) => entry.gram)).toEqual(["'", "ü"]);
    });
  });
});

describe("characters outside the Basic Multilingual Plane", () => {
  it("counts an emoji as one character and shows it as written", () => {
    const { result } = run("a \u{1F600} a \u{1F600}\n");
    expect(result.totals.characters).toBe(7);
    expect(result.missingChars.entries).toEqual([{ gram: "\u{1F600}", count: 2, share: 2 / 7 }]);
  });

  it("writes it as is in the CSV export", () => {
    const csv = ngramsCsv(run("\u{1F600}\n"), { separator: ",", headers: { words: "w", typed: "t", count: "n", characters: "c", layoutCount: "l", corpusCount: "o", change: "ch", quadrigrams: "4", trigrams: "3", bigrams: "2", share: "s", lists: {} } });
    expect(csv).toContain("\u{1F600}");
  });

  it("never mistakes a private-use character of the corpus for a special key", () => {
    const { result } = run("\ue000e\n");
    expect(result.missingChars.entries.map((entry) => entry.gram)).toEqual(["\ue000"]);
  });

  it("gives each character its own symbol, and the character back", () => {
    const codec = createCodec();
    const text = "\u{1F600}x\u{1F680}\u{1F600}";
    const encoded = codec.encode(text);
    expect(encoded.length).toBe(4);
    expect(encoded.charAt(0)).toBe(encoded.charAt(3));
    expect(codec.decode(encoded)).toBe(text);
  });
});

describe("visibleZones", () => {
  it("shows every character, even those the v1 lists hid", () => {
    // Propergol's B key: "(" and "{" in the dead key layer.
    expect(visibleZones(layout.keys.k25 ?? {})).toMatchObject({ dk: "(", dkShift: "{" });
  });
});
