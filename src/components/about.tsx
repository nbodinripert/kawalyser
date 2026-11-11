import { Card } from "@/components/ui";
import type { Dictionary } from "@/i18n/dictionaries";

type AboutProps = {
  labels: Dictionary["about"];
};

/** Says in plain words what the tool does, for visitors and for search engines, which find little text in the analyser itself. */
export function About({ labels }: AboutProps) {
  return (
    <Card title={labels.title} className="mt-6">
      <p className="max-w-3xl text-sm text-muted">{labels.intro}</p>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <FeatureList title={labels.measuresTitle} items={labels.measures} />
        <FeatureList title={labels.featuresTitle} items={labels.features} />
      </div>
      <p className="mt-5 text-sm font-medium">{labels.free}</p>
    </Card>
  );
}

function FeatureList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted marker:text-accent">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
