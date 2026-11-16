import { Fragment, type ReactNode } from "react";

/**
 * Puts elements, links for instance, in place of the {words} of a translated text,
 * so that each language keeps its own word order around them.
 */
export function richText(template: string, parts: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/).map((piece, index) => {
    const name = /^\{(\w+)\}$/.exec(piece)?.[1];
    return <Fragment key={index}>{name !== undefined && name in parts ? parts[name] : piece}</Fragment>;
  });
}
