import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { localePath, repositoryUrl } from "@/lib/site";
import { cx, pageWidth } from "./ui";

type SiteFooterProps = { lang: Locale; dictionary: Dictionary };

const linkClass = "underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Links only: the credits and the explanations live in the docs. */
export function SiteFooter({ lang, dictionary }: SiteFooterProps) {
  const labels = dictionary.footer;
  return (
    <footer className="border-t border-border">
      <div className={cx(pageWidth, "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5 text-xs text-muted")}>
        <p>{dictionary.meta.title}</p>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <li>
            <Link href={localePath(lang, "docs")} className={linkClass}>
              {labels.docs}
            </Link>
          </li>
          <li>
            <a href={repositoryUrl} className={linkClass}>
              {labels.source}
            </a>
          </li>
          <li>
            <a href={`${repositoryUrl}/blob/main/LICENSE`} className={linkClass}>
              {labels.license}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
