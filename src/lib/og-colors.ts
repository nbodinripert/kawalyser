/**
 * Colors of the social sharing image (src/app/[lang]/opengraph-image.tsx). The image renders outside the page,
 * where the CSS variables of globals.css do not exist, so these copy the light theme colors of globals.css.
 * Each key is the name of a globals.css variable in camelCase; src/app/theme-colors.test.ts checks they match.
 */
export const ogColors = {
  background: "#f2f7f8",
  foreground: "#0d1b22",
  muted: "#4e6470",
  accent: "#00766f",
  accentSoft: "#d8f5f1",
  key: "#e4eef0",
  keyBorder: "#bfd2d6",
} as const;
