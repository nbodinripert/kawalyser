# Kawalyser

Site gratuit pour tester une disposition de clavier et mesurer si elle est agréable à taper, sans avoir à l'apprendre. Il reprend les algorithmes de l'[analyseur Excel Kawalyser](https://github.com/Kawamashi/Kawalyser).

Le projet est en cours d'initialisation : seules les fondations sont en place.

## Démarrer

Il faut Node.js 20.9 ou plus récent, et pnpm.

```bash
pnpm install
pnpm dev
```

Le site s'ouvre sur [http://localhost:3000](http://localhost:3000) et redirige vers `/en` ou `/fr`.

## Commandes

| Commande | Rôle |
| --- | --- |
| `pnpm dev` | Lance le serveur de développement |
| `pnpm build` | Construit la version de production |
| `pnpm start` | Lance la version construite |
| `pnpm lint` | Vérifie le code avec ESLint |
| `pnpm typecheck` | Vérifie les types |
| `pnpm test` | Lance les tests une fois |
| `pnpm test:watch` | Relance les tests à chaque modification |

## Organisation

| Emplacement | Rôle |
| --- | --- |
| `src/app/[lang]/` | Pages, préfixées par la langue |
| `src/proxy.ts` | Redirige vers la langue enregistrée ou celle du navigateur |
| `src/i18n/` | Langues disponibles et traductions |
| `src/lib/theme.ts` | Thème clair ou sombre, appliqué avant le premier affichage |
| `src/components/` | Composants d'interface |

Une traduction manquante dans `fr.json` provoque une erreur de compilation. Le texte de référence est `en.json`.
