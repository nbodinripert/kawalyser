/**
 * Colors of the social sharing image (src/app/[lang]/opengraph-image.tsx). The image renders outside the page,
 * where the CSS variables of globals.css do not exist, so these copy the light theme colors of globals.css.
 * Each key is the name of a globals.css variable in camelCase; src/app/theme-colors.test.ts checks they match.
 */
export const ogColors = {
  background: "#f6f8f8",
  foreground: "#142120",
  muted: "#586866",
  accent: "#00766f",
  accentSoft: "#dff3f0",
  key: "#e8efee",
  keyBorder: "#c2d0ce",
} as const;
