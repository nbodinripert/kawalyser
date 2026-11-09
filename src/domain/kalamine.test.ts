import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findBlockingDuplicates } from "./duplicates";
import { mainKeyId, thumbKeyIds } from "./geometry";
import { importKalamine } from "./kalamine";

const propergol = readFileSync(join(__dirname, "__fixtures__", "propergol.toml"), "utf8");

describe("importKalamine with propergol.toml", () => {
  const imported = importKalamine(propergol, "split40");
  if (!imported.ok) throw new Error("propergol.toml should import");
  const keys = imported.layout.keys;

  it("reads the name", () => {
    expect(imported.layout.name).toBe("Propergol");
  });

  it("places the green keys on the main pad, with all four zones", () => {
    expect(keys[mainKeyId(0, 1)]).toEqual({ base: "-", shift: "!" });
    expect(keys[mainKeyId(0, 2)]).toEqual({ base: "é", shift: "É", dk: "œ" });
    expect(keys[mainKeyId(0, 5)]).toEqual({ base: ",", shift: "?", dk: "@", dkShift: "¿" });
    expect(keys[mainKeyId(0, 6)]).toEqual({ base: "v", shift: "V", dk: "„", dkShift: '"' });
    expect(keys[mainKeyId(1, 5)]).toEqual({ base: ".", shift: ":", dk: "…", dkShift: "·" });
    expect(keys[mainKeyId(2, 10)]).toEqual({ base: "*", shift: ";" });
  });

  it("leaves out other dead keys", () => {
    expect(keys[mainKeyId(1, 6)]).toEqual({ base: "g", shift: "G" });
    expect(keys[mainKeyId(2, 7)]).toEqual({ base: "d", shift: "D" });
  });

  it("puts the purple keys on the lower outer keys, and the yellow key on the left thumb", () => {
    expect(keys[mainKeyId(1, 0)]).toEqual({ base: "'", shift: '"', dk: "←", dkShift: "⇐" });
    expect(keys[mainKeyId(2, 0)]?.base).toBe("_");
    expect(keys[mainKeyId(1, 11)]?.base).toBe("-");
    expect(keys[mainKeyId(2, 11)]?.base).toBe("'");
    expect(keys[mainKeyId(0, 0)]).toBeUndefined();
    expect(keys[thumbKeyIds.leftOuter]).toEqual({ base: "e", shift: "E", dk: "ê" });
  });

  it("fills the other thumbs and reads the space bar section", () => {
    expect(keys[thumbKeyIds.leftInner]).toEqual({ base: "#" });
    expect(keys[thumbKeyIds.rightInner]).toEqual({ base: "$" });
    expect(keys[thumbKeyIds.rightOuter]).toEqual({ base: " ", dk: "_", dkShift: "‑" });
  });

  it("accepts a duplicate between the main pad and an outer key", () => {
    expect(findBlockingDuplicates(imported.layout)).toEqual([]);
  });

  it("drops the outer keys on the 34-key board", () => {
    const small = importKalamine(propergol, "split34");
    expect(small.ok && small.layout.keys[mainKeyId(1, 0)]).toBeFalsy();
  });
});

describe("importKalamine errors", () => {
  it("reports an unreadable file", () => {
    const result = importKalamine("name = ", "split40");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.problem.kind).toBe("unreadable");
  });

  it("reports an unknown geometry", () => {
    const result = importKalamine('geometry = "JIS"\nbase = """x"""', "split40");
    expect(!result.ok && result.problem).toEqual({ kind: "unknown-geometry", geometry: "JIS" });
  });

  it("reports a file without layer", () => {
    const result = importKalamine('name = "x"', "split40");
    expect(!result.ok && result.problem.kind).toBe("no-layer");
  });
});

describe("findBlockingDuplicates", () => {
  it("refuses a character on two keys of the main pad", () => {
    const layout = {
      name: "",
      shapeId: "split40" as const,
      keys: { [mainKeyId(0, 1)]: { base: "a" }, [mainKeyId(0, 2)]: { base: "A" } },
    };
    expect(findBlockingDuplicates(layout)).toEqual([{ char: "a", layer: "direct", keys: [mainKeyId(0, 1), mainKeyId(0, 2)] }]);
  });
});
