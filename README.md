# Kawalyser

**English** · [Français](README.fr.md)

A free website to test a keyboard layout and measure how comfortable it is to type, without learning it first. It ports the algorithms of the [Kawalyser Excel analyzer](https://github.com/Kawamashi/Kawalyser) by Kawamashi, including the 1DK dead key, the Repeat and Magic keys, and Clever Keys.

License: [GPLv3](LICENSE). The default layout is [Propergol](https://github.com/Kawamashi/Propergol), under the MIT license.

## Getting started

You need Node.js 20.9 or later, and pnpm.

```bash
pnpm install
mkdir corpus   # then put fr.txt and en.txt in it
pnpm dev
```

The site opens on [http://localhost:3000](http://localhost:3000) and redirects to `/en`, or to `/fr` if the visitor already chose French.

## The corpora

The corpora stay private: they are never sent to the browser and are not in this repository. The analysis runs on the server.

| Environment | Source |
| --- | --- |
| Development | The `corpus/` folder at the root, ignored by git, or `CORPUS_DIR` |
| Production | A private GitHub repository, read with `CORPUS_GITHUB_REPO` and `CORPUS_GITHUB_TOKEN` |

Every variable is described in [`.env.example`](.env.example). Each corpus is read once per server instance, then kept in memory. A GitHub Actions workflow in the corpus repository calls a Vercel deploy hook (`VERCEL_DEPLOY_HOOK_URL` secret) whenever a corpus changes, so the site picks it up right away.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Starts the development server |
| `pnpm build` | Builds the production version |
| `pnpm start` | Starts the built version |
| `pnpm lint` | Checks the code with ESLint |
| `pnpm typecheck` | Checks the types |
| `pnpm test` | Runs the tests once |
| `pnpm test:watch` | Runs the tests again on every change |

## Project structure

| Location | Purpose |
| --- | --- |
| `src/domain/` | Keyboard shapes, layout, reading Kalamine `.toml` files and replacement `.json` files |
| `src/engine/` | The analysis engine, ported from VBA, with no browser or server dependency |
| `src/server/` | Private corpus loading and analysis cache |
| `src/app/api/` | `analyse` and `export` (CSV) routes |
| `src/components/analyzer/` | Keyboard map, drag and drop, results and charts |
| `src/i18n/` | Interface languages and translations |

A translation missing from `fr.json` breaks the build. The reference text is `en.json`.

## Contributing

Texts and colors can be changed from github.com, with nothing to install: see the guide in [CONTRIBUTING.md](CONTRIBUTING.md). Every pull request goes through the automatic checks (`.github/workflows/ci.yml`) and gets a Vercel preview before it is accepted.

| To change | File |
| --- | --- |
| Texts | `src/i18n/dictionaries/en.json` and `fr.json` |
| Colors | `src/app/globals.css`, each color written `light-dark(light, dark)` |
| Colors of the sharing image | `src/lib/og-colors.ts` (copy of the light theme, checked by a test) |

## Faithfulness to the Excel analyzer

`src/engine/excel-parity.test.ts` compares the engine with the results saved in the "Propergol CK - fr" workbook. The test only runs if `corpus/fr.txt` exists. The engine has a `compat` mode that reproduces the Excel analyzer exactly, including what the specs corrected:

| Excel behavior | On the site |
| --- | --- |
| Repeat replaces `aa` to `zz`, even without a `$` key, from the "Essential" level | Every doubled valid character typed with a single key press (not the dead key layer ones: Repeat repeats the last key press), only if `$` is placed, at every level |
| "No letter before or after" only recognizes `a` to `z` and `é` | Every letter |
| The index finger load bars miss `B` and `K` | Every key counts |
| "Without space" also removes the key next to space | Only the space key is removed |
| The scissor rule "middle finger on top, ring finger below" never applies (a text/number comparison in VBA) | The rule applies |
| `#` is not removed from the corpus | `#` is removed, since it stands for the Magic key |
| Every replacement rule applies, even those that need a key missing from the map (Magic, Repeat, dead key or character) | These rules are ignored, since they cannot be typed; the replacements panel strikes them through |

## Replacements format

```json
{
  "essentialCorrections": [{ "text": "qu", "keys": "q" }],
  "optionalCorrections": [
    { "text": "quand", "keys": "qn" },
    { "text": "ment", "keys": "m#", "noLetterAfter": true, "allowedAfter": ["s"] },
    { "text": "pour", "keys": "pj", "noLetterBefore": true, "noLetterAfter": true }
  ]
}
```

Each line reads "to write `text`, type `keys`". In `keys`, `*` is the dead key, `$` the Repeat key and `#` the Magic key. A rule that needs a key missing from the map is ignored. Essential corrections apply from the "Essential" level, optional ones (the Excel analyzer's Clever Keys) only at the "Essential + Optional" level.
