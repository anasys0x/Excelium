# Questionnaire centré sur le sens des données (refonte)

Date : 2026-07-15
Statut : Validé, à implémenter directement (pas de plan séparé pour ce lot)

## Contexte

Le questionnaire actuel (`frontend/src/lib/questions.ts`) pose surtout des
questions de réglages d'application (thème, export, tri, barre de
recherche, navigation) qui n'aident pas à comprendre le sens des données
importées. Recherche de patterns comparables (Notion « À quoi va servir ce
space ? », Airtable) : les flows d'onboarding qui fonctionnent posent peu de
questions centrées sur l'intention/le sens des données, qui reconfigurent
directement la structure proposée — pas des réglages cosmétiques.

Objectif de ce lot :
1. Recentrer les questions sur la compréhension des données (confirmer/
   affiner l'archétype, ce qui compte dans une ligne, l'usage des chiffres).
2. Ajouter des sous-questions dynamiques (3 branches) qui n'apparaissent
   qu'une fois la question déclenchante répondue, pour affiner la
   proposition sans allonger le parcours pour tout le monde.
3. Rendre l'aperçu graphique des 3 propositions réel (données réelles), pas
   décoratif.
4. Faire porter la question « y a-t-il un graphique pertinent » sur la même
   table que celle réellement prévisualisée (au lieu de « n'importe quelle
   table du classeur »).
5. Textes de questions/options courts et directs, sans sous-texte explicatif.

## Banque de questions

Catégories : `donnees` (comprendre les données), `usage` (fréquence/volume),
`confort` (thème, seule question cosmétique conservée).

Champ `impact` retiré du modèle (`QuestionOption`) — le libellé seul suffit,
y compris dans le résumé de la barre latérale.

### Questions de base (toujours posées, sauf mention contraire)

1. **identity** (donnees) — « Cette table représente surtout... ? »
   4 options (exception à la règle « 3 options » : elles correspondent
   1:1 aux 4 archétypes réels du système, pas de 4e artificiel à couper) :
   - Des personnes/contacts — `archetype.contacts:+5`
   - Des ventes/transactions — `archetype.sales:+5`
   - Un catalogue de produits — `archetype.inventory:+5`
   - Des événements — `archetype.events:+5`
   → déclenche la **branche B** (sous-question spécifique à l'archétype choisi).

2. **row-focus** (donnees) — « En regardant une ligne, tu cherches surtout... ? »
   - Comparer des valeurs — `widget.stats:+2, layout.dashboard:+1`
   - Voir un statut — `interaction:0` *(placeholder neutre, affiné par la branche C)*
   - Repérer visuellement — `layout.gallery:+2`
   - L'identifiant/le nom — `layout.table:+2`
   → « Voir un statut » déclenche la **branche C**.

3. **edit** (usage) — « Tu vas modifier ces données ? »
   - Souvent — `interaction:+2`
   - Rarement, c'est une référence — `interaction:-1, layout.table:+1`
   - Jamais après l'import — `interaction:-2`

4. **numbers** (donnees) — « Ces chiffres, tu veux les... ? »
   *Affichée seulement si `findChartRecommendation` trouve une métrique
   significative sur la table d'aperçu (voir section suivante).*
   - Comparer en graphique — `widget.chart:+3`
   - Suivre un total — `widget.stats:+3`
   - Juste consulter — `widget.chart:-1, widget.stats:-1`
   → « Comparer en graphique » déclenche la **branche A**.

5. **images** (donnees) — « Les photos sont importantes ? »
   *Affichée seulement si la table d'aperçu a une colonne image.*
   - Oui, mets-les en avant — `layout.gallery:+3`
   - Non — `layout.gallery:-1`

6. **volume** (usage) — « Combien de lignes environ ? »
   - Peu (moins de 50) — `density:-1`
   - Beaucoup (plus de 500) — `density:+2, widget.stats:+1`
   - Entre les deux — pas de poids

7. **primary-table** (usage) — dynamique, inchangée par rapport à
   l'implémentation actuelle (noms réels des tables, plafonné à 3,
   affichée seulement si ≥ 2 tables).

