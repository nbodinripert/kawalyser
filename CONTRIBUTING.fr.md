# Contribuer à Kawalyser

[English](CONTRIBUTING.md) · **Français**

Ce guide explique comment changer les textes et les couleurs du site depuis github.com, sans rien installer et sans connaître le code.

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
| Section de présentation en bas de page | `about` |
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
- L'**image de partage** (celle qui s'affiche quand on partage le lien du site) reprend quelques couleurs du thème clair dans [`src/lib/og-colors.ts`](src/lib/og-colors.ts). Si vous changez `--background`, `--foreground`, `--muted`, `--accent`, `--accent-soft`, `--key` ou `--key-border`, recopiez la couleur claire dans ce fichier. Sinon la vérification sera rouge et vous le dira.

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
3. Corrigez sur votre branche. Si le message n'est pas clair, demandez de l'aide dans la PR.

## Ce qui passe par le mainteneur

Les règles de calcul (métriques, poids, comparaison avec l'Excel), les formes de clavier, le moteur et les nouvelles fonctions touchent au code. Pour ces sujets, ouvrez une **issue** (onglet **Issues → New issue → Question or idea**) : décrivez ce que vous voulez, avec un petit exemple si possible.
