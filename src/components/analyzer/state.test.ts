import { describe, expect, it } from "vitest";
import type { Layout } from "@/domain/layout";
import type { AnalysisResult } from "@/engine/analyse";
import { initialState, reducer } from "./state";

const first: Layout = { name: "a", shapeId: "split40", keys: { k: { base: "a" } } };
const second: Layout = { ...first, keys: { k: { base: "b" } } };
const result = { keyPresses: {} } as unknown as AnalysisResult;

describe("reducer", () => {
  it("clears the statistics as soon as the layout changes", () => {
    const analysed = reducer(initialState(first), { type: "analysisSucceeded", result });
    const edited = reducer(analysed, { type: "edit", layout: second });
    expect(edited.result).toBeNull();
    expect(edited.cleared).toBe(true);
  });

  it("undoes, redoes and resets edits", () => {
    let state = reducer(initialState(first), { type: "edit", layout: second });
    state = reducer(state, { type: "undo" });
    expect(state.layout).toBe(first);
    state = reducer(state, { type: "redo" });
    expect(state.layout).toBe(second);
    state = reducer(state, { type: "reset" });
    expect(state.layout).toBe(first);
  });

  it("keeps the session untouched until it has been restored", () => {
    const state = initialState(first);
    expect(state.hydrated).toBe(false);
    expect(reducer(state, { type: "restore", saved: null }).hydrated).toBe(true);
  });
});
