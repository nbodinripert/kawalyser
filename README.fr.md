# Kawalyser

[English](README.md) · **Français**

Site gratuit pour tester une disposition de clavier et mesurer si elle est agréable à taper, sans avoir à l'apprendre. Il reprend les algorithmes de l'[analyseur Excel Kawalyser](https://github.com/Kawamashi/Kawalyser), y compris la touche morte 1DK, les touches Repeat et Magic, et les Clever Keys.

Licence : [GPLv3](LICENSE). Les dispositions de la liste sont dans [`layouts/`](layouts) : [Propergol](https://github.com/Kawamashi/Propergol) (licence MIT), ouverte par défaut, [Ergo-L](https://github.com/Nuclear-Squid/ergol) (WTFPL), [Erglace](https://github.com/Lysquid/Erglace), Strud-L et StrudE-L.

## Démarrer

Il faut Node.js 20.9 ou plus récent, et pnpm.

```bash
pnpm install
mkdir corpus   # puis y placer fr.txt et en.txt
pnpm dev
```

Le site s'ouvre sur [http://localhost:3000](http://localhost:3000) et redirige vers `/en`, ou vers `/fr` si le visiteur a déjà choisi le français.

## Les corpus

Les corpus restent privés : ils ne sont jamais envoyés au navigateur et ne sont pas dans ce dépôt. L'analyse se fait sur le serveur.

| Environnement | Source |
| --- | --- |
| Développement | Le dossier `corpus/` à la racine, ignoré par git, ou `CORPUS_DIR` |
| Production | Un dépôt GitHub privé, lu avec `CORPUS_GITHUB_REPO` et `CORPUS_GITHUB_TOKEN` |

Un visiteur peut aussi importer son propre corpus (`.txt`, 10 Mo au plus, en UTF-8 ou Windows-1252). Il n'atteint jamais le serveur : il est analysé dans le navigateur, par un Web Worker qui fait tourner le même moteur, et gardé dans le stockage IndexedDB du navigateur.

Toutes les variables sont décrites dans [`.env.example`](.env.example). Chaque corpus est lu une fois par instance du serveur, puis gardé en mémoire. Un workflow GitHub Actions du dépôt des corpus appelle un « deploy hook » Vercel (secret `VERCEL_DEPLOY_HOOK_URL`) à chaque changement de corpus, pour que le site le prenne en compte tout de suite.

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
| `layouts/` | Les dispositions de la liste : fichiers `.toml`, remplacements, et `layouts.json` avec leurs touches de pouce |
| `src/domain/` | Formes de clavier, disposition, lecture des `.toml` (Kalamine), des remplacements `.json` et de la liste des dispositions |
| `src/engine/` | Le moteur d'analyse, porté du VBA, sans dépendance au navigateur ni au serveur |
| `src/server/` | Chargement privé des corpus, chargement de la liste des dispositions et cache des analyses |
| `src/app/api/` | Routes `analyse` et `export` (CSV) |
| `src/components/analyzer/` | Carte du clavier, glisser-déposer, résultats et graphiques |
| `src/i18n/` | Langues de l'interface et traductions |

Une traduction manquante dans `fr.json` provoque une erreur de compilation. Le texte de référence est `en.json`.

## Contribuer

Les textes, les couleurs et les dispositions se modifient depuis github.com, sans rien installer : le guide est dans [CONTRIBUTING.fr.md](CONTRIBUTING.fr.md). Chaque pull request passe par les vérifications automatiques (`.github/workflows/ci.yml`) et reçoit un aperçu Vercel avant d'être acceptée.

| Pour changer | Fichier |
| --- | --- |
| Les textes | `src/i18n/dictionaries/en.json` et `fr.json` |
| Les couleurs | `src/app/globals.css`, chaque couleur écrite `light-dark(clair, sombre)` |
| Les couleurs de l'image de partage | `src/lib/og-colors.ts` (copie du thème clair, vérifiée par un test) |
| Les dispositions de la liste | `layouts/`, avec `layouts.json` (vérifié par un test) |

## Fidélité à l'Excel

`src/engine/excel-parity.test.ts` compare le moteur aux résultats enregistrés dans le classeur « Propergol CK - fr ». Le test ne tourne que si `corpus/fr.txt` existe. Le moteur a un mode `compat` qui reproduit l'Excel à l'identique, y compris ce que les specs ont corrigé :

| Comportement de l'Excel | Sur le site |
| --- | --- |
| Repeat remplace `aa` à `zz`, même sans touche `$`, à partir du niveau « Essentiels » | Tout caractère doublé tapé d'une seule frappe, ponctuation comprise (pas ceux de la couche morte : Repeat répète la dernière frappe), seulement si `$` est placé, quel que soit le niveau |
| « Pas de lettre avant ou après » ne reconnaît que `a` à `z` et `é` | Toutes les lettres |
| Les barres de charge des index oublient `B` et `K` | Toutes les touches comptent |
| « Sans espace » retire aussi la touche voisine d'espace | Seule la touche espace est retirée |
| La règle « majeur en haut, annulaire en bas » des ciseaux ne s'applique jamais (comparaison texte/nombre en VBA) | La règle s'applique |
| `$`, `£`, `€` et `&` sont retirés du corpus, car ils notaient ses touches spéciales | `*`, `$` et `#` sont retirés, car ils notent les touches spéciales sur la carte ; `£`, `€` et `&` sont gardés et peuvent être tapés |
| Un emoji ou un idéogramme rare compte pour deux caractères | Il compte pour un seul |
| Une lettre enregistrée avec un accent séparé compte pour deux caractères | Les deux sont réunis en un seul caractère (Unicode NFC) |
| Les espaces insécables et les tabulations sont des caractères à part | Ils sont lus comme des espaces |
| Toutes les règles de remplacement s'appliquent, même celles qui demandent une touche absente de la carte (Magic, Repeat, touche morte ou caractère) | Ces règles sont ignorées, car elles ne peuvent pas être tapées ; le panneau des remplacements les barre |

## Format des remplacements

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

Chaque ligne se lit « pour écrire `text`, taper `keys` ». Dans `keys`, `*` est la touche morte, `$` la touche Repeat et `#` la touche Magic. Une règle qui demande une touche absente de la carte est ignorée. Les corrections essentielles s'appliquent à partir du niveau « Essentiels », les optionnelles (les Clever Keys de l'Excel) seulement au niveau « Essentiels + Optionnels ».
