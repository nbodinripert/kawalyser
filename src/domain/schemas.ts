import { z } from "zod";
import { shapeIds } from "./geometry";
import { analysisLevels, replacementsSchema } from "./replacements";
import { corpusLanguages } from "./valid-chars";

const zoneChar = z.string().min(1).max(8).optional();

export const layoutSchema = z.object({
  name: z.string().max(200),
  shapeId: z.enum(shapeIds),
  keys: z.record(
    z.string().max(8),
    z.object({ base: zoneChar, shift: zoneChar, dk: zoneChar, dkShift: zoneChar }),
  ),
});

export const analysisRequestSchema = z.object({
  layout: layoutSchema,
  replacements: replacementsSchema,
  level: z.enum(analysisLevels),
  language: z.enum(corpusLanguages),
});

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
