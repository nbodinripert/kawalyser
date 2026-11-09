import { z } from "zod";
import { analysisRequestSchema } from "@/domain/schemas";
import { difficultiesCsv, ngramsCsv } from "@/engine/export";
import { locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { runAnalysis } from "@/server/analysis";

export const maxDuration = 60;

const exportRequestSchema = z.object({
  kind: z.enum(["ngrams", "difficulties"]),
  locale: z.enum(locales),
  analysis: analysisRequestSchema,
});

export async function POST(request: Request) {
  const parsed = exportRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid-request" }, { status: 400 });
  }

  const { kind, locale, analysis } = parsed.data;
  try {
    const [detail, dictionary] = await Promise.all([runAnalysis(analysis), getDictionary(locale)]);
    // French spreadsheets expect semicolons, since the comma is their decimal separator.
    const separator: "," | ";" = locale === "fr" ? ";" : ",";
    const options = { separator, headers: dictionary.csv };
    const csv = kind === "ngrams" ? ngramsCsv(detail, options) : difficultiesCsv(detail, options);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kawalyser-${kind}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export failed", error);
    return Response.json({ error: "export-failed" }, { status: 500 });
  }
}
