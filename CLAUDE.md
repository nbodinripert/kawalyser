# Kawalyser

Site gratuit pour tester une disposition de clavier et mesurer si elle est agréable à taper, sans avoir à l'apprendre. Port web de l'[analyseur Excel Kawalyser](https://github.com/Kawamashi/Kawalyser) (macros VBA), avec la touche morte 1DK, les touches Repeat et Magic, et les Clever Keys.

- Code sous GPLv3. Disposition par défaut : [Propergol](https://github.com/Kawamashi/Propergol) (MIT).
- Le savoir métier vient de Kawamashi, auteur de l'Excel et de Propergol. Ses réponses aux questions de la spec font foi ; le code les cite sous la forme « question N of the specs ».
- Déployé sur Vercel depuis `main` : tout push sur `main` part en production.

@.claude/instructions.md

## Pile technique

| Outil | Version | À savoir |
| --- | --- | --- |
| Next.js | 16.4 (App Router, Turbopack) | `proxy.ts` remplace `middleware.ts`. `cacheComponents` et `partialPrefetching` sont activés. `params` est une `Promise`. Types globaux `PageProps<"/[lang]">` et `LayoutProps<…>` générés par `next typegen`. |
| React | 19.3 | Composants serveur par défaut, `"use client"` seulement où il faut. |
| Tailwind CSS | 4 | Pas de `tailwind.config` : jetons de couleur en variables CSS dans `src/app/globals.css`, thème sombre via `data-theme` (variante `dark` personnalisée). |
| Zod | 4 | Valide tout ce qui entre : requêtes API, fichiers importés, session `localStorage`. |
| Vitest | 5 (jsdom) | Tests à côté du code (`*.test.ts`). |
| pnpm | 12 | Jamais npm ni yarn. |
| TypeScript | 5, `strict` + `noUncheckedIndexedAccess` | Alias `@/*` → `src/*`. |

**Next 16 n'est pas le Next de tes données d'entraînement.** Avant d'utiliser une API Next (routage, cache, proxy, métadonnées, polices, config), lis le guide correspondant dans `node_modules/next/dist/docs/` (01-app, 03-architecture…). Voir aussi `AGENTS.md`, dont le bloc est réécrit par `next dev` : ne pas le supprimer.

## Commandes

```bash
pnpm dev          # http://localhost:3000, redirige vers /en ou /fr
pnpm lint
pnpm typecheck    # next typegen && tsc --noEmit
pnpm test         # vitest run
pnpm build
```

Après une modification, lancer au minimum `pnpm lint`, `pnpm typecheck` et `pnpm test`. Le test de parité Excel ne tourne que si `corpus/fr.txt` existe (c'est le cas sur la machine de l'utilisateur).

## Architecture

Le flux : le navigateur envoie la disposition (JSON) → `POST /api/analyse` valide avec Zod → `src/server/analysis.ts` charge le corpus privé et appelle le moteur → le résultat agrégé revient au client. Le corpus ne quitte jamais le serveur.

| Dossier | Rôle | Règle de dépendance |
| --- | --- | --- |
| `src/domain/` | Formes de clavier (`geometry.ts`), disposition et couches (`layout.ts`), édition par glisser-déposer (`edit.ts`), import Kalamine `.toml` (`kalamine.ts`), remplacements `.json` (`replacements.ts`), caractères valides par langue (`valid-chars.ts`), symboles spéciaux (`symbols.ts`), schémas Zod (`schemas.ts`) | Pur TypeScript. N'importe ni React, ni Next, ni Node. |
| `src/engine/` | Moteur porté du VBA : `keymap.ts` (caractère → touche), `adapt.ts` (corpus → frappes réelles), `count.ts` (n-grammes), `metrics.ts` (bigrammes, trigrammes, difficultés), `analyse.ts` (assemblage), `export.ts` (CSV) | Ne dépend que de `domain/`. Exécutable dans un test sans navigateur ni serveur. |
| `src/server/` | Lecture des corpus (dossier local ou dépôt GitHub privé), cache mémoire des 3 dernières analyses | `import "server-only"` obligatoire. |
| `src/app/[lang]/` | Page unique et layout, localisés | Composants serveur. |
| `src/app/api/` | `analyse` et `export` (CSV, `;` en français) | Valider l'entrée avec Zod, renvoyer `{ error: "code" }` en cas d'échec. |
| `src/components/analyzer/` | Interface client : carte du clavier (`@dnd-kit`), réducteur d'état (`state.ts`), résultats et graphiques | Client. L'état passe par le réducteur, avec undo/redo et sauvegarde `localStorage`. |
| `src/i18n/` | `en` (défaut) et `fr` | `en.json` est la référence : une clé absente de `fr.json` casse la compilation. |

## Invariants à ne jamais casser

1. **Corpus privés.** Jamais dans le dépôt, jamais envoyés au client, jamais importés depuis un fichier client. Dossier `corpus/` ignoré par git ; en production, variables `CORPUS_GITHUB_*` (voir `.env.example`).
2. **Parité Excel.** Le mode `compat` du moteur reproduit l'Excel à l'identique, y compris ses bugs. Toute correction d'un comportement Excel passe par `!compat`, et s'ajoute au tableau « Fidélité à l'Excel » du README. `src/engine/excel-parity.test.ts` doit rester vert.
3. **Moteur pur.** Pas d'accès réseau, fichier, DOM ni `Date` dans `domain/` et `engine/`.
4. **Notation des touches spéciales** : `*` touche morte 1DK, `$` Repeat, `#` Magic (pas `€` comme dans l'Excel, absent des claviers US). Dans le moteur, elles deviennent des caractères Unicode à usage privé (`keymap.ts`) pour ne jamais se confondre avec un vrai `*` ou `#` du corpus.
5. **Lettres appariées.** Une lettre occupe toujours toute sa couche avec sa capitale (`completeLetterPairs`). Toute édition passe par `domain/edit.ts`.
6. **Résultat invalidé.** Toute action qui change ce qui serait analysé (disposition, corpus, remplacements, niveau) efface le résultat (`invalidate` dans `state.ts`). Un résultat qui revient après un changement est ignoré grâce à `requestKey`.
7. **Pas de texte en dur dans l'interface.** Toute chaîne visible passe par `en.json` et `fr.json`.
8. **Couleurs par jetons.** Utiliser les variables de `globals.css` (`bg-surface`, `text-muted`, `bg-accent`…), définies pour les deux thèmes. Pas de couleur hexadécimale dans les composants.

## Conventions

- Commentaires, identifiants, messages de commit et textes `en.json` en anglais. Échanges avec l'utilisateur, README et ce fichier en français.
- Les commentaires expliquent le pourquoi (souvent un renvoi à la spec ou au VBA), pas le quoi.
- Phrases courtes et simples dans l'interface comme dans la doc.
- Composants et fonctions en exports nommés (sauf `page.tsx` et `layout.tsx`, qui exigent un export par défaut) ; fichiers en `kebab-case`.
- Types dérivés des constantes (`as const` puis `(typeof x)[number]`) et des schémas Zod (`z.infer`), plutôt que dupliqués.
- Pas de nouvelle dépendance sans le demander.

## Git et déploiement

- Ne commiter ou pousser que si l'utilisateur le demande. Un push sur `main` déploie en production.
- Le dépôt signe les commits avec l'adresse personnelle (config git locale du dépôt). Ne jamais modifier la config git, ni locale ni globale : Vercel Hobby ignore les pushs signés avec une autre adresse.
- Message de commit en anglais : un titre à l'impératif, puis un corps qui explique les changements visibles.