8. **theme** (confort) — « Thème de la webapp ? »
   - Sombre — `theme:'dark'`
   - Clair — `theme:'light'`
   - Peu importe — `theme:'dark'` *(neutre, garde la valeur par défaut)*

Les anciennes questions `access` → remplacée par `edit` (même rôle,
texte raccourci). `layout` → remplacée par `row-focus` (sens différent :
porte sur ce qui compte dans une ligne, pas sur le type de vue en soi — le
type de vue se déduit désormais de `row-focus` + `identity` + archétype
détecté, pas d'une question dédiée). `insights` → remplacée par `numbers`.
`navigation`, `search`, `sort`, `exports` → retirées comme questions
autonomes ; les champs `PreferenceProfile` correspondants gardent leurs
valeurs par défaut actuelles (`navigation:'tabs'`, `searchEnabled:true`,
`sortMode:'source'`, `exportMode:'all'`) puisque plus rien ne les modifie —
aucun changement requis côté `uiProposals.ts`/`session.ts`/`StepUiProposals`
pour ces champs.

### Branches (sous-questions dynamiques)

Insérées dans la liste juste après leur question déclenchante, seulement
une fois celle-ci répondue avec l'option qui la déclenche. Si la réponse à
la question déclenchante change, l'ancienne sous-question disparaît (et sa
réponse orpheline est ignorée — déjà le comportement de `getValidAnswers`,
qui ne compte que les réponses dont l'id d'option existe encore parmi les
options de la question courante du banc actuel).

**Branche A** — déclenchée par `numbers` = « Comparer en graphique » :
- id `chart-kind`, catégorie `donnees` — « Comparer comment ? »
  - Évolution dans le temps — `chartPreference:'time'`
  - Par catégorie — `chartPreference:'category'`
  - Peu importe — pas de poids

**Branche B** — déclenchée par `identity`, une variante selon l'archétype choisi :
- id `focus-contacts` (si contacts) — « Tu veux surtout... ? »
  - Retrouver vite quelqu'un — `layout.table:+2`
  - Des fiches individuelles — `layout.cards:+2`
  - Une vue visuelle — `layout.gallery:+2`
- id `focus-sales` (si ventes) — « Le plus important ? »
  - Le total — `widget.stats:+2, archetype.sales:+2`
  - L'évolution — `widget.chart:+2, chartPreference:'time'`
  - Qui a acheté quoi — `layout.table:+2`
- id `focus-inventory` (si catalogue) — « Tu veux surtout... ? »
  - Suivre le stock — `widget.stats:+2, archetype.inventory:+2`
  - Mettre en valeur visuellement — `layout.gallery:+2`
  - Comparer les prix — `widget.chart:+2, chartPreference:'category'`
- id `focus-events` (si événements) — « Tu veux surtout... ? »
  - Les prochains rendez-vous — `layout.table:+2`
  - L'historique — `layout.table:+1, widget.stats:+1`
  - Une vue calendrier — `layout.cards:+2`

**Branche C** — déclenchée par `row-focus` = « Voir un statut » :
- id `status-editable`, catégorie `donnees` — « Ce statut, tu le modifies souvent ? »
  - Oui, je veux pouvoir le changer facilement — `interaction:+2`
  - Non, juste informatif — `interaction:0`
  - Peu importe — pas de poids

## `PreferenceDelta` / `PreferenceProfile` — un seul champ ajouté

```typescript
export type ChartPreference = 'time' | 'category'

export interface PreferenceDelta {
  // ... champs existants inchangés ...
  chartPreference?: ChartPreference
}

export interface PreferenceProfile {
  // ... champs existants inchangés ...
  chartPreference?: ChartPreference   // dernier choisi, pas d'accumulateur
}
```

`buildPreferenceProfile` : `chartPreference: delta.chartPreference ??
profile.chartPreference` (même mécanique que `theme`/`navigation`, dernier
répondu gagne, absent = pas de préférence).

## Graphique : préférence explicite + cohérence de table

