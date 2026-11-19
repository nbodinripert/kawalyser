# Contribuer à Kawalyser

[English](CONTRIBUTING.md) · **Français**

Ce guide explique comment changer les textes, les couleurs et les dispositions du site depuis github.com, sans rien installer et sans connaître le code.

## Le principe

Une modification ne part jamais directement en ligne :

1. Vous modifiez un fichier sur github.com. GitHub crée une **branche** (une copie de travail) et une **pull request** (PR), c'est-à-dire une demande de modification.
2. Des vérifications automatiques tournent (2 à 3 minutes).
3. Vercel publie un **aperçu** du site avec votre modification. Vous le regardez.
4. Le mainteneur relit et accepte la PR. Le site en ligne est mis à jour une à deux minutes plus tard.

Tant que la PR n'est pas acceptée, rien ne change sur le site. Vous ne pouvez rien casser.

## Faire une modification, pas à pas

1. Sur la page du dépôt, ouvrez le fichier à modifier (voir les sections plus bas).
2. Cliquez sur le crayon ✏️ en haut à droite du fichier.
3. Faites votre modification.
4. Cliquez sur **Commit changes…**. Écrivez en une ligne ce que vous avez changé, par exemple « Change the accent color ». Choisissez **Create a new branch for this commit and start a pull request**, puis **Propose changes**.
5. Sur la page suivante, cliquez sur **Create pull request**.

Si vous n'avez pas les droits d'écriture sur le dépôt, GitHub crée d'abord une copie du dépôt (un « fork ») à votre nom : la suite est la même.

Pour changer plusieurs fichiers dans la même PR : après la première modification, restez sur votre branche (son nom est affiché en haut à gauche de la liste des fichiers), ouvrez le fichier suivant, crayon, puis **Commit directly to the …** votre branche.

Astuce : sur la page du dépôt, la touche `.` ouvre un éditeur complet dans le navigateur, pratique pour modifier plusieurs fichiers d'un coup.

### Vérifier votre PR

En bas de la page de la PR :

- **Les vérifications** : une coche verte ✅ veut dire que tout va bien. Une croix rouge ❌ veut dire qu'il y a une erreur (voir « Si la vérification est rouge »).
- **L'aperçu** : le robot Vercel ajoute un commentaire avec un lien **Visit Preview**. Ouvrez-le, et regardez votre modification en anglais et en français, en thème clair et en thème sombre (bouton en haut à droite).

Pour corriger, modifiez à nouveau le fichier sur votre branche : la PR se met à jour toute seule, avec un nouvel aperçu.

## Changer un texte

Tous les textes du site sont dans deux fichiers, un par langue :

- [`src/i18n/dictionaries/en.json`](src/i18n/dictionaries/en.json) pour l'anglais (la langue de référence, en orthographe américaine : « color », « analyzer ») ;
- [`src/i18n/dictionaries/fr.json`](src/i18n/dictionaries/fr.json) pour le français.

Chaque ligne a la forme `"clé": "texte"`. Pour trouver un texte, cherchez-le dans la page avec Ctrl+F (⌘F sur Mac).

Règles :

- **Ne changez que le texte à droite**, jamais la clé à gauche.
- **Changez les deux langues** : la même clé existe dans les deux fichiers.
- **Gardez les mots entre accolades**, comme `{char}`, `{name}` ou `{count}`. Le site les remplace par un caractère, un nom, un nombre. Vous pouvez les déplacer dans la phrase, pas les traduire.
- **Gardez les guillemets droits** `"` autour du texte et la **virgule** en fin de ligne quand il y en a une. Dans un texte, un guillemet droit s'écrit `\"`. Les guillemets français « » s'écrivent normalement.
- Une liste entre crochets `[ … ]` doit garder le même nombre d'éléments dans les deux langues.

Quelques textes utiles :

| Ce que vous voyez | Clé |
| --- | --- |
| Titre et description pour les moteurs de recherche et les réseaux sociaux | `meta` |
| Phrase sous le nom du site | `home.tagline` |
| Menu en haut de page | `nav` |
| Page Docs | `docs` |
| Noms des métriques et leurs abréviations | `results.difficulties.items`, `results.difficulties.short` |
| En-têtes des fichiers CSV | `csv` |
| Pied de page | `footer` |

## Changer une couleur

Toutes les couleurs sont dans [`src/app/globals.css`](src/app/globals.css), dans le bloc qui commence par `:root {`. Chaque couleur a une ligne de commentaire au-dessus qui dit où elle apparaît, et s'écrit ainsi :

```css
--accent: light-dark(#00766f, #3fc4b6);
```

