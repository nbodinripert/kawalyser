import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Docs } from "@/components/docs/docs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { languageAlternates, localePath, openGraphLocale, siteName } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/docs">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};

  const { docs } = await getDictionary(lang);
  const path = localePath(lang, "docs");

  return {
    title: docs.pageTitle,
    description: docs.description,
    alternates: { canonical: path, languages: languageAlternates("docs") },
    openGraph: {
      type: "article",
      siteName,
      title: docs.pageTitle,
      description: docs.description,
      url: path,
      locale: openGraphLocale[lang],
      alternateLocale: locales.filter((locale) => locale !== lang).map((locale) => openGraphLocale[locale]),
    },
    twitter: { card: "summary_large_image", title: docs.pageTitle, description: docs.description },
  };
}

export default async function DocsPage({ params }: PageProps<"/[lang]/docs">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dictionary = await getDictionary(lang);

  return (
    <>
      <SiteHeader lang={lang} dictionary={dictionary} current="docs" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Docs lang={lang} dictionary={dictionary} />
      </main>
      <SiteFooter lang={lang} dictionary={dictionary} />
    </>
  );
}
