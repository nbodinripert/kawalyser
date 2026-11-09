import type { Replacements } from "@/domain/replacements";
import type { Dictionary } from "@/i18n/dictionaries";

type ReplacementsPanelProps = {
  replacements: Replacements;
  name: string | null;
  labels: Dictionary["replacements"];
};

/** Reads "to write this, type that", as Kawamashi asked (question 14 of the specs). */
export function ReplacementsPanel({ replacements, name, labels }: ReplacementsPanelProps) {
  const groups = [
    { title: labels.corrections, rules: replacements.corrections },
    { title: labels.cleverKeys, rules: replacements.cleverKeys },
  ].filter((group) => group.rules.length > 0);

  return (
    <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-surface-muted/60" aria-label={labels.title}>
      <header className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">{labels.title}</h3>
        {name && <p className="truncate text-xs text-muted">{name}</p>}
      </header>
      {groups.length === 0 ? (
        <p className="px-3 py-3 text-xs text-muted">{labels.empty}</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {groups.map((group) => (
            <section key={group.title} className="mb-3 last:mb-0">
              <h4 className="mb-1 text-[0.7rem] font-semibold tracking-wide text-faint uppercase">{group.title}</h4>
              <table className="w-full text-sm">
                <thead className="sr-only">
                  <tr>
                    <th>{labels.toWrite}</th>
                    <th />
                    <th>{labels.type}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rules.map((rule, index) => (
                    <tr key={`${rule.text}-${index}`} className="border-t border-border/70 first:border-t-0">
                      <td className="py-1 pr-2 font-mono">{rule.text}</td>
                      <td aria-hidden className="py-1 text-faint">
                        →
                      </td>
                      <td className="py-1 pl-2 text-right font-mono font-semibold text-accent">{rule.keys}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </aside>
  );
}
