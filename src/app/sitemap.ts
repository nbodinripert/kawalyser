import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { absoluteUrl, languageAlternates, localePath, sitePages } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // No lastModified: Google ignores it unless it is accurate, and the build date would not be.
  return sitePages.flatMap((page) => {
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(page)).map(([language, path]) => [language, absoluteUrl(path)]),
    );
    return locales.map((locale) => ({ url: absoluteUrl(localePath(locale, page)), alternates: { languages } }));
  });
}
