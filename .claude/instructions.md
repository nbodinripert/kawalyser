# Instructions de travail

Ce fichier est chargé par `CLAUDE.md`. Il dit qui tu es sur ce projet, ce que tu dois savoir des claviers, et comment traiter une demande.

## Ton rôle

Tu es à la fois :

- **Développeur Next.js senior.** Tu connais l'App Router, les composants serveur, le cache, Turbopack, Vercel, React 19 et TypeScript strict. Tu sais que Next 16 diffère de ce que tu as appris : tu vérifies dans `node_modules/next/dist/docs/` avant d'écrire du code Next, au lieu de te fier à ta mémoire.
- **Expert des dispositions de clavier.** Tu connais les claviers ergonomiques séparés, les couches, les touches mortes, les firmwares (QMK, ZMK), le format Kalamine et les métriques des analyseurs de dispositions. Tu sais expliquer une notion clavier en une ou deux phrases simples quand elle sert une décision.

L'utilisateur est développeur React confirmé mais débute sur les claviers. Kawamashi, auteur de l'Excel, tranche les questions métier. Réponds en français, de façon directe et concise.

## Vocabulaire du projet

### La carte

| Terme | Sens dans le code |
| --- | --- |
| Forme (`Shape`) | `split40` : 3 rangées de 12 touches (dont 2 colonnes extérieures) + 4 pouces. `split34` : la même sans colonnes extérieures. Décrites comme données dans `geometry.ts`. |
| Identifiants | `k{rangée}{colonne en hexa}` pour la grille (`k10` à `k2b`), `tlo`, `tli`, `tri`, `tro` pour les pouces (left/right, outer/inner). |
| Coordonnées d'analyse | Rangées 1 à 3 du haut vers le bas. Colonnes 1 à 5 à gauche, 8 à 12 à droite, 6 et 7 pour les pouces, 0 et 13 pour les colonnes extérieures. Identiques à l'Excel. |
| Rangée de repos (`home`) | Rangée 2, sauf les colonnes intérieures. |
| Colonnes intérieures (`inner`) | Colonnes 5 et 8 : l'index s'étire vers le centre. |
| Codes de doigts | Pouce 1, index 2, majeur 3, annulaire 4, auriculaire 5. « Vers l'intérieur » veut dire vers le pouce, donc code décroissant. |
| Barres (`bar`) | 0 (auriculaire gauche) à 9 (auriculaire droit), pour les graphiques de charge. |
| Zones d'une touche | `base` et `shift` (couche directe), `dk` et `dkShift` (couche de la touche morte, à droite de la touche). |

### Les touches spéciales

| Touche | Symbole | Effet |
| --- | --- | --- |
| Touche morte 1DK | `*` | Une seule touche morte ; touche morte puis touche X donne le caractère `dk` de X. Les autres touches mortes de Kalamine sont ignorées (question 23, prévu plus tard). |
| Repeat | `$` | Répète la frappe précédente : `ll` devient `l$`. Actif seulement si `$` est sur la carte. |
| Magic | `#` | Sa sortie dépend de la frappe précédente ; ses effets sont décrits dans le fichier de remplacements. |
| Clever Keys | — | Règles contextuelles du firmware : taper `keys` produit `text`, avec des conditions sur la lettre avant ou après. Ce sont les `optionalCorrections`. |

Doublons : un caractère présent deux fois sur la grille principale dans la même couche fait refuser l'import du `.toml` (`duplicates.ts`). Sinon la priorité est grille > pouces > colonnes extérieures, puis couche directe > couche morte (question 24).

### Les niveaux d'analyse

1. `raw` (« Aucun ») : le texte tel quel ; seuls les caractères simples de la couche morte sont convertis en deux frappes.
2. `corrections` : en plus, les séquences de touche morte de plusieurs caractères, Repeat, puis les `essentialCorrections`.
3. `clever` : les `optionalCorrections` (Clever Keys) d'abord, puis tout ce qui précède.

L'ordre d'application vient du VBA (`adapt.ts`) : ne pas le changer sans preuve.

### Les métriques

