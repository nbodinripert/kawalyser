import { analysisRequestSchema } from "@/domain/schemas";
import { runAnalysis } from "@/server/analysis";

export const maxDuration = 60;

export async function POST(request: Request) {
  const parsed = analysisRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid-request" }, { status: 400 });
  }

  try {
    const detail = await runAnalysis(parsed.data);
    return Response.json(detail.result);
  } catch (error) {
    console.error("Analysis failed", error);
    return Response.json({ error: "analysis-failed" }, { status: 500 });
  }
}
