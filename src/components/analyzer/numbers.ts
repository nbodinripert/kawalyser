import type { Locale } from "@/i18n/config";

export type Formatters = {
  percent: (value: number) => string;
  signedPercent: (value: number) => string;
  decimal: (value: number) => string;
  integer: (value: number) => string;
};

export function formatters(locale: Locale): Formatters {
  const percent = new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const signed = new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const decimal = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  return {
    percent: (value) => percent.format(value),
    signedPercent: (value) => signed.format(value),
    decimal: (value) => decimal.format(value),
    integer: (value) => integer.format(value),
  };
}
