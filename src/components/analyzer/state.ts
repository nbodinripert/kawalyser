import type { ShapeId } from "@/domain/geometry";
import type { Layout } from "@/domain/layout";
import { emptyReplacements, type AnalysisLevel, type Replacements } from "@/domain/replacements";
import type { CorpusLanguage } from "@/domain/valid-chars";
import type { AnalysisResult } from "@/engine/analyse";

export type Notice = { tone: "info" | "error"; text: string };

export type AnalyzerState = {
  layout: Layout;
  /** The layout as last imported, for the reset button. */
  imported: Layout;
  past: Layout[];
  future: Layout[];
  replacements: Replacements;
  replacementsName: string | null;
  level: AnalysisLevel;
  language: CorpusLanguage;
  result: AnalysisResult | null;
  status: "idle" | "running" | "failed";
  /** True when an edit has just wiped the statistics, to explain why they disappeared. */
  cleared: boolean;
  notice: Notice | null;
  /** False until the saved session has been read, so that nothing overwrites it before. */
  hydrated: boolean;
};

export type Action =
  | { type: "edit"; layout: Layout }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset" }
  | { type: "importLayout"; layout: Layout; notice: Notice }
  | { type: "setReplacements"; replacements: Replacements; name: string | null; notice: Notice | null }
  | { type: "setLevel"; level: AnalysisLevel }
  | { type: "setLanguage"; language: CorpusLanguage }
  | { type: "setShape"; shapeId: ShapeId }
  | { type: "restore"; saved: SavedState | null }
  | { type: "notice"; notice: Notice | null }
  | { type: "analysisStarted" }
  | { type: "analysisSucceeded"; result: AnalysisResult }
  | { type: "analysisFailed" };

const HISTORY_LIMIT = 100;

export function initialState(layout: Layout): AnalyzerState {
  return {
    layout,
    imported: layout,
    past: [],
    future: [],
    replacements: emptyReplacements,
    replacementsName: null,
    level: "clever",
    language: "en",
    result: null,
    status: "idle",
    cleared: false,
    notice: null,
    hydrated: false,
  };
}

/** Anything that changes what would be analysed wipes the statistics. */
function invalidate(state: AnalyzerState): Pick<AnalyzerState, "result" | "cleared" | "status"> {
  return { result: null, cleared: state.result !== null, status: "idle" };
}

export function reducer(state: AnalyzerState, action: Action): AnalyzerState {
  switch (action.type) {
    case "edit":
      if (action.layout === state.layout) return state;
      return {
        ...state,
        ...invalidate(state),
        layout: action.layout,
        past: [...state.past, state.layout].slice(-HISTORY_LIMIT),
        future: [],
        notice: null,
      };
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return { ...state, ...invalidate(state), layout: previous, past: state.past.slice(0, -1), future: [state.layout, ...state.future] };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return { ...state, ...invalidate(state), layout: next, past: [...state.past, state.layout], future: state.future.slice(1) };
    }
    case "reset":
      if (state.layout === state.imported) return state;
      return { ...state, ...invalidate(state), layout: state.imported, past: [...state.past, state.layout], future: [] };
    case "importLayout":
      return {
        ...state,
        ...invalidate(state),
        layout: action.layout,
        imported: action.layout,
        past: [],
        future: [],
        notice: action.notice,
      };
    case "setReplacements":
      return { ...state, ...invalidate(state), replacements: action.replacements, replacementsName: action.name, notice: action.notice };
    case "setLevel":
      return { ...state, ...invalidate(state), level: action.level };
    case "setLanguage":
      return { ...state, ...invalidate(state), language: action.language };
    case "setShape":
      return {
        ...state,
        ...invalidate(state),
        layout: { ...state.layout, shapeId: action.shapeId },
        imported: { ...state.imported, shapeId: action.shapeId },
      };
    case "restore":
      if (!action.saved) return { ...state, hydrated: true };
      return { ...state, ...action.saved, past: [], future: [], result: null, status: "idle", cleared: false, notice: null, hydrated: true };
    case "notice":
      return { ...state, notice: action.notice };
    case "analysisStarted":
      return { ...state, status: "running", cleared: false };
    case "analysisSucceeded":
      return { ...state, status: "idle", result: action.result };
    case "analysisFailed":
      return { ...state, status: "failed" };
  }
}

export type SavedState = Pick<AnalyzerState, "layout" | "imported" | "replacements" | "replacementsName" | "level" | "language">;

export const storageKey = "kawalyser-state-v1";

export function toSaved(state: AnalyzerState): SavedState {
  const { layout, imported, replacements, replacementsName, level, language } = state;
  return { layout, imported, replacements, replacementsName, level, language };
}
