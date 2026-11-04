import { notFound } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dictionary = await getDictionary(lang);

  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="font-semibold tracking-tight">{dictionary.meta.title}</span>
        <div className="flex items-center gap-3">
          <LanguageSwitcher current={lang} label={dictionary.languageSwitcher.label} />
          <ThemeToggle labels={dictionary.themeToggle} />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">{dictionary.meta.title}</h1>
        <p className="text-lg text-muted">{dictionary.home.tagline}</p>
        <p className="w-fit rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">
          {dictionary.home.status}
        </p>
      </main>
    </>
  );
}