La première valeur est la couleur du **thème clair**, la seconde celle du **thème sombre**. Une couleur s'écrit `#` suivi de 6 chiffres hexadécimaux. Un sélecteur de couleur en ligne (cherchez « color picker ») donne ce code.

Règles :

- Changez toujours les deux thèmes, et regardez les deux sur l'aperçu.
- **Lisibilité** : un texte doit rester lisible sur son fond. Vérifiez le contraste avec [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) : au moins 4,5 pour du texte normal, 3 pour les gros titres et les bordures.
- Les **couleurs des touches après une analyse** vont de `--heat-1` (touches les moins tapées) à `--heat-4` (les plus tapées). En thème clair, le texte de toutes les touches tapées prend `--heat-ink`. En thème sombre, il passe à `--heat-ink` au-delà du niveau `--heat-switch`, un nombre de 0 à 1 écrit quelques lignes sous les couleurs. Si vous changez ces couleurs, vérifiez le texte des touches les moins et les plus tapées dans les deux thèmes.
- L'**image de partage** (celle qui s'affiche quand on partage le lien du site) reprend quelques couleurs du thème clair dans [`src/lib/og-colors.ts`](src/lib/og-colors.ts). Si vous changez `--background`, `--foreground`, `--muted`, `--accent`, `--accent-soft`, `--key` ou `--key-border`, recopiez la couleur claire dans ce fichier. Sinon la vérification sera rouge et vous le dira.

## Ajouter ou changer une disposition

Les dispositions de la liste **Disposition** sont dans le dossier [`layouts/`](layouts) :

- un fichier Kalamine `.toml` par disposition, tel que vous le publiez ;
- un fichier `.json` de remplacements, pour les dispositions qui en ont un ;
- [`layouts/layouts.json`](layouts/layouts.json), la liste dans l'ordre du menu. La première disposition s'ouvre à la première visite.

### Ajouter une disposition, pas à pas

Avant de commencer, vérifiez que la licence de la disposition permet à chacun de la partager. Nommez ses fichiers en minuscules, avec seulement des lettres, des chiffres et des tirets, sans espace ni accent : `ma-disposition.toml`, `ma-disposition.json`.