`findChartRecommendation(columns, preference?: ChartPreference)` dans
`semantic.ts` : actuellement l'ordre de test est toujours catégorie puis
date. Si `preference === 'time'` et qu'une colonne date valide existe, on
la teste **avant** la colonne catégorie (inverse l'ordre seulement dans ce
cas). Si `preference === 'category'` ou absent, ordre inchangé (catégorie
d'abord). Comportement par défaut strictement identique si aucune
préférence n'est fournie — aucune régression sur l'existant.

`ChartWidget` reçoit une nouvelle prop optionnelle `preference?:
ChartPreference`, transmise par `DashboardView` (nouvelle prop optionnelle
`chartPreference`), elle-même transmise par `GeneratedApp` (nouvelle prop
`chartPreference: ChartPreference | undefined`, lue depuis le preset
sauvegardé/`appSeed`).

**Cohérence de table** : dans `App.tsx`, `hasMeaningfulChart` est
actuellement `questionnaireTables.some(...)` (n'importe quelle table du
classeur). Remplacé par un calcul sur la seule table d'aperçu
(`proposalPreviewTable`/table principale par défaut) :
`findChartRecommendation(previewTable.analyzed) !== null`. Les questions
`numbers`/`images` (conditionnelles) et l'aperçu en direct portent donc
tous sur la même table — plus de décalage entre « le classeur a un
graphique pertinent quelque part » et « ce que tu vois dans l'aperçu ».

## Aperçu réel (pas décoratif)

Extraction de `buildCategoryChart`/`buildTimeChart` (actuellement privées
dans `ChartWidget.tsx`) vers un nouveau module pur
`frontend/src/lib/chartData.ts`, réutilisé par `ChartWidget.tsx` (webapp
finale, inchangé) et par un nouveau composant `MiniChart.tsx` (rendu
Recharts minimal, mêmes données réelles, taille réduite) utilisé dans
`ProposalPreview.tsx` à la place des barres CSS à hauteur fixe
(`.proposal-preview-chart-line`). `ProposalPreview` reçoit la `table`
complète (déjà le cas) et calcule sa recommandation de graphique de la
même façon que `ChartWidget`, avec la préférence du profil si présente.

## Composants impactés (résumé)

- `frontend/src/lib/questions.ts` — réécriture complète du contenu
  (nouvelles questions + 3 branches), `QuestionOption.impact` retiré.
- `frontend/src/lib/preferenceEngine.ts` — ajout `ChartPreference`/
  `chartPreference`.
- `frontend/src/lib/semantic.ts` — `findChartRecommendation` accepte une
  préférence optionnelle.
- `frontend/src/lib/chartData.ts` (nouveau) — `buildCategoryChart`/
  `buildTimeChart` extraits de `ChartWidget.tsx`.
- `frontend/src/components/app/ChartWidget.tsx` — utilise `chartData.ts`,
  accepte `preference`.
- `frontend/src/components/app/DashboardView.tsx` — transmet `chartPreference`.
- `frontend/src/components/app/GeneratedApp.tsx` — nouvelle prop `chartPreference`.
- `frontend/src/components/steps/ProposalPreview.tsx` — mini-graphique réel
  via un nouveau `MiniChart.tsx`, au lieu des barres CSS décoratives.
- `frontend/src/components/steps/QuestionCard.tsx` — retire l'affichage du
  sous-texte `impact`.
- `frontend/src/components/steps/StepQuestionnaire.tsx` — `answerImpact`
  utilise `label` au lieu de `impact`.
- `frontend/src/App.tsx` — `hasMeaningfulChart` calculé sur la table
  d'aperçu uniquement ; `buildQuestionBank` reçoit désormais aussi les
  réponses courantes pour construire les branches.
- `frontend/src/lib/questions.test.ts` — réécrit pour les nouvelles
  questions/branches.

## Hors périmètre

- Modifier `navigation`/`searchEnabled`/`sortMode`/`exportMode` autrement
  que par leurs valeurs par défaut actuelles (aucune question ne les cible
  plus, mais le mécanisme reste en place pour un usage futur).
- Sélection d'une colonne de statut précise (branche C reste une question
  oui/non/peu importe sur la fréquence de modification, pas un choix de
  colonne — nécessiterait une UI de mise en avant de colonne non conçue ici).
- Direction de tri dynamique pour l'archétype événements (reste celle
  définie dans `ARCHETYPE_PRESETS`, non affectée par la branche B).
