"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeCookie, locales, type Locale } from "@/i18n/config";

type LanguageSwitcherProps = {
  current: Locale;
  label: string;
};

const oneYearInSeconds = 60 * 60 * 24 * 365;

function rememberLocale(locale: Locale) {
  document.cookie = `${localeCookie}=${locale}; path=/; max-age=${oneYearInSeconds}; SameSite=Lax`;
}

export function LanguageSwitcher({ current, label }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const pathWithoutLocale = pathname.replace(/^\/[^/]+/, "");

  return (
    <nav aria-label={label} className="flex items-center gap-1 text-sm">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}${pathWithoutLocale}`}
          hrefLang={locale}
          aria-current={locale === current ? "true" : undefined}
          onClick={() => rememberLocale(locale)}
          className="rounded-md px-2 py-1 uppercase text-muted transition-colors hover:text-foreground aria-[current]:font-semibold aria-[current]:text-foreground"
        >
          {locale}
        </Link>
      ))}
    </nav>
  );
}
