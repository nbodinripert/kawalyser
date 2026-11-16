# Kawalyser

**English** · [Français](README.fr.md)

A free website to test a keyboard layout and measure how comfortable it is to type, without learning it first. It ports the algorithms of the [Kawalyser Excel analyzer](https://github.com/Kawamashi/Kawalyser) by Kawamashi, including the 1DK dead key, the Repeat and Magic keys, and Clever Keys.

License: [GPLv3](LICENSE). The layouts of the list are in [`layouts/`](layouts): [Propergol](https://github.com/Kawamashi/Propergol) (MIT license), opened by default, [Ergo-L](https://github.com/Nuclear-Squid/ergol) (WTFPL), [Erglace](https://github.com/Lysquid/Erglace), Strud-L and StrudE-L.

## Features

- **Ready-made layouts.** Pick one in the Layout list: its keys, thumb keys, replacements and corpus load in one click. After a change, the list says "(modified)", and Ctrl+Z also undoes the choice of a layout.
- **Kalamine import.** Load any `.toml` file on a split keyboard with 40 or 34 keys. Drag a character onto another key, or select a zone and type.
- **Special keys.** The 1DK dead key (`*`), Repeat (`$`), Magic (`#`) and Clever Keys, with a replacements file. Three levels of replacements: None, Essential, Essential + Optional.
- **Every character counts.** Any character placed on the map can be typed. A rare character used in a replacements file becomes a second dead key or a second Magic key.
- **Your own corpus.** Import a `.txt` file in any language, up to 10 MB, in UTF-8 or Windows-1252. It is analyzed in the browser and never reaches the server.
- **Statistics.** Finger and hand load, bigrams, trigrams, the 12 difficulties, cognitive load, and the most frequent corpus characters missing from the map. Every detail downloads as CSV.
- **Docs page.** `/en/docs` explains the special keys, each statistic and the file formats.
- English and French, light and dark themes, usable with the keyboard alone and on a phone.

The figures differ slightly from those of the first version of the site: every character of the map now counts, the hyphen among them.

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

A visitor can also import a corpus of their own (`.txt`, up to 10 MB, UTF-8 or Windows-1252). It never reaches the server: it is analyzed in the browser, in a Web Worker that runs the same engine, and kept in the browser's IndexedDB storage.

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
| `layouts/` | The layouts of the list: `.toml` files, replacements, and `layouts.json` with their thumb keys |
| `src/domain/` | Keyboard shapes, layout, reading Kalamine `.toml` files, replacement `.json` files, the layouts list and the corpus a visitor imports |
| `src/engine/` | The analysis engine, ported from VBA, with no browser or server dependency |
| `src/server/` | Private corpus loading, layouts list loading and analysis cache |
| `src/app/api/` | `analyse` and `export` (CSV) routes |
| `src/components/analyzer/` | Keyboard map, drag and drop, results and charts, analysis of a visitor's corpus in a Web Worker |
| `src/components/docs/` | The Docs page: what the site does, special keys, statistics, files, privacy |
| `src/i18n/` | Interface languages and translations |

A translation missing from `fr.json` breaks the build. The reference text is `en.json`.

## Contributing

Texts, colors and layouts can be changed from github.com, with nothing to install: see the guide in [CONTRIBUTING.md](CONTRIBUTING.md). Every pull request goes through the automatic checks (`.github/workflows/ci.yml`) and gets a Vercel preview before it is accepted.

| To change | File |
| --- | --- |
| Texts | `src/i18n/dictionaries/en.json` and `fr.json` |
| Colors | `src/app/globals.css`, each color written `light-dark(light, dark)` |
| Colors of the sharing image | `src/lib/og-colors.ts` (copy of the light theme, checked by a test) |
| Layouts of the list | `layouts/`, with `layouts.json` (checked by a test) |

## Faithfulness to the Excel analyzer

`src/engine/excel-parity.test.ts` compares the engine with the results saved in the "Propergol CK - fr" workbook. The test only runs if `corpus/fr.txt` exists. The engine has a `compat` mode that reproduces the Excel analyzer exactly, including what the specs corrected:

| Excel behavior | On the site |
| --- | --- |
| Repeat replaces `aa` to `zz`, even without a `$` key, from the "Essential" level | Every doubled character typed with a single key press, punctuation included (not the dead key layer ones: Repeat repeats the last key press), only if `$` is placed, at every level |
| "No letter before or after" only recognizes `a` to `z` and `é` | Every letter |
| The index finger load bars miss `B` and `K` | Every key counts |
| "Without space" also removes the key next to space | Only the space key is removed |
| The scissor rule "middle finger on top, ring finger below" never applies (a text/number comparison in VBA) | The rule applies |
| `$`, `£`, `€` and `&` are removed from the corpus, since they stood for its special keys | `*`, `$` and `#` are removed, since they stand for the special keys on the map; `£`, `€` and `&` are kept and can be typed |
| An emoji or a rare ideogram counts as two characters | It counts as one |
| A letter saved with a separate combining accent counts as two characters | They are joined into one character (Unicode NFC) |
| No-break spaces and tabs are characters of their own | They are read as spaces |
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
