import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import { buildPreset, parsePresetList, presetListFile, type Preset } from "@/domain/presets";

/**
 * Reads the layouts folder. Cached for as long as possible: the page is prerendered with them, and they only change
 * with a new deployment. next.config.ts ships the folder with the server, should the page be rendered again.
 * A broken file fails the build, with the message of src/domain/presets.test.ts.
 */
export async function loadPresets(): Promise<Preset[]> {
  "use cache";
  cacheLife("max");

  const folder = join(/*turbopackIgnore: true*/ process.cwd(), "layouts");
  const read = (file: string) => readFile(/*turbopackIgnore: true*/ join(folder, file), "utf8");

  const list = parsePresetList(await read(presetListFile));
  if (!list.ok) throw new Error(list.problem);

  return Promise.all(
    list.value.map(async (entry) => {
      const built = buildPreset(entry, await read(entry.toml), entry.replacements ? await read(entry.replacements).catch(() => null) : null);
      if (!built.ok) throw new Error(built.problem);
      return built.value;
    }),
  );
}
