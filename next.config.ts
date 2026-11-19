import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The page and its share image read the layouts the site provides from disk (src/server/presets.ts).
  // The keys are globs: brackets are escaped to match the route "/[lang]" itself.
  outputFileTracingIncludes: {
    "/\\[lang\\]": ["./layouts/**/*"],
    "/\\[lang\\]/opengraph-image/**": ["./layouts/**/*"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
