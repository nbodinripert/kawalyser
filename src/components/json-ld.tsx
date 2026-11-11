/**
 * Structured data for search engines, as the Next.js JSON-LD guide advises.
 * Escaping `<` keeps a string in the data from closing the script tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
