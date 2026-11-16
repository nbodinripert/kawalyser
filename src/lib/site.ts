import { defaultLocale, locales, type Locale } from "@/i18n/config";

/**
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL on every deployment, previews included, to the production domain
 * (the custom domain once there is one). Canonical links and the sitemap therefore always name production,
 * so search engines never index a preview URL.
 */
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const siteUrl = new URL(productionHost ? `https://${productionHost}` : "http://localhost:3000");

export const siteName = "Kawalyser";

/** Public repository of the site's code (the corpora live in a separate private repository). */
export const repositoryUrl = "https://github.com/nbodinripert/kawalyser";

/** The site's pages, each one in every language: the analyzer at the root of a language, then the docs. */
export const sitePages = ["analyzer", "docs"] as const;
export type SitePage = (typeof sitePages)[number];

export function localePath(locale: Locale, page: SitePage = "analyzer"): string {
  return page === "analyzer" ? `/${locale}` : `/${locale}/${page}`;
}

/** hreflang links: every language, plus x-default for visitors whose language is not offered. */
export function languageAlternates(page: SitePage = "analyzer"): Record<string, string> {
  const languages: Record<string, string> = Object.fromEntries(locales.map((locale) => [locale, localePath(locale, page)]));
  // The root only redirects, so x-default points straight at the page it lands on.
  languages["x-default"] = localePath(defaultLocale, page);
  return languages;
}

/** Open Graph wants a language and a territory. */
export const openGraphLocale: Record<Locale, string> = {
  en: "en_US",
  fr: "fr_FR",
};

/** Absolute URL, for places that do not go through metadataBase (sitemap, robots, JSON-LD). */
export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}
