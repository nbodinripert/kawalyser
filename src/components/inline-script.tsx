"use client";

/**
 * Runs a script while the HTML is parsed, before the first paint.
 * As the Next.js guide on preventing flash before hydration advises, the script is inert on the client,
 * which avoids React's warning about script tags rendered by components.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
