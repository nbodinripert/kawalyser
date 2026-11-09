import { describe, expect, it } from "vitest";
import { defaultLocale, hasLocale } from "./config";

describe("locales", () => {
  it("defaults to English", () => {
    expect(defaultLocale).toBe("en");
  });

  it("accepts supported locales only", () => {
    expect(hasLocale("fr")).toBe(true);
    expect(hasLocale("de")).toBe(false);
    expect(hasLocale("constructor")).toBe(false);
  });
});
