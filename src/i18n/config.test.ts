import { describe, expect, it } from "vitest";
import { hasLocale, negotiateLocale } from "./config";

describe("negotiateLocale", () => {
  it("falls back to English without a header", () => {
    expect(negotiateLocale(null)).toBe("en");
  });

  it("falls back to English for unsupported languages", () => {
    expect(negotiateLocale("de-DE,de;q=0.9")).toBe("en");
  });

  it("matches a regional variant on its language", () => {
    expect(negotiateLocale("fr-CH")).toBe("fr");
  });

  it("follows the quality order rather than the written order", () => {
    expect(negotiateLocale("en;q=0.5,fr;q=0.9")).toBe("fr");
  });

  it("skips unsupported languages until one matches", () => {
    expect(negotiateLocale("de,fr;q=0.8,en;q=0.5")).toBe("fr");
  });

  it("ignores languages the visitor refuses", () => {
    expect(negotiateLocale("fr;q=0,en;q=0.5")).toBe("en");
  });
});

describe("hasLocale", () => {
  it("accepts supported locales only", () => {
    expect(hasLocale("fr")).toBe(true);
    expect(hasLocale("de")).toBe(false);
    expect(hasLocale("constructor")).toBe(false);
  });
});