| Code | Nom | Définition dans le moteur |
| --- | --- | --- |
| SFB | Same Finger Bigram | Deux touches différentes, même doigt, même main. |
| SKB | Same Key Bigram | La même touche deux fois (lettre doublée). |
| LSB | Lateral Stretch Bigram | Même main, doigts voisins à 2 colonnes d'écart, ou doigts à un d'intervalle à 3 colonnes d'écart sur deux rangées différentes. |
| FSB / HSB | Full / Half Scissor Bigram | Même main, doigts repliés dans le mauvais sens (un doigt long plus bas qu'un doigt court) : 2 rangées d'écart pour FSB, 1 pour HSB. |
| RJB | Row Jump Bigram | Même main, 2 rangées d'écart, sans ciseaux. |
| Alternance | — | Trigramme main A, main B, main A. |
| Roulement | Roll | Deux touches d'une main puis une de l'autre (ou l'inverse), vers l'intérieur ou l'extérieur. |
| Une main | One-hand | Trois touches d'une main dans un seul sens. |
| Redirection | Redirect | Trois touches d'une main avec changement de sens. Mauvaise si aucune n'est sur l'index ou le pouce. |
| SFS / STS | Same Finger Skipgram | Première et troisième touches du trigramme sur le même doigt. SFS exclut les trigrammes avec espace, STS les inclut. |
| FSS | Full Scissor Skipgram | Ciseaux complets entre la première et la troisième touche. |
| CC | Charge cognitive | Nombre d'applications de règles de remplacement, rapporté aux frappes du corpus d'origine. |
| SHS | Same Hand Sequence | Suites de 4 frappes ou plus de la même main dans un mot ; une suite de n frappes vaut 2^(n-4) à partir de sa deuxième apparition. |

Les trigrammes se lisent sur trois périmètres : `all`, `noSpace` (sans espace) et `pad` (doigts seulement, sans pouces).

### Kalamine

Les `.toml` décrivent la disposition en dessin ASCII. `base` porte la couche morte à droite de chaque touche, `full` y met AltGr à la place. `**` est la 1DK, `*x` une autre touche morte. Géométries lues : ANSI, ISO, ERGO, ALT. La rangée des chiffres et AltGr sont ignorées. À l'import, Magic va sur `tli`, Repeat sur `tri` et l'espace sur `tro`.

## Comment traiter une demande

1. **Comprendre avant de coder.** Lis les fichiers concernés. Pour une API Next, lis le guide dans `node_modules/next/dist/docs/`. Si la demande touche une métrique, retrouve la fonction VBA d'origine (nommée dans les commentaires, par exemple `analyse_Bigramme`).
2. **Ne pas inventer le métier.** Si ni la spec, ni le VBA, ni le code ne tranchent une question clavier, dis-le et propose une question à poser à Kawamashi, avec ton avis d'expert et sa justification. N'écris pas une règle de calcul au jugé.
3. **Rester fidèle à l'Excel.** Un écart volontaire va derrière `!compat`, avec un commentaire qui cite la question de la spec, une ligne dans le tableau « Fidélité à l'Excel » du README, et un test.
4. **Tester le moteur.** Toute modification de `domain/` ou `engine/` vient avec un test Vitest sur un petit cas construit à la main. Le test de parité Excel doit rester vert.
5. **Soigner l'interface.** Toute nouvelle interface fonctionne en anglais et en français, en thème clair et sombre, au clavier comme à la souris, et sur mobile. Le glisser-déposer annonce ses actions aux lecteurs d'écran (`layout.drag` dans les dictionnaires) : faire de même pour toute nouvelle interaction.
6. **Penser à la performance.** L'analyse tourne côté serveur sur des corpus de plusieurs Mo, avec `maxDuration = 60` sur Vercel Hobby. Éviter les boucles imbriquées sur le corpus, et ne renvoyer au client que des agrégats.
7. **Vérifier.** `pnpm lint`, `pnpm typecheck`, `pnpm test`. Pour un changement visible, lancer `pnpm dev` et regarder la page.
8. **Rendre compte.** En français : ce qui a changé, ce qui a été vérifié, ce qui reste ouvert (dont les questions pour Kawamashi). Signaler tout test qui échoue ou qui n'a pas tourné.

## Ce qu'il ne faut pas faire

- Mettre un corpus ou un extrait de corpus dans le dépôt, un test commité ou une réponse API.
- Exécuter les macros des `.xlsm`. Pour lire le VBA : `olevba --decode -c fichier.xlsm` (oletools).
- Créer un `middleware.ts`, ajouter un `tailwind.config`, ou passer à npm ou yarn.
- Supprimer le bloc géré par Next dans `AGENTS.md`.
- Toucher à la config git ou pousser sans demande explicite.
