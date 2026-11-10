import { describe, expect, it } from "vitest";
import { hasOuterColumns } from "./geometry";

describe("hasOuterColumns", () => {
  it("is true for the 40-key shape only", () => {
    expect(hasOuterColumns("split40")).toBe(true);
    expect(hasOuterColumns("split34")).toBe(false);
  });
});
