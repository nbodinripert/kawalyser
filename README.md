# Kawalyser

Site gratuit pour tester une disposition de clavier et mesurer si elle est agréable à taper, sans avoir à l'apprendre. Il reprend les algorithmes de l'[analyseur Excel Kawalyser](https://github.com/Kawamashi/Kawalyser), y compris la touche morte 1DK, les touches Repeat et Magic, et les Clever Keys.

Licence : [GPLv3](LICENSE). La disposition par défaut est [Propergol](https://github.com/Kawamashi/Propergol), sous licence MIT.

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

Toutes les variables sont décrites dans [`.env.example`](.env.example). Chaque corpus est lu une fois par instance du serveur, puis gardé en mémoire.

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
| `src/domain/` | Formes de clavier, disposition, lecture des `.toml` (Kalamine) et des remplacements `.json` |
| `src/engine/` | Le moteur d'analyse, porté du VBA, sans dépendance au navigateur ni au serveur |
| `src/server/` | Chargement privé des corpus et cache des analyses |
| `src/app/api/` | Routes `analyse` et `export` (CSV) |
| `src/components/analyzer/` | Carte du clavier, glisser-déposer, résultats et graphiques |
| `src/i18n/` | Langues de l'interface et traductions |

Une traduction manquante dans `fr.json` provoque une erreur de compilation. Le texte de référence est `en.json`.

## Fidélité à l'Excel

`src/engine/excel-parity.test.ts` compare le moteur aux résultats enregistrés dans le classeur « Propergol CK - fr ». Le test ne tourne que si `corpus/fr.txt` existe. Le moteur a un mode `compat` qui reproduit l'Excel à l'identique, y compris ce que les specs ont corrigé :

| Comportement de l'Excel | Sur le site |
| --- | --- |
| Repeat remplace `aa` à `zz`, même sans touche `$`, à partir du niveau « Corrections essentielles » | Tous les caractères valides doublés tapés d'une seule frappe (pas ceux de la couche morte : Repeat répète la dernière frappe), seulement si `$` est placé, quel que soit le niveau |
| « Pas de lettre avant ou après » ne reconnaît que `a` à `z` et `é` | Toutes les lettres |
| Les barres de charge des index oublient `B` et `K` | Toutes les touches comptent |
| « Sans espace » retire aussi la touche voisine d'espace | Seule la touche espace est retirée |
| La règle « majeur en haut, annulaire en bas » des ciseaux ne s'applique jamais (comparaison texte/nombre en VBA) | La règle s'applique |
| `#` n'est pas retiré du corpus | `#` est retiré, car il note la touche Magic |
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

Chaque ligne se lit « pour écrire `text`, taper `keys` ». Dans `keys`, `*` est la touche morte, `$` la touche Repeat et `#` la touche Magic. Une règle qui demande une touche absente de la carte est ignorée. Les corrections essentielles s'appliquent à partir du niveau « Corrections essentielles », les optionnelles (les Clever Keys de l'Excel) seulement au niveau « Corrections optionnelles ».
