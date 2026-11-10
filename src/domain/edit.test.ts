import { describe, expect, it } from "vitest";
import { clearZone, dropZone, moveZone, tryMove, tryType, typeIntoZone } from "./edit";
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

describe("special keys (*, $, #, space) only work in the base zone", () => {
  const withKeys: Layout = {
    ...layout,
    keys: { ...layout.keys, t: { base: "$", dk: "_" }, m: { base: "#" }, e: { base: "e", shift: "E", dk: "é", dkShift: "É" } },
  };

  it("lands in the base zone when dropped on the top-left zone of another key", () => {
    const next = moveZone(withKeys, { key: "m", zone: "base" }, { key: "b", zone: "shift" });
    expect(next.keys.b).toEqual({ base: "#", shift: "?" });
    expect(next.keys.m).toEqual({ base: "," });
  });

  it("lands in the base zone when dropped on the dead key side of a key", () => {
    const next = moveZone(withKeys, { key: "m", zone: "base" }, { key: "b", zone: "dkShift" });
    expect(next.keys.b).toEqual({ base: "#", shift: "?" });
  });

  it("does not move when dropped on its own key", () => {
    expect(moveZone(withKeys, { key: "t", zone: "base" }, { key: "t", zone: "shift" })).toBe(withKeys);
  });

  it("swaps whole layers with a letter, like any other move", () => {
    const next = moveZone(withKeys, { key: "m", zone: "base" }, { key: "c", zone: "shift" });
    expect(next.keys.c).toEqual({ base: "#" });
    expect(next.keys.m).toEqual({ base: "l", shift: "L" });
  });

  it("is placed in the base zone when typed over any zone", () => {
    const next = typeIntoZone(withKeys, { key: "b", zone: "shift" }, "#");
    expect(next.keys.b).toEqual({ base: "#", shift: "?" });
    expect(next.keys.m).toEqual({ base: "," });
  });

  it("is placed in the base zone when it is not on the map yet, replacing a letter and its capital", () => {
    const without: Layout = { ...withKeys, keys: { ...withKeys.keys, m: {} } };
    expect(typeIntoZone(without, { key: "c", zone: "shift" }, "#").keys.c).toEqual({ base: "#" });
    expect(typeIntoZone(without, { key: "b", zone: "dk" }, "#").keys.b).toEqual({ base: "#", shift: "?" });
  });

  it("refuses a swap that would send it to a zone where it is ignored", () => {
    // "?" (shift of b) dropped on the base of the "$" key would send "$" to the shift zone of b.
    expect(moveZone(withKeys, { key: "b", zone: "shift" }, { key: "t", zone: "base" })).toBe(withKeys);
    // "é" (dead key layer of e) swapped with the "$" key would send "$" to the dead key layer.
    expect(moveZone(withKeys, { key: "e", zone: "dk" }, { key: "t", zone: "base" })).toBe(withKeys);
  });

  it("allows a swap that sends it to another base zone", () => {
    const next = moveZone(withKeys, { key: "b", zone: "base" }, { key: "t", zone: "base" });
    expect(next.keys.t).toEqual({ base: ",", dk: "_" });
    expect(next.keys.b).toEqual({ base: "$", shift: "?" });
  });

  it("names the key that made it refuse a move or a typed character, to explain the refusal", () => {
    expect(tryMove(withKeys, { key: "b", zone: "shift" }, { key: "t", zone: "base" })).toEqual({ layout: withKeys, refused: "$" });
    expect(tryType(withKeys, { key: "t", zone: "base" }, "?")).toEqual({ layout: withKeys, refused: "$" });
    expect(tryMove(withKeys, { key: "b", zone: "base" }, { key: "t", zone: "base" }).refused).toBeUndefined();
  });

  it("treats space the same way, as the engine also reads it in the base zone only", () => {
    const withSpace: Layout = { ...withKeys, keys: { ...withKeys.keys, s: { base: " ", dk: "_" } } };
    expect(moveZone(withSpace, { key: "s", zone: "base" }, { key: "b", zone: "shift" }).keys.b).toEqual({ base: " ", shift: "?" });
    expect(tryMove(withSpace, { key: "e", zone: "dk" }, { key: "s", zone: "base" }).refused).toBe(" ");
  });

  it("brings back to the base zone a key left elsewhere by an older session", () => {
    const misplaced: Layout = { ...withKeys, keys: { ...withKeys.keys, t: { shift: "$" } } };
    expect(moveZone(misplaced, { key: "t", zone: "shift" }, { key: "t", zone: "base" }).keys.t).toEqual({ base: "$" });
  });
});