1. Sur la page du dépôt, ouvrez le dossier `layouts`.
2. Cliquez sur **Add file → Upload files**. Déposez le fichier `.toml`, et le fichier de remplacements `.json` si la disposition en a un.
3. Sous **Commit changes**, décrivez le changement en une ligne, par exemple « Ajoute la disposition Ma Disposition ». Choisissez **Create a new branch for this commit and start a pull request**, puis **Propose changes**.
4. Sur la page suivante, cliquez sur **Create pull request**. Dans la description, donnez un lien vers la disposition et sa licence.
5. En haut de la page de la PR, GitHub écrit « wants to merge 1 commit into `main` from `…` ». Cliquez sur le nom de branche après « from » : il ouvre votre branche.
6. Ouvrez `layouts`, puis `layouts.json`, et cliquez sur le crayon ✏️. Ajoutez une entrée pour la disposition (voir « L'entrée dans layouts.json » plus bas).
7. Cliquez sur **Commit changes…**, choisissez **Commit directly to the … branch**, puis **Commit changes**. La PR se met à jour toute seule.
8. La page Docs nomme les dispositions de la liste dans le texte `docs.features.items.presets.text`. Ajoutez-y le nouveau nom, dans `en.json` et `fr.json`, sur la même branche (voir « Changer un texte »).
9. Attendez la vérification et l'aperçu (voir « Vérifier votre PR »). Sur l'aperçu, choisissez la disposition dans la liste **Disposition**, vérifiez les touches et les pouces, puis cliquez sur **Lancer l'analyse**.

### Modifier ou retirer une disposition

- **Nouvelle version du `.toml`** : dans le dossier `layouts`, déposez le nouveau fichier avec **Add file → Upload files**, sous **exactement le même nom**. GitHub remplace l'ancien fichier. Suivez ensuite les étapes 3, 4 et 9.
- **Nom, pouces ou corpus** : modifiez l'entrée de la disposition dans `layouts.json` avec le crayon.
- **Ordre du menu** : déplacez l'entrée entière, de `{` à `}`, dans `layouts.json`. La première s'ouvre à la première visite.
- **Retirer une disposition** : supprimez son entrée de `layouts.json`, puis ses fichiers (ouvrez le fichier, **⋯ → Delete file**), sur la même branche. La liste doit garder au moins une disposition.

### L'entrée dans layouts.json

Chaque disposition est une entrée entre accolades `{ … }` :

```json
{
  "name": "Propergol",
  "toml": "propergol.toml",
  "replacements": "propergol.json",
  "corpus": "french",
  "thumbs": { "leftHome": "E", "leftSecondary": "#", "rightSecondary": "$", "rightHome": " " }
}
```

| Champ | Sens |
| --- | --- |
| `name` | Le nom affiché dans la liste |
| `toml` | Le fichier de la disposition, dans le dossier `layouts` |
| `replacements` | Facultatif. Le fichier de remplacements, dans le même dossier |
| `corpus` | Facultatif. `"french"` ou `"english"` : le corpus sélectionné avec la disposition |
| `thumbs` | Les quatre touches de pouce, que le `.toml` ne décrit pas |

Les touches de pouce sont `leftHome` et `rightHome` (les touches extérieures, où les pouces se reposent) et `leftSecondary` et `rightSecondary` (les touches intérieures). Écrivez un caractère par touche : `" "` pour espace, `"#"` pour Magic, `"$"` pour Repeat, `"*"` pour la touche morte. Une lettre dessinée tout à gauche de la rangée du bas du `.toml`, comme `"E"` dans Propergol, apporte toute sa touche, avec Shift et son caractère de touche morte. Une touche de pouce absente reste vide.

Les entrées sont séparées par des virgules, et la liste est entre crochets `[ … ]`. Pour ajouter une entrée à la fin, mettez une virgule après l'accolade `}` de la dernière, et aucune après la vôtre :

```json
  {
    "name": "StrudE-L",
    "toml": "strudel.toml",
    "corpus": "french",
    "thumbs": { "leftHome": "E", "rightHome": " " }
  },
  {
    "name": "Ma Disposition",
    "toml": "ma-disposition.toml",
    "thumbs": { "rightHome": " " }
  }
]
```

### Ce que le site lit dans le .toml

- Le dessin `base`, en géométrie ANSI, ISO, ERGO ou ALT, avec la couche de la touche morte à droite de chaque touche. Sans `base`, le dessin `full`, sans couche morte. La rangée des chiffres et AltGr sont ignorées.
- La touche morte `**` (1DK), et ses caractères sur l'espace venus de `[spacebar]`. Les autres touches mortes sont ignorées.
- Un caractère dessiné sur deux touches de la grille principale, dans la même couche, est refusé.

La vérification importe chaque disposition et nomme le fichier ou l'entrée en cause.

## Changer un corpus

Les corpus ne sont pas dans ce dépôt public : ils sont dans un dépôt privé, accessible sur demande au mainteneur. Avec cet accès, remplacez `fr.txt` ou `en.txt` avec **Add file → Upload files** (les fichiers sont trop gros pour le crayon) :

- gardez exactement le même nom de fichier, à la racine du dépôt ;
- en texte brut encodé en UTF-8, sinon les accents seront abîmés.

Le site se redéploie tout seul et utilise le nouveau corpus environ deux minutes plus tard (onglet **Actions** du dépôt des corpus, workflow « Redeploy the site »). Prévenez quand même le mainteneur : le test de comparaison avec l'Excel utilise toujours l'ancien corpus.

## Si la vérification est rouge

1. Cliquez sur **Details** à côté de la croix rouge.
2. Ouvrez l'étape en rouge. Le message (en anglais) nomme le fichier et la clé en cause. Par exemple :
   - `"layout.refused" must contain the same {variables} in both languages` : une variable entre accolades a changé dans un des deux fichiers.
   - `Missing from fr.json: …` : une clé manque dans le fichier français.
   - `--accent: "3fc4b6" is not a color like #00766f` : il manque le `#`.
   - `src/i18n/dictionaries/fr.json is not valid JSON … (line 49 column 7)` : il manque une virgule ou un guillemet dans ce fichier, à la ligne indiquée ou juste avant.
   - `layouts.json: entry 2 (Ergo-L), thumbs: Unrecognized key: "rightOuter"` : un nom de champ de cette entrée est mal écrit.
   - `layouts.json: entry 6 (Ma Disposition), toml: must be a file name of the layouts folder, ending in .toml` : le nom de fichier a une espace, un accent, ou pas de `.toml` à la fin.
   - `ma-disposition.toml is listed in layouts.json but missing from the layouts folder` : le nom de fichier dans `layouts.json` diffère du fichier déposé (vérifiez les majuscules).
   - `ma-disposition.toml: é appear on several keys of the main pad` : le `.toml` dessine ce caractère deux fois dans la même couche.
3. Corrigez sur votre branche. Si le message n'est pas clair, demandez de l'aide dans la PR.

## Ce qui passe par le mainteneur

Les règles de calcul (métriques, poids, comparaison avec l'Excel), les formes de clavier, le moteur et les nouvelles fonctions touchent au code. Pour ces sujets, ouvrez une **issue** (onglet **Issues → New issue → Question or idea**) : décrivez ce que vous voulez, avec un petit exemple si possible.
