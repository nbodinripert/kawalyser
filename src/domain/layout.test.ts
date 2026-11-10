import { describe, expect, it } from "vitest";
import { sameLayout, type Layout } from "./layout";

const layout: Layout = { name: "", shapeId: "split40", keys: { a: { base: "r", shift: "R" }, b: { base: "," } } };

describe("sameLayout", () => {
  it("compares the content, not the reference", () => {
    expect(sameLayout(layout, JSON.parse(JSON.stringify(layout)) as Layout)).toBe(true);
  });

  it("treats a key left empty by edits as a missing key", () => {
    expect(sameLayout(layout, { ...layout, keys: { ...layout.keys, c: {} } })).toBe(true);
  });

  it("sees a moved character or another shape", () => {
    expect(sameLayout(layout, { ...layout, keys: { ...layout.keys, b: { shift: "," } } })).toBe(false);
    expect(sameLayout(layout, { ...layout, shapeId: "split34" })).toBe(false);
  });
});
