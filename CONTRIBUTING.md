# Contributing to Kawalyser

**English** · [Français](CONTRIBUTING.fr.md)

This guide explains how to change the site's texts, colors and layouts from github.com, with nothing to install and no knowledge of the code.

## How it works

A change never goes live directly:

1. You edit a file on github.com. GitHub creates a **branch** (a working copy) and a **pull request** (PR), a request to apply your change.
2. Automatic checks run (2 to 3 minutes).
3. Vercel publishes a **preview** of the site with your change. You look at it.
4. The maintainer reviews and accepts the PR. The live site updates a minute or two later.

Until the PR is accepted, nothing changes on the site. You cannot break anything.

## Making a change, step by step

1. On the repository page, open the file to change (see the sections below).
2. Click the pencil ✏️ at the top right of the file.
3. Make your change.
4. Click **Commit changes…**. Describe your change in one line, for example "Change the accent color". Choose **Create a new branch for this commit and start a pull request**, then **Propose changes**.
5. On the next page, click **Create pull request**.

If you do not have write access to the repository, GitHub first makes a copy of it under your name (a "fork"): the next steps are the same.

To change several files in the same PR: after the first change, stay on your branch (its name shows at the top left of the file list), open the next file, click the pencil, then **Commit directly to the …** branch.

Tip: on the repository page, the `.` key opens a full editor in the browser, handy to change several files at once.

### Checking your PR

At the bottom of the PR page:

- **The checks**: a green tick ✅ means all is well. A red cross ❌ means there is an error (see "If the checks are red").
- **The preview**: the Vercel bot adds a comment with a **Visit Preview** link. Open it, and look at your change in English and French, in the light and dark themes (button at the top right).

To fix something, edit the file again on your branch: the PR updates itself, with a new preview.

## Changing a text

All the site's texts are in two files, one per language:

- [`src/i18n/dictionaries/en.json`](src/i18n/dictionaries/en.json) for English (the reference language, in American spelling: "color", "analyzer");
- [`src/i18n/dictionaries/fr.json`](src/i18n/dictionaries/fr.json) for French.

Each line reads `"key": "text"`. To find a text, search the page with Ctrl+F (⌘F on a Mac).

Rules:

- **Only change the text on the right**, never the key on the left.
- **Change both languages**: the same key exists in both files.
- **Keep the words in braces**, such as `{char}`, `{name}` or `{count}`. The site replaces them with a character, a name, a number. You can move them within the sentence, but not translate them.
- **Keep the straight quotes** `"` around the text, and the **comma** at the end of the line when there is one. Inside a text, a straight quote is written `\"`.
- A list in square brackets `[ … ]` must keep the same number of items in both languages.

Some useful texts:

| What you see | Key |
| --- | --- |
| Title and description for search engines and social networks | `meta` |
| Line under the site name | `home.tagline` |
| Menu at the top of the page | `nav` |
| Docs page | `docs` |
| Metric names and their abbreviations | `results.difficulties.items`, `results.difficulties.short` |
| CSV file headers | `csv` |
| Footer | `footer` |

## Changing a color

All the colors are in [`src/app/globals.css`](src/app/globals.css), in the block that starts with `:root {`. Each color has a comment line above it that says where it shows, and is written like this:

```css
--accent: light-dark(#00766f, #3fc4b6);
```

The first value is the **light theme** color, the second the **dark theme** color. A color is written `#` followed by 6 hexadecimal digits. Any online color picker gives this code.

Rules:

- Always change both themes, and look at both on the preview.
- **Readability**: text must stay readable on its background. Check the contrast with the [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/): at least 4.5 for normal text, 3 for large headings and borders.
- The **sharing image** (the one shown when someone shares the site's link) reuses a few light theme colors in [`src/lib/og-colors.ts`](src/lib/og-colors.ts). If you change `--background`, `--foreground`, `--muted`, `--accent`, `--accent-soft`, `--key` or `--key-border`, copy the light color into that file too. Otherwise the checks turn red and tell you so.

## Adding or changing a layout

The layouts of the **Layout** list live in the [`layouts/`](layouts) folder:

- one Kalamine `.toml` file per layout, as you publish it;
- a replacements `.json` file, for the layouts that have one;
- [`layouts/layouts.json`](layouts/layouts.json), the list in the order of the menu. The first layout opens on a first visit.

To add a layout, upload its files with **Add file → Upload files** in the `layouts` folder, then add an entry to `layouts.json` in the same PR:

```json
{
  "name": "Propergol",
  "toml": "propergol.toml",
  "replacements": "propergol.json",
  "corpus": "french",
  "thumbs": { "leftHome": "E", "leftSecondary": "#", "rightSecondary": "$", "rightHome": " " }
}
```

| Field | Meaning |
| --- | --- |
| `name` | The name shown in the list |
| `toml` | The layout file, in the `layouts` folder |
| `replacements` | Optional. The replacements file, in the same folder |
| `corpus` | Optional. `"french"` or `"english"`: the corpus selected with the layout |
| `thumbs` | The four thumb keys, which the `.toml` does not describe |

The thumb keys are `leftHome` and `rightHome` (the outer keys, where the thumbs rest) and `leftSecondary` and `rightSecondary` (the inner ones). Write one character per key: `" "` for space, `"#"` for Magic, `"$"` for Repeat, `"*"` for the dead key. A letter drawn at the far left of the bottom row of the `.toml`, such as `"E"` in Propergol, brings that whole key, with Shift and its dead key character. A thumb key left out stays empty.

Entries are separated by commas, and the list is enclosed in square brackets `[ … ]`. The checks import every layout and name the file or the entry at fault.

## Changing a corpus

The corpora are not in this public repository: they live in a private repository, open on request to the maintainer. With that access, replace `fr.txt` or `en.txt` with **Add file → Upload files** (the files are too big for the pencil):

- keep the exact file name, at the root of the repository;
- plain text, encoded in UTF-8, or accents will be damaged.

The site redeploys by itself and uses the new corpus about two minutes later (**Actions** tab of the corpus repository, "Redeploy the site" workflow). Tell the maintainer anyway: the comparison test with the Excel analyzer still uses the previous corpus.

## If the checks are red

1. Click **Details** next to the red cross.
2. Open the red step. The message names the file and the key at fault. For example:
   - `"layout.refused" must contain the same {variables} in both languages`: a word in braces changed in one of the two files.
   - `Missing from fr.json: …`: a key is missing from the French file.
   - `--accent: "3fc4b6" is not a color like #00766f`: the `#` is missing.
   - `src/i18n/dictionaries/fr.json is not valid JSON … (line 49 column 7)`: a comma or a quote is missing in that file, on that line or just before.
   - `layouts.json: entry 2 (Ergo-L), thumbs: Unrecognized key: "rightOuter"`: a field name of that entry is misspelled.
3. Fix it on your branch. If the message is unclear, ask for help in the PR.

## What goes through the maintainer

Calculation rules (metrics, weights, comparison with the Excel analyzer), keyboard shapes, the engine and new features all touch the code. For these, open an **issue** (**Issues → New issue → Question or idea**): describe what you want, with a small example if you can.
