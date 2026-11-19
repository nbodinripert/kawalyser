import { z } from "zod";
import type { CorpusLanguage } from "./corpora";
import { findBlockingDuplicates } from "./duplicates";
import { thumbKeyIds } from "./geometry";
import { importKalamine } from "./kalamine";
import { completeLayoutPairs, type KeyChars, type Layout } from "./layout";
import { emptyReplacements, parseReplacements, type Replacements } from "./replacements";
import { SPACE } from "./symbols";

/**
 * The layouts the site provides, listed in layouts/layouts.json (v2 specs). Kawamashi adds one with a pull request:
 * the .toml file, its replacements if any, and an entry in the list. These functions read what the server loads.
 */

/** The names layouts.json gives the thumb keys. The home key of each thumb is the outer one (question 36 of the specs). */
export const presetThumbKeys = {
  leftHome: thumbKeyIds.leftOuter,
  leftSecondary: thumbKeyIds.leftInner,
  rightSecondary: thumbKeyIds.rightInner,
  rightHome: thumbKeyIds.rightOuter,
} as const;

const corpusIds = { french: "fr", english: "en" } as const satisfies Record<string, CorpusLanguage>;

const oneCharacter = z.string().refine((value) => Array.from(value).length === 1, "must be a single character");
const fileName = (extension: "toml" | "json") =>
  z.string().regex(new RegExp(`^[\\w.-]+\\.${extension}$`), `must be a file name of the layouts folder, ending in .${extension}`);

const presetEntrySchema = z.strictObject({
  name: z.string().min(1).max(100),
  toml: fileName("toml"),
  replacements: fileName("json").optional(),
  corpus: z.enum(["french", "english"]).optional(),
  thumbs: z
    .strictObject({
      leftHome: oneCharacter.optional(),
      leftSecondary: oneCharacter.optional(),
      rightSecondary: oneCharacter.optional(),
      rightHome: oneCharacter.optional(),
    })
    .default({}),
});

export type PresetEntry = z.infer<typeof presetEntrySchema>;

/** A layout ready for the map: what the browser receives. */
export type Preset = {
  /** The .toml file name without its extension: unique in the folder. */
  id: string;
  name: string;
  layout: Layout;
  replacements: Replacements;
  replacementsName: string | null;
  /** The corpus to select with the layout (field "corpus"); null keeps the current one. */
  corpus: CorpusLanguage | null;
};

/** A problem in the folder, written for a contributor: it names the file and the field to fix. */
export type PresetResult<T> = { ok: true; value: T } | { ok: false; problem: string };

export const presetListFile = "layouts.json";

export function parsePresetList(source: string): PresetResult<PresetEntry[]> {
  let json: unknown;
  try {
    json = JSON.parse(source);
  } catch (error) {
    return { ok: false, problem: `${presetListFile} is not valid JSON: ${error instanceof Error ? error.message : String(error)}` };
  }
  const parsed = z.array(presetEntrySchema).min(1).safeParse(json);
  if (!parsed.success) {
    // Entries counted from 1, with their name, as a contributor reads the file.
    const issues = parsed.error.issues.map((issue) => {
      const [index, ...field] = issue.path;
      if (typeof index !== "number") return issue.message;
      const name = (json as Array<{ name?: unknown }>)[index]?.name;
      const entry = `entry ${index + 1}${typeof name === "string" ? ` (${name})` : ""}`;
      return `${entry}${field.length > 0 ? `, ${field.join(".")}` : ""}: ${issue.message}`;
    });
    return { ok: false, problem: `${presetListFile}: ${issues.join("; ")}` };
  }
  const seen = new Set<string>();
  for (const entry of parsed.data) {
    if (seen.has(entry.toml)) return { ok: false, problem: `${presetListFile}: "${entry.toml}" is listed twice` };
    seen.add(entry.toml);
  }
  return { ok: true, value: parsed.data };
}

/**
 * What a thumb key of layouts.json holds. One character is enough: the base or Shift character of the key the .toml
 * draws at the far left of the bottom row brings that whole key, Shift and dead key layer included ("E" gives E, ê
 * and Ê on Propergol). Space brings the space key with its dead key character from [spacebar]. Any other character,
 * Magic, Repeat or the dead key for instance, sits alone in the base zone.
 */
function thumbKey(char: string, fromToml: KeyChars | undefined, space: KeyChars | undefined): KeyChars {
  if (char === SPACE) return space ?? { base: SPACE };
  if (fromToml && (char === fromToml.base || char === fromToml.shift || char.toLowerCase() === fromToml.base)) return fromToml;
  return { base: char };
}

export function buildPreset(entry: PresetEntry, tomlSource: string, replacementsSource: string | null): PresetResult<Preset> {
  const imported = importKalamine(tomlSource, "split40");
  if (!imported.ok) {
    const detail = imported.problem.kind === "unreadable" ? imported.problem.detail : imported.problem.kind;
    return { ok: false, problem: `${entry.toml} could not be read: ${detail}` };
  }

  const duplicates = findBlockingDuplicates(imported.layout);
  if (duplicates.length > 0) {
    const chars = [...new Set(duplicates.map((duplicate) => duplicate.char))].join(" ");
    return { ok: false, problem: `${entry.toml}: ${chars} appear on several keys of the main pad` };
  }

  // Every thumb key comes from the list, even the one the .toml fills: its character may belong on another thumb.
  const keys = { ...imported.layout.keys };
  const fromToml = keys[thumbKeyIds.leftOuter];
  const space = keys[thumbKeyIds.rightOuter];
  for (const id of Object.values(thumbKeyIds)) delete keys[id];
  for (const [name, char] of Object.entries(entry.thumbs)) {
    if (char !== undefined) keys[presetThumbKeys[name as keyof typeof presetThumbKeys]] = thumbKey(char, fromToml, space);
  }

  let replacements = emptyReplacements;
  if (entry.replacements !== undefined) {
    if (replacementsSource === null) return { ok: false, problem: `${entry.replacements} is missing from the layouts folder` };
    const parsed = parseReplacements(replacementsSource);
    if (!parsed.ok) return { ok: false, problem: `${entry.replacements}: ${parsed.detail}` };
    replacements = parsed.replacements;
  }

  return {
    ok: true,
    value: {
      id: entry.toml.replace(/\.toml$/, ""),
      name: entry.name,
      layout: completeLayoutPairs({ name: entry.name, shapeId: "split40", keys }),
      replacements,
      replacementsName: entry.replacements ?? null,
      corpus: entry.corpus === undefined ? null : corpusIds[entry.corpus],
    },
  };
}
