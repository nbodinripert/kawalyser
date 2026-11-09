import { z } from "zod";

const charList = z.union([z.string(), z.array(z.string())]).transform((value) =>
  typeof value === "string" ? Array.from(value) : value,
);

const correction = z.object({
  text: z.string().min(1),
  keys: z.string(),
});

const optionalCorrection = correction.extend({
  noLetterBefore: z.boolean().optional(),
  noLetterAfter: z.boolean().optional(),
  allowedBefore: charList.optional(),
  allowedAfter: charList.optional(),
});

const replacementsObject = z.object({
  essentialCorrections: z.array(correction).default([]),
  optionalCorrections: z.array(optionalCorrection).default([]),
});

export const replacementsSchema = replacementsObject;

export type Correction = z.infer<typeof correction>;
export type OptionalCorrection = z.infer<typeof optionalCorrection>;
export type Replacements = z.output<typeof replacementsObject>;

export const emptyReplacements: Replacements = { essentialCorrections: [], optionalCorrections: [] };

export type ParsedReplacements = { ok: true; replacements: Replacements } | { ok: false; detail: string };

export function parseReplacements(source: string): ParsedReplacements {
  let json: unknown;
  try {
    json = JSON.parse(source);
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
  const result = replacementsSchema.safeParse(json);
  if (!result.success) {
    return { ok: false, detail: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
  }
  return { ok: true, replacements: result.data };
}

export const analysisLevels = ["raw", "corrections", "clever"] as const;
export type AnalysisLevel = (typeof analysisLevels)[number];
