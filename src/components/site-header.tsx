import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { localePath, sitePages, type SitePage } from "@/lib/site";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { cx, pageWidth } from "./ui";

type SiteHeaderProps = { lang: Locale; dictionary: Dictionary; current: SitePage };

/** The bar on top of every page: the site name, the menu between the analyzer and the docs, language and theme. */
export function SiteHeader({ lang, dictionary, current }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className={cx(pageWidth, "flex items-center justify-between gap-4 py-3")}>
        <Link
          href={localePath(lang)}
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {/* Same file as the browser tab icon, so the two never drift apart. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- a small static SVG gains nothing from next/image */}
          <img src="/icon.svg" alt="" aria-hidden className="size-8 shrink-0" />
          <span className="min-w-0">
            {/* On a phone, the menu needs the room: the name stays for screen readers, the logo for the eye. */}
            <span className="sr-only text-sm font-semibold tracking-tight sm:not-sr-only sm:block">{dictionary.meta.title}</span>
            <span className="hidden text-xs text-muted xl:block">{dictionary.home.tagline}</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <nav aria-label={dictionary.nav.label}>
            <ul className="flex items-center gap-1 text-sm">
              {sitePages.map((page) => (
                <li key={page}>
                  <Link
                    href={localePath(lang, page)}
                    aria-current={page === current ? "page" : undefined}
                    className="rounded-md px-2 py-1 font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent aria-[current=page]:bg-accent-soft aria-[current=page]:text-foreground"
                  >
                    {dictionary.nav[page]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <span aria-hidden className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <LanguageSwitcher current={lang} label={dictionary.languageSwitcher.label} />
          <ThemeToggle labels={dictionary.themeToggle} />
        </div>
      </div>
    </header>
  );
}
