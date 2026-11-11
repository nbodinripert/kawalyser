import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { About } from "@/components/about";
import { Analyzer } from "@/components/analyzer/analyzer";
import { JsonLd } from "@/components/json-ld";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { defaultLayoutToml } from "@/domain/default-layout";
import { importKalamine } from "@/domain/kalamine";
import { emptyLayout } from "@/domain/layout";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { absoluteUrl, languageAlternates, localePath, openGraphLocale, siteName } from "@/lib/site";

const defaultImport = importKalamine(defaultLayoutToml, "split40");
const defaultLayout = defaultImport.ok ? defaultImport.layout : emptyLayout("split40");

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

  const dictionary = await getDictionary(lang);

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
    featureList: dictionary.about.features,
    license: "https://www.gnu.org/licenses/gpl-3.0.html",
    isBasedOn: "https://github.com/Kawamashi/Kawalyser",
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Same file as the browser tab icon, so the two never drift apart. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- a small static SVG gains nothing from next/image */}
            <img src="/icon.svg" alt="" aria-hidden className="size-8 shrink-0" />
            <div>
              <p className="text-sm font-semibold tracking-tight">{dictionary.meta.title}</p>
              <p className="hidden text-xs text-muted sm:block">{dictionary.home.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher current={lang} label={dictionary.languageSwitcher.label} />
            <ThemeToggle labels={dictionary.themeToggle} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="sr-only">{dictionary.home.heading}</h1>
        <Analyzer dictionary={dictionary} locale={lang} defaultLayout={defaultLayout} />
        <About labels={dictionary.about} />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">{dictionary.footer.credits}</div>
      </footer>
    </>
  );
}
