export type Hand = "left" | "right";
export type Finger = "thumb" | "index" | "middle" | "ring" | "pinky";
export type KeyRole = "pad" | "outer" | "thumb";

export const shapeIds = ["split40", "split34"] as const;
export type ShapeId = (typeof shapeIds)[number];

export type KeySlot = {
  id: string;
  role: KeyRole;
  hand: Hand;
  finger: Finger;
  /** Position on the drawing, in key units. */
  x: number;
  y: number;
  /**
   * Coordinates used by the statistics, identical to the Excel analyser:
   * rows 1 to 3 from the top, columns 1 to 12 for the main pad,
   * 6 and 7 for the thumbs, and 0 and 13 for the outer columns.
   */
  row: number;
  col: number;
  home: boolean;
  inner: boolean;
  /** Index of the finger bar, 0 for the left pinky to 9 for the right pinky. */
  bar: number;
};

export type Shape = {
  id: ShapeId;
  keys: KeySlot[];
  width: number;
  height: number;
};

const fingerByColumn: Record<number, Finger> = {
  0: "pinky",
  1: "pinky",
  2: "ring",
  3: "middle",
  4: "index",
  5: "index",
  8: "index",
  9: "index",
  10: "middle",
  11: "ring",
  12: "pinky",
  13: "pinky",
};

const barByColumn: Record<number, number> = {
  0: 0,
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 3,
  6: 4,
  7: 5,
  8: 6,
  9: 6,
  10: 7,
  11: 8,
  12: 9,
  13: 9,
};

/** Finger codes of the Excel analyser: the higher, the further from the thumb. */
export const fingerCode: Record<Finger, number> = {
  thumb: 1,
  index: 2,
  middle: 3,
  ring: 4,
  pinky: 5,
};

/** Grid column (0 to 11, left to right) to analysis column. */
function analysisColumn(gridCol: number): number {
  return gridCol < 6 ? gridCol : gridCol + 2;
}

export function mainKeyId(row: number, gridCol: number): string {
  return `k${row}${gridCol.toString(16)}`;
}

export const thumbKeyIds = {
  leftOuter: "tlo",
  leftInner: "tli",
  rightInner: "tri",
  rightOuter: "tro",
} as const;

function buildShape(id: ShapeId, withOuterColumns: boolean): Shape {
  const keys: KeySlot[] = [];

  for (let row = 0; row < 3; row++) {
    for (let gridCol = 0; gridCol < 12; gridCol++) {
      const col = analysisColumn(gridCol);
      const outer = col === 0 || col === 13;
      if (outer && !withOuterColumns) continue;

      const finger = fingerByColumn[col] ?? "index";
      keys.push({
        id: mainKeyId(row, gridCol),
        role: outer ? "outer" : "pad",
        hand: gridCol < 6 ? "left" : "right",
        finger,
        x: gridCol < 6 ? gridCol : gridCol + 1,
        y: row,
        row: row + 1,
        col,
        home: row === 1 && !outer && col !== 5 && col !== 8,
        inner: col === 5 || col === 8,
        bar: barByColumn[col] ?? 0,
      });
    }
  }

  const thumbs: Array<[string, Hand, number, number, boolean]> = [
    [thumbKeyIds.leftOuter, "left", 4, 2, true],
    [thumbKeyIds.leftInner, "left", 5, 3, false],
    [thumbKeyIds.rightInner, "right", 7, 3, false],
    [thumbKeyIds.rightOuter, "right", 8, 2, true],
  ];
  for (const [thumbId, hand, x, row, home] of thumbs) {
    const col = hand === "left" ? 6 : 7;
    keys.push({
      id: thumbId,
      role: "thumb",
      hand,
      finger: "thumb",
      x,
      y: 3,
      row,
      col,
      home,
      inner: false,
      bar: barByColumn[col] ?? 4,
    });
  }

  return { id, keys, width: 13, height: 4 };
}

export const shapes: Record<ShapeId, Shape> = {
  split40: buildShape("split40", true),
  split34: buildShape("split34", false),
};

export function isShapeId(value: string): value is ShapeId {
  return (shapeIds as readonly string[]).includes(value);
}
