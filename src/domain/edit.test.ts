import { describe, expect, it } from "vitest";
import { clearZone, dropZone, moveZone, typeIntoZone } from "./edit";
import { completeLetterPairs, type Layout } from "./layout";

const layout: Layout = {
  name: "",
  shapeId: "split40",
  keys: {
    a: { base: "r", shift: "R", dk: "ç" },
    b: { base: ",", shift: "?" },
    c: { base: "l", shift: "L" },
  },
};

describe("moveZone", () => {
  it("swaps two single characters", () => {
    const next = moveZone(layout, { key: "b", zone: "shift" }, { key: "c", zone: "dk" });
    expect(next.keys.b).toEqual({ base: "," });
    expect(next.keys.c).toEqual({ base: "l", shift: "L", dk: "?" });
  });

  it("swaps whole layers when a letter is involved, since a letter keeps its capital", () => {
    const next = moveZone(layout, { key: "b", zone: "shift" }, { key: "a", zone: "dk" });
    expect(next.keys.b).toEqual({ base: "ç", shift: "Ç" });
    expect(next.keys.a).toEqual({ base: "r", shift: "R", dk: ",", dkShift: "?" });
  });

  it("moves a letter with its capital and swaps whole layers", () => {
    const next = moveZone(layout, { key: "a", zone: "shift" }, { key: "c", zone: "base" });
    // The letter alone in the dead key layer now carries its capital too.
    expect(next.keys.a).toEqual({ base: "l", shift: "L", dk: "ç", dkShift: "Ç" });
    expect(next.keys.c).toEqual({ base: "r", shift: "R" });
  });

  it("moves into an empty zone", () => {
    const next = moveZone(layout, { key: "a", zone: "dk" }, { key: "c", zone: "dk" });
    expect(next.keys.a).toEqual({ base: "r", shift: "R" });
    expect(next.keys.c).toEqual({ base: "l", shift: "L", dk: "ç", dkShift: "Ç" });
  });

  it("does nothing when dropped on itself or from an empty zone", () => {
    expect(moveZone(layout, { key: "a", zone: "dk" }, { key: "a", zone: "dk" })).toBe(layout);
    expect(moveZone(layout, { key: "c", zone: "dk" }, { key: "a", zone: "dk" })).toBe(layout);
  });
});

describe("dropZone", () => {
  it("keeps a letter in its layer wherever it lands in the middle of a key", () => {
    for (const [x, y] of [
      [0.5, 0.5],
      [0.6, 0.6],
      [0.2, 0.6],
      [0.4, 0.1],
    ] as const) {
      expect(dropZone("shift", x, y)).toBe("shift");
    }
  });

  it("moves to the dead key layer only on the right edge", () => {
    expect(dropZone("shift", 0.8, 0.5)).toBe("dkShift");
    expect(dropZone("base", 0.8, 0.8)).toBe("dk");
  });

  it("lets a dead key character come back to the direct layer on the left edge", () => {
    expect(dropZone("dk", 0.5, 0.5)).toBe("dk");
    expect(dropZone("dk", 0.2, 0.5)).toBe("base");
  });

  it("changes row only on the far edge", () => {
    expect(dropZone("base", 0.3, 0.5)).toBe("base");
    expect(dropZone("base", 0.3, 0.2)).toBe("shift");
    expect(dropZone("shift", 0.3, 0.9)).toBe("base");
  });
});

describe("typeIntoZone (question 25 of the specs)", () => {
  it("swaps with the typed character when it is already on the map", () => {
    const next = typeIntoZone(layout, { key: "a", zone: "shift" }, "L");
    expect(next.keys.a?.base).toBe("l");
    expect(next.keys.c?.base).toBe("r");
  });

  it("replaces the character when the typed one is not on the map", () => {
    const next = typeIntoZone(layout, { key: "a", zone: "base" }, "k");
    expect(next.keys.a).toEqual({ base: "k", shift: "K", dk: "ç", dkShift: "Ç" });
  });

  it("types a symbol in a single zone", () => {
    const next = typeIntoZone(layout, { key: "b", zone: "shift" }, "!");
    expect(next.keys.b).toEqual({ base: ",", shift: "!" });
  });

  it("replaces a letter pair with a symbol", () => {
    const next = typeIntoZone(layout, { key: "c", zone: "base" }, "/");
    expect(next.keys.c).toEqual({ base: "/" });
  });
});

describe("letters always come with their other case (feedback 7)", () => {
  const withAccents: Layout = {
    name: "",
    shapeId: "split40",
    keys: {
      z: { base: "z", shift: "Z", dk: "è" },
      empty: {},
      comma: { base: ",", shift: "?" },
    },
  };

  it("pairs è with È when it moves to the direct layer of a key", () => {
    const next = moveZone(withAccents, { key: "z", zone: "dk" }, { key: "empty", zone: "base" });
    expect(next.keys.empty).toEqual({ base: "è", shift: "È" });
  });

  it("pairs a typed è with È, like any other letter", () => {
    const next = typeIntoZone({ ...withAccents, keys: { ...withAccents.keys, z: { base: "z", shift: "Z" } } }, { key: "empty", zone: "base" }, "è");
    expect(next.keys.empty).toEqual({ base: "è", shift: "È" });
  });

  it("fills the missing small letter when a capital lands alone, so the analysis sees it", () => {
    expect(completeLetterPairs({ shift: "È" })).toEqual({ base: "è", shift: "È" });
  });

  it("leaves symbols and letters without a single-character capital alone", () => {
    expect(completeLetterPairs({ base: "," })).toEqual({ base: "," });
    expect(completeLetterPairs({ base: "ß" })).toEqual({ base: "ß" });
    expect(completeLetterPairs({ base: "_", shift: "?" })).toEqual({ base: "_", shift: "?" });
  });
});

describe("clearZone", () => {
  it("empties a symbol and leaves its neighbour alone", () => {
    const next = clearZone(layout, { key: "b", zone: "shift" });
    expect(next.keys.b).toEqual({ base: "," });
  });

  it("empties a letter together with its capital, from either zone", () => {
    expect(clearZone(layout, { key: "c", zone: "shift" }).keys.c).toEqual({});
    expect(clearZone(layout, { key: "c", zone: "base" }).keys.c).toEqual({});
  });

  it("empties a letter of the dead key layer without touching the direct layer", () => {
    const next = clearZone({ ...layout, keys: { ...layout.keys, a: { base: "r", shift: "R", dk: "ç", dkShift: "Ç" } } }, { key: "a", zone: "dk" });
    expect(next.keys.a).toEqual({ base: "r", shift: "R" });
  });

  it("returns the same layout for an empty zone, so that nothing is recorded to undo", () => {
    expect(clearZone(layout, { key: "b", zone: "dk" })).toBe(layout);
  });
});
