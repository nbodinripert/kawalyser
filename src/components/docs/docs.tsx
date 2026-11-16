import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { localePath, repositoryUrl } from "@/lib/site";
import {
  ArrowRightIcon,
  ChartIcon,
  CheckIcon,
  CodeIcon,
  DownloadIcon,
  FileTextIcon,
  KeyboardIcon,
  MoveIcon,
  SplitKeyboardIcon,
  UploadIcon,
  WandIcon,
} from "../icons";
import { cx } from "../ui";
import { MiniBoard, type Press } from "./mini-board";
import { richText } from "../rich-text";

type DocsProps = { lang: Locale; dictionary: Dictionary };
type Labels = Dictionary["docs"];

const sectionIds = ["purpose", "features", "start", "keys", "metrics", "files", "privacy", "faq", "source"] as const;
type SectionId = (typeof sectionIds)[number];

const featureIcons: Record<keyof Labels["features"]["items"], ReactNode> = {
  presets: <KeyboardIcon size={20} />,
  toml: <UploadIcon size={20} />,
  edit: <MoveIcon size={20} />,
  replacements: <WandIcon size={20} />,
  corpus: <FileTextIcon size={20} />,
  analyze: <ChartIcon size={20} />,
  download: <DownloadIcon size={20} />,
  shapes: <SplitKeyboardIcon size={20} />,
};

/** What each special key shows on its keycap: the map symbol, or two keys for the Clever Keys. */
const keycaps: Record<keyof Labels["keys"]["items"], string[]> = {
  dead: ["*"],
  repeat: ["$"],
  magic: ["#"],
  clever: ["q", "n"],
};

/**
 * One example of each bigram difficulty, checked against the rules of src/engine/metrics.ts:
 * columns from the pinky (0) to the inner index (4), rows from the top (0).
 */
const bigramExamples: Record<keyof Labels["metrics"]["bigrams"], Press[]> = {
  sfb: [
    { row: 0, col: 3, label: "1" },
    { row: 2, col: 3, label: "2" },
  ],
  skb: [{ row: 1, col: 2, label: "1 2" }],
  lsb: [
    { row: 1, col: 2, label: "1" },
    { row: 1, col: 4, label: "2" },
  ],
  fsb: [
    { row: 0, col: 1, label: "1" },
    { row: 2, col: 2, label: "2" },
  ],
  hsb: [
    { row: 1, col: 1, label: "1" },
    { row: 2, col: 2, label: "2" },
  ],
  rjb: [
    { row: 0, col: 2, label: "1" },
    { row: 2, col: 3, label: "2" },
  ],
};

/** A sample of the replacements format: code, the same in every language. */
const replacementsSample = `{
  "essentialCorrections": [{ "text": "qu", "keys": "q" }],
  "optionalCorrections": [
    { "text": "ment", "keys": "m#", "noLetterAfter": true, "allowedAfter": ["s"] }
  ]
}`;

const linkClass = "font-medium text-accent underline underline-offset-2 hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={linkClass}>
      {children}
    </a>
  );
}

