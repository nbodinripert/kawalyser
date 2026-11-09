import { describe, expect, it } from "vitest";
import { defaultLayoutToml } from "@/domain/default-layout";
import { importKalamine } from "@/domain/kalamine";
import { parseReplacements, type Replacements } from "@/domain/replacements";
import { createAdapter } from "./adapt";
import { buildKeyMap, DK, MAGIC, REPEAT } from "./keymap";

const imported = importKalamine(defaultLayoutToml, "split40");
if (!imported.ok) throw new Error("default layout should import");
const layout = imported.layout;

const replacements: Replacements = {
  essentialCorrections: [{ text: "qu", keys: "q" }],
  optionalCorrections: [
    { text: "quand", keys: "qn" },
    { text: "ment", keys: "m#", noLetterAfter: true, allowedAfter: ["s"] },
    { text: "pas", keys: "pc", noLetterBefore: true, noLetterAfter: true },
  ],
};

function typed(text: string, level: "raw" | "corrections" | "clever" = "clever") {
  const keyMap = buildKeyMap(layout, { language: "fr" });
  const adapter = createAdapter(keyMap, replacements, { level, language: "fr" });
  return adapter.adaptLine(text).adapted.join(" ");
}

describe("createAdapter", () => {
  it("types dead key characters with the dead key, then the key", () => {
    expect(typed("être")).toBe(`${DK}etre`);
  });

  it("uses Repeat for doubled characters when the key is placed", () => {
    expect(typed("elle", "corrections")).toBe(`el${REPEAT}e`);
    expect(typed("elle", "raw")).toBe("elle");
  });

  it("applies Clever Keys before the corrections, word by word", () => {
    expect(typed("quand", "clever")).toBe("qn");
    expect(typed("quand", "corrections")).toBe("qand");
  });

  it("respects the conditions around a Clever Key", () => {
    expect(typed("rapidement")).toBe(`rapide${"m" + MAGIC}`);
    expect(typed("rapidements")).toBe(`rapide${"m" + MAGIC}s`);
    expect(typed("mentir")).toBe("mentir");
    expect(typed("pas")).toBe("pc");
    expect(typed("repas")).toBe("repas");
  });

  it("treats every accented letter as a letter (question 13 of the specs)", () => {
    // "pas" may only be replaced as a whole word: "è" right after it is a letter, so nothing changes.
    expect(typed("pasè").startsWith("pas")).toBe(true);
  });

  it("cleans the reserved symbols out of the corpus", () => {
    expect(typed("a#b$c€d&e£")).toBe("abcde");
  });
});

describe("parseReplacements", () => {
  it("accepts a single allowed character or a list", () => {
    const parsed = parseReplacements('{"optionalCorrections":[{"text":"ment","keys":"m#","allowedAfter":"s"},{"text":"pas","keys":"pc","allowedBefore":["x","y"]}]}');
    expect(parsed.ok && parsed.replacements.optionalCorrections.map((rule) => [rule.allowedAfter, rule.allowedBefore])).toEqual([
      [["s"], undefined],
      [undefined, ["x", "y"]],
    ]);
  });

  it("explains what is wrong", () => {
    const parsed = parseReplacements('{"essentialCorrections":[{"keys":"q"}]}');
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.detail).toContain("essentialCorrections.0.text");
  });
});

describe("labels (feedback 6)", () => {
  it("shows the space as ␣, so that _ keeps meaning the skipped middle character", async () => {
    const { tokenLabel, DK_SPACE } = await import("./keymap");
    expect(tokenLabel(" ")).toBe("␣");
    expect(tokenLabel(DK_SPACE)).toBe("␣");
    expect(tokenLabel("_")).toBe("_");
  });
});

describe("valid characters (feedback 4)", () => {
  it("accepts ù in French and _ in both languages", async () => {
    const { isValidChar } = await import("@/domain/valid-chars");
    expect(isValidChar("ù", "fr")).toBe(true);
    expect(isValidChar("Ù", "fr")).toBe(true);
    expect(isValidChar("_", "fr")).toBe(true);
    expect(isValidChar("_", "en")).toBe(true);
  });
});
