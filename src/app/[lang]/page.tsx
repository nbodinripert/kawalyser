import { notFound } from "next/navigation";
import { Analyzer } from "@/components/analyzer/analyzer";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { defaultLayoutToml } from "@/domain/default-layout";
import { importKalamine } from "@/domain/kalamine";
import { emptyLayout } from "@/domain/layout";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

const defaultImport = importKalamine(defaultLayoutToml, "split40");
const defaultLayout = defaultImport.ok ? defaultImport.layout : emptyLayout("split40");

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dictionary = await getDictionary(lang);

  return (
    <>
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
        <h1 className="sr-only">{dictionary.meta.title}</h1>
        <Analyzer dictionary={dictionary} locale={lang} defaultLayout={defaultLayout} />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">{dictionary.footer.credits}</div>
      </footer>
    </>
  );
}