export function Docs({ lang, dictionary }: DocsProps) {
  const labels = dictionary.docs;
  const links = labels.source.links;
  const fr = lang === "fr";
  const urls = {
    github: repositoryUrl,
    guide: `${repositoryUrl}/blob/main/${fr ? "CONTRIBUTING.fr.md" : "CONTRIBUTING.md"}`,
    issue: `${repositoryUrl}/issues`,
    readme: fr ? `${repositoryUrl}/blob/main/README.fr.md#fidélité-à-lexcel` : `${repositoryUrl}#faithfulness-to-the-excel-analyzer`,
    excel: "https://github.com/Kawamashi/Kawalyser",
    propergol: "https://github.com/Kawamashi/Propergol",
    ergol: "https://github.com/Nuclear-Squid/ergol",
    erglace: "https://github.com/Lysquid/Erglace",
    kalamine: "https://github.com/OneDeadKey/kalamine",
  } satisfies Record<keyof typeof links, string>;
  const link = (name: keyof typeof links) => <ExternalLink href={urls[name]}>{links[name]}</ExternalLink>;

  const titles: Record<SectionId, string> = {
    purpose: labels.purpose.title,
    features: labels.features.title,
    start: labels.start.title,
    keys: labels.keys.title,
    metrics: labels.metrics.title,
    files: labels.files.title,
    privacy: labels.privacy.title,
    faq: labels.faq.title,
    source: labels.source.title,
  };

  return (
    <>
      <Hero lang={lang} labels={labels.hero} />

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label={labels.tocLabel} className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-xs font-semibold tracking-wide text-faint uppercase">{labels.tocLabel}</p>
          <ol className="flex flex-wrap gap-2 text-sm lg:flex-col lg:gap-0.5">
            {sectionIds.map((id) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="block rounded-md border border-border px-2.5 py-1 text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent lg:border-transparent lg:px-2"
                >
                  {titles[id]}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid min-w-0 grid-cols-1 gap-16">
          <Section id="purpose" title={titles.purpose} intro={labels.purpose.intro}>
            <ul className="grid gap-4 md:grid-cols-3">
              {labels.purpose.items.map((item) => (
                <li key={item.problem} className="flex flex-col rounded-2xl border border-border bg-surface p-5">
                  <p className="text-xs font-semibold tracking-wide text-faint uppercase">{labels.purpose.problemLabel}</p>
                  <p className="mt-1.5 text-sm">{item.problem}</p>
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-xs font-semibold tracking-wide text-accent uppercase">{labels.purpose.answerLabel}</p>
                    <p className="mt-1.5 text-sm font-medium">{item.answer}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="features" title={titles.features}>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(labels.features.items).map(([key, item]) => (
                <li key={key} className="rounded-2xl border border-border bg-surface p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    {featureIcons[key as keyof typeof featureIcons]}
                  </span>
                  <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted">{item.text}</p>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="start" title={titles.start}>
            <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {labels.start.steps.map((step, index) => (
                <li key={step.title} className="relative rounded-2xl border border-border bg-surface p-5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-contrast">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
            <Link
              href={localePath(lang)}
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {labels.hero.open}
              <ArrowRightIcon />
            </Link>
          </Section>

          <Section id="keys" title={titles.keys} intro={labels.keys.intro}>
            <ul className="grid gap-4 sm:grid-cols-2">
              {Object.entries(labels.keys.items).map(([key, item]) => (
                <li key={key} className="flex gap-4 rounded-2xl border border-border bg-surface p-5">
                  <span aria-hidden className="flex shrink-0 gap-1">
                    {keycaps[key as keyof typeof keycaps].map((cap) => (
                      <span key={cap} className="flex size-11 items-center justify-center rounded-lg border border-key-border bg-key font-mono text-lg font-semibold shadow-[0_2px_0_var(--key-border)]">
                        {cap}
                      </span>
                    ))}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{item.name}</h3>
                    <p className="mt-1 text-sm text-muted">{item.text}</p>
                    <p className="mt-2 inline-block rounded-md bg-surface-muted px-2 py-1 font-mono text-xs">{item.example}</p>
                  </div>
                </li>
              ))}
            </ul>

            <h3 className="mt-10 text-base font-semibold">{labels.keys.levelsTitle}</h3>
            <p className="mt-1 max-w-3xl text-sm text-muted">{labels.keys.levelsIntro}</p>
            <ol className="mt-4 grid gap-3 md:grid-cols-3">
              {(Object.keys(labels.keys.levels) as Array<keyof Labels["keys"]["levels"]>).map((level, index) => (
                <li key={level} className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-center gap-2">
                    {/* The levels add up: each bar adds to the one before. */}
                    <span aria-hidden className="flex gap-0.5">
                      {[0, 1, 2].map((bar) => (
                        <span key={bar} className={cx("h-3 w-1.5 rounded-sm", bar <= index ? "bg-accent" : "bg-key-border")} />
                      ))}
                    </span>
                    <span className="text-sm font-semibold">{dictionary.layout.levels[level]}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{labels.keys.levels[level]}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="metrics" title={titles.metrics} intro={labels.metrics.intro}>
            <h3 className="text-base font-semibold">{labels.metrics.bigramsTitle}</h3>
            <p className="mt-1 max-w-3xl text-sm text-muted">{labels.metrics.bigramsIntro}</p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(labels.metrics.bigrams).map(([key, item]) => (
                <li key={key} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
                  <MiniBoard presses={bigramExamples[key as keyof typeof bigramExamples]} fingers={labels.metrics.fingers} label={`${item.name}. ${item.text}`} />
                  <div>
                    <h4 className="text-sm font-semibold">{item.name}</h4>
                    <p className="mt-1 text-sm text-muted">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <h3 className="mt-10 text-base font-semibold">{labels.metrics.othersTitle}</h3>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      {labels.metrics.nameHeader}
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      {labels.metrics.textHeader}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(labels.metrics.others).map(([key, item]) => (
                    <tr key={key} className="border-t border-border align-top">
                      <th scope="row" className="w-2/5 px-4 py-3 text-left font-medium">
                        {item.name}
                      </th>
                      <td className="px-4 py-3 text-muted">{item.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="files" title={titles.files}>
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <FileCard title={labels.files.toml.title} icon={<KeyboardIcon size={20} />}>
                <p>{richText(labels.files.toml.text, { kalamine: link("kalamine") })}</p>
                <Points items={labels.files.toml.points} />
              </FileCard>
              <FileCard title={labels.files.replacements.title} icon={<WandIcon size={20} />}>
                <p>{labels.files.replacements.text}</p>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-muted p-3 font-mono text-xs leading-relaxed text-foreground">
                  <code>{replacementsSample}</code>
                </pre>
              </FileCard>
              <FileCard title={labels.files.corpus.title} icon={<FileTextIcon size={20} />}>
                <p>{labels.files.corpus.text}</p>
                <Points items={labels.files.corpus.points} />
              </FileCard>
            </ul>
          </Section>

          <Section id="privacy" title={titles.privacy}>
            <ul className="grid gap-3 rounded-2xl border border-border bg-surface p-5">
              {labels.privacy.items.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <span className="mt-0.5 text-accent">
                    <CheckIcon />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="faq" title={titles.faq}>
            <div className="grid gap-3">
              {labels.faq.items.map((item) => (
                <details key={item.question} className="group rounded-2xl border border-border bg-surface px-5 py-4 open:pb-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <span aria-hidden className="text-lg leading-none text-muted transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-muted">{richText(item.answer, { readme: link("readme") })}</p>
                </details>
              ))}
            </div>
          </Section>

          <Section id="source" title={titles.source}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <CodeIcon size={20} />
                </span>
                <p className="mt-4">{richText(labels.source.code, { github: link("github") })}</p>
                <p className="mt-3 text-muted">{richText(labels.source.contribute, { guide: link("guide"), issue: link("issue") })}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
                <h3 className="font-semibold">{labels.source.creditsTitle}</h3>
                <p className="mt-3 text-muted">{richText(labels.source.algorithms, { excel: link("excel") })}</p>
                <p className="mt-3 text-muted">
                  {richText(labels.source.layouts, { propergol: link("propergol"), ergol: link("ergol"), erglace: link("erglace") })}
                </p>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

function Hero({ lang, labels }: { lang: Locale; labels: Labels["hero"] }) {
  return (
    <div className="grid items-center gap-10 rounded-3xl border border-border bg-surface px-6 py-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div>
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">{labels.eyebrow}</p>
        <h1 className="mt-2 w-fit text-3xl font-semibold tracking-tight text-balance text-gradient sm:text-4xl">{labels.title}</h1>
        <p className="mt-4 max-w-2xl text-base text-muted">{labels.intro}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={localePath(lang)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-linear-to-r from-accent from-65% to-accent-2 px-4 text-sm font-medium text-accent-contrast glow hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {labels.open}
            <ArrowRightIcon />
          </Link>
          <a
            href={repositoryUrl}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <CodeIcon />
            {labels.source}
          </a>
        </div>
      </div>
      <SplitKeyboardArt />
    </div>
  );
}

/** Propergol's home rows on a split keyboard, warmer where the fingers press most: decoration only. */
function SplitKeyboardArt() {
  const halves = [
    ["!ÉUP?", "OAIN:", "QÈYHB"],
    ["VMCJX", "GTSRL", "KDFW;"],
  ];
  // How warm each key is drawn, from 0 to 3, row by row: an illustration in the style of the analyzer's heat map, not a result.
  const heat = [
    ["01110", "23332", "01011"],
    ["11211", "13332", "02110"],
  ];
  return (
    <div aria-hidden className="hidden gap-6 lg:flex">
      {halves.map((rows, half) => (
        <div key={half} className="grid gap-1.5">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1.5">
              {Array.from(row).map((char, col) => {
                const level = Number(heat[half]?.[rowIndex]?.[col] ?? 0);
                return (
                  <span
                    key={col}
                    className={cx(
                      "flex size-10 items-center justify-center rounded-lg border text-sm font-semibold",
                      level === 0 && "border-key-border bg-key",
                      level === 1 && "border-accent/20 bg-accent/15",
                      level === 2 && "border-accent/40 bg-accent/35",
                      level === 3 && "border-accent bg-accent text-accent-contrast",
                    )}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Section({ id, title, intro, children }: { id: SectionId; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {intro && <p className="mt-2 max-w-3xl text-sm text-muted">{intro}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function FileCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="min-w-0 rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">{icon}</span>
      <h3 className="mt-4 mb-1 font-semibold text-foreground">{title}</h3>
      {children}
    </li>
  );
}

function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-accent">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
