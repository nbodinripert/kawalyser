import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Analyzer } from "@/components/analyzer/analyzer";
import { JsonLd } from "@/components/json-ld";
import { richText } from "@/components/rich-text";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { hasLocale, locales } from "@/i18n/config";
import { analyzerSections, getDictionary, type AnalyzerDictionary } from "@/i18n/dictionaries";
import { absoluteUrl, languageAlternates, localePath, openGraphLocale, siteName } from "@/lib/site";
import { loadPresets } from "@/server/presets";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};

  const { meta } = await getDictionary(lang);
  const path = localePath(lang);

  return {
    title: meta.pageTitle,
    description: meta.description,
    alternates: { canonical: path, languages: languageAlternates() },
    openGraph: {
      type: "website",
      siteName,
      title: meta.pageTitle,
      description: meta.description,
      url: path,
      locale: openGraphLocale[lang],
      alternateLocale: locales.filter((locale) => locale !== lang).map((locale) => openGraphLocale[locale]),
    },
    twitter: { card: "summary_large_image", title: meta.pageTitle, description: meta.description },
  };
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const [dictionary, presets] = await Promise.all([getDictionary(lang), loadPresets()]);
  const [initialPreset] = presets;
  if (!initialPreset) throw new Error("layouts/layouts.json lists no layout");
  const analyzerDictionary = Object.fromEntries(analyzerSections.map((section) => [section, dictionary[section]])) as AnalyzerDictionary;

  // No rating or download count: Google wants real ones, and the site has none.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteName,
    url: absoluteUrl(localePath(lang)),
    description: dictionary.meta.description,
    inLanguage: lang,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    featureList: Object.values(dictionary.docs.features.items).map((feature) => feature.title),
    license: "https://www.gnu.org/licenses/gpl-3.0.html",
    isBasedOn: "https://github.com/Kawamashi/Kawalyser",
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <SiteHeader lang={lang} dictionary={dictionary} current="analyzer" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="sr-only">{dictionary.home.heading}</h1>
        {/* Says in plain words what the tool does, for visitors and for search engines, which find little text in the analyzer itself. */}
        <p className="mb-5 max-w-3xl text-sm text-muted">
          {richText(dictionary.home.intro, {
            docs: (
              <Link href={localePath(lang, "docs")} className="font-medium text-accent underline underline-offset-2 hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                {dictionary.home.docsLink}
              </Link>
            ),
          })}
        </p>
        <Analyzer dictionary={analyzerDictionary} locale={lang} presets={presets} initialPreset={initialPreset} />
      </main>

      <SiteFooter lang={lang} dictionary={dictionary} />
    </>
  );
}
