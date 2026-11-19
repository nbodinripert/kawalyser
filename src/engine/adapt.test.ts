import { describe, expect, it } from "vitest";
import { propergolToml } from "@/domain/__fixtures__/propergol-toml";
import { importKalamine } from "@/domain/kalamine";
import type { Layout } from "@/domain/layout";
import { parseReplacements, type Replacements } from "@/domain/replacements";
import { createAdapter } from "./adapt";
import { buildKeyMap, DK, MAGIC, REPEAT } from "./keymap";

const imported = importKalamine(propergolToml, "split40");
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
  const keyMap = buildKeyMap(layout);
  const adapter = createAdapter(keyMap, replacements, { level });
  return adapter.adaptLine(text).adapted.join(" ");
}

describe("createAdapter", () => {
  it("types dead key characters with the dead key, then the key", () => {
    expect(typed("être")).toBe(`${DK}etre`);
  });

  it("uses Repeat for doubled characters when the key is placed", () => {
    expect(typed("elle", "corrections")).toBe(`el${REPEAT}e`);
    expect(typed("elle", "raw")).toBe(`el${REPEAT}e`);
  });

  it("does not use Repeat when the key is not on the map, at any level", () => {
    const without: Layout = { ...layout, keys: Object.fromEntries(Object.entries(layout.keys).map(([id, chars]) => [id, Object.fromEntries(Object.entries(chars).filter(([, char]) => char !== "$"))])) };
    for (const level of ["raw", "corrections", "clever"] as const) {
      const adapter = createAdapter(buildKeyMap(without), replacements, { level });
      expect(adapter.adaptLine("elle").adapted.join(" ")).toBe("elle");
    }
  });

  it("does not use Repeat for a character typed with the dead key, as Repeat would repeat the last press only", () => {
    // In Propergol, "ô" is typed "*o": "ôô" takes "*o*o", since "*o$" would type "ôo".
    expect(typed("ôô")).toBe(`${DK}o${DK}o`);
    // "é" has its own key: Repeat applies.
    expect(typed("créé")).toBe(`cré${REPEAT}`);
  });

  it("does not use Repeat for a character missing from the map", () => {
    const withoutZ: Layout = { ...layout, keys: Object.fromEntries(Object.entries(layout.keys).filter(([, chars]) => chars.base !== "z")) };
    const adapter = createAdapter(buildKeyMap(withoutZ), replacements, { level: "raw" });
    expect(adapter.adaptLine("pizza").adapted.join(" ")).toBe("pizza");
  });

  it("keeps the Excel behaviour in compat mode: Repeat only from the corrections level, key or not", () => {
    const keyMap = buildKeyMap(layout);
    expect(createAdapter(keyMap, replacements, { level: "raw", compat: true }).adaptLine("elle").adapted.join(" ")).toBe("elle");
    expect(createAdapter(keyMap, replacements, { level: "corrections", compat: true }).adaptLine("elle").adapted.join(" ")).toBe(`el${REPEAT}e`);
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

  it("ignores a rule that needs a key missing from the map (feedback on untypeable rules)", () => {
    const withoutMagic: Layout = { ...layout, keys: Object.fromEntries(Object.entries(layout.keys).filter(([, chars]) => chars.base !== "#")) };
    const adapter = createAdapter(buildKeyMap(withoutMagic), replacements, { level: "clever" });
    // "ment" needs Magic: left as it is, and not counted in the cognitive load. "quand" can still be typed.
    expect(adapter.adaptLine("rapidement quand").adapted).toEqual(["rapidement", "qn"]);
    expect(adapter.usage.has("ment")).toBe(false);
  });

  it("ignores an essential correction that needs a character missing from the map", () => {
    const withoutQ: Layout = { ...layout, keys: Object.fromEntries(Object.entries(layout.keys).filter(([, chars]) => chars.base !== "q")) };
    const adapter = createAdapter(buildKeyMap(withoutQ), replacements, { level: "corrections" });
    expect(adapter.adaptLine("quoi").adapted).toEqual(["quoi"]);
  });

  it("applies every rule in compat mode, as the Excel analyser does", () => {
    const withoutMagic: Layout = { ...layout, keys: Object.fromEntries(Object.entries(layout.keys).filter(([, chars]) => chars.base !== "#")) };
    const adapter = createAdapter(buildKeyMap(withoutMagic), replacements, { level: "clever", compat: true });
    expect(adapter.adaptLine("rapidement").adapted).toEqual([`rapide${"m" + MAGIC}`]);
  });

  it("treats every accented letter as a letter (question 13 of the specs)", () => {
    // "pas" may only be replaced as a whole word: "è" right after it is a letter, so nothing changes.
    expect(typed("pasè").startsWith("pas")).toBe(true);
  });

  it("removes the map's special symbols from the corpus, and keeps £, € and & (question 32 of the specs)", () => {
    const keyMap = buildKeyMap(layout);
    const { cleaned } = createAdapter(keyMap, replacements, { level: "raw" }).adaptLine("**a#b$c** 5€ & 3£ peut-être");
    expect(cleaned).toBe("abc 5€ & 3£ peut-être");
  });

  it("keeps the Excel cleaning in compat mode", () => {
    const { cleaned } = createAdapter(buildKeyMap(layout, { compat: true }), replacements, { level: "raw", compat: true }).adaptLine("a#b$c€d&e£*");
    expect(cleaned).toBe("a#bcde*");
  });

  it("reads no-break spaces and tabs as spaces (question 33 of the specs)", () => {
    const { words } = createAdapter(buildKeyMap(layout), replacements, { level: "raw" }).adaptLine("oui\u202f! non\u00a0?\tbon");
    expect(words).toEqual(["oui", "!", "non", "?", "bon"]);
  });

  it("joins a letter and its combining accent into one character", () => {
    expect(typed("cre\u0301e\u0301")).toBe(typed("créé"));
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

describe("without the list of valid characters (v2 specs)", () => {
  it("types a character the v1 lists left out", () => {
    // In Propergol, "(" sits in the dead key layer of B.
    expect(typed("(")).toBe(`${DK}b`);
  });

  it("uses Repeat for any doubled character typed with one key press, punctuation included (question 26)", () => {
    expect(typed("--")).toBe(`-${REPEAT}`);
    expect(typed("..")).toBe(`.${REPEAT}`);
  });
});
