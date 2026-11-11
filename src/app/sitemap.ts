import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { absoluteUrl, languageAlternates, localePath } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    Object.entries(languageAlternates()).map(([language, path]) => [language, absoluteUrl(path)]),
  );

  // No lastModified: Google ignores it unless it is accurate, and the build date would not be.
  return locales.map((locale) => ({
    url: absoluteUrl(localePath(locale)),
    alternates: { languages },
  }));
}
