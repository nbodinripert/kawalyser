import { defaultLocale, locales, type Locale } from "@/i18n/config";

/**
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL on every deployment, previews included, to the production domain
 * (the custom domain once there is one). Canonical links and the sitemap therefore always name production,
 * so search engines never index a preview URL.
 */
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const siteUrl = new URL(productionHost ? `https://${productionHost}` : "http://localhost:3000");

export const siteName = "Kawalyser";

export function localePath(locale: Locale): `/${Locale}` {
  return `/${locale}`;
}

/** hreflang links: every language, plus x-default for visitors whose language is not offered. */
export function languageAlternates(): Record<string, string> {
  const languages: Record<string, string> = Object.fromEntries(locales.map((locale) => [locale, localePath(locale)]));
  // The root only redirects, so x-default points straight at the page it lands on.
  languages["x-default"] = localePath(defaultLocale);
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
