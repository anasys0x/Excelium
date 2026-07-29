# Questionnaire en arbre : layout d'abord, branches profondes

Date : 2026-07-29
Statut : Validé, implémentation directe (pas de plan séparé)

## Contexte

Le questionnaire actuel (`frontend/src/lib/questions.ts`) part d'une
question de catégorisation de domaine (« Cette table représente
surtout... » : contacts/ventes/catalogue/événements). Problème identifié :
cette catégorisation force un choix qui peut ne correspondre à aucune
donnée réelle (ex. un tableau de chimie), et n'importe quelle option
« Autre chose » ne fait que masquer le problème sans le résoudre.

Nouvelle approche : la première question porte sur le **type de vue
voulu**, pas sur le domaine des données. L'archétype (contacts/ventes/
catalogue/événements) est entièrement retiré du questionnaire — la
détection automatique existante (`computeArchetypeScores`/
`detectArchetype`, regex sur noms de colonnes) reste seule responsable de
ce signal, exactement comme avant l'introduction du questionnaire.

Le reste des questions se réorganise en arbre : la réponse à la question
racine détermine une séquence de 3 à 4 questions de comportement
spécifiques à la branche, suivie d'une fin commune à toutes les branches.

## Arbre complet

```
Q1 (racine) id: layout-root — "Quel type de vue veux-tu pour cette table ?"
├── A. Tableau de bord   → branche dashboard (3 questions)
├── B. Tableau classique → branche table (4 questions)
└── C. Avec graphique    → branche chart (3 questions)

Puis, quelle que soit la branche : Volume → Table principale (si ≥2
tables) → Thème.
```

### Racine — `layout-root`

| Option | id | Delta |
|---|---|---|
| Tableau de bord | `dashboard` | `layout.dashboard:+4` |
| Tableau classique | `table` | `layout.table:+4` |
| Avec graphique | `chart` | `layout.dashboard:+3, widget.chart:+3` |

Note : « Avec graphique » pousse aussi `layout.dashboard`, car le widget
graphique ne s'affiche que dans ce layout (`DashboardView`/`ChartWidget`,
inchangé) — un graphique sans le layout qui l'affiche serait invisible.

### Branche A — Tableau de bord (id préfixe implicite, 3 questions)

1. `focus-metric` — « Tu veux surtout suivre... ? »
   - Des totaux/moyennes (`total`) — `widget.stats:+3`
   - Une tendance dans le temps (`trend`) — `widget.chart:+3, chartPreference:'time'`
   - Une comparaison par catégorie (`category`) — `widget.chart:+3, chartPreference:'category'`
2. `consult-frequency` — « Tu consultes ce tableau de bord... ? »
   - Plusieurs fois par jour (`often`) — `density:+2`
   - Occasionnellement (`rarely`) — `density:-2`
3. `exports-pref` — « Exports à proposer ? »
   - Excel + SQL (`all`) — `exportMode:'all'`
   - Excel seulement (`excel`) — `exportMode:'excel'`
   - Aucun (`none`) — `exportMode:'none'`

### Branche B — Tableau classique (4 questions)

1. `edit` — « Tu vas modifier ces données souvent ? »
   - Oui (`yes`) — `interaction:+2`
   - Non (`no`) — `interaction:-2, layout.table:+1`
2. `search` — « Tu dois souvent rechercher une ligne précise ? »
   - Oui (`yes`) — `searchEnabled:true`
   - Non (`no`) — `searchEnabled:false`
3. `row-priority` — « Dans une ligne, le plus important c'est... ? »
   - L'identifiant/le nom (`identifier`) — `layout.table:+2`
   - Un statut (`status`) — `layout.table:+1`
   - Comparer des valeurs (`compare`) — `widget.stats:+2, layout.dashboard:+1`
4. `navigation-pref` — « Navigation entre plusieurs tables ? »
   - Onglets en haut (`tabs`) — `navigation:'tabs'`
   - Menu latéral (`sidebar`) — `navigation:'sidebar'`

### Branche C — Avec graphique (3 questions)

1. `chart-kind` — « Comparer comment ? »
   - Évolution dans le temps (`time`) — `chartPreference:'time'`
   - Par catégorie (`category`) — `chartPreference:'category'`
   - Peu importe (`neutral`) — pas de poids
2. `also-stats` — « Tu veux aussi des totaux à côté du graphique ? »
   - Oui (`yes`) — `widget.stats:+2`
   - Non (`no`) — pas de poids
3. `sort-pref` — « Ordre des données au départ ? »
   - Comme le fichier original (`source`) — `sortMode:'source'`
   - Trié alphabétiquement (`alphabetical`) — `sortMode:'alphabetical'`

### Fin commune (toutes branches, inchangée dans son mécanisme)

- `volume` — Peu (`few`, `density:-1`) / Beaucoup (`many`, `density:+2, widget.stats:+1`)
- `primary-table` — dynamique, noms réels des tables, seulement si ≥2 tables (mécanisme inchangé)
- `theme` — Sombre (`dark`, `theme:'dark'`) / Clair (`light`, `theme:'light'`)

## Mécanique de construction (remplace `insertAfter`)

L'ancien mécanisme (`insertAfter`, une seule sous-question insérée après
son déclencheur) est remplacé par une composition de séquences complètes :

```typescript
export function buildQuestionBank(context: QuestionBankContext, t: TFn = (k) => k): Question[] {
  const branch = context.answers['layout-root']?.optionId // 'dashboard' | 'table' | 'chart' | undefined

  const branchQuestions: Question[] =
    branch === 'dashboard' ? [focusMetricQuestion(t), consultFrequencyQuestion(t), exportsPrefQuestion(t)] :
    branch === 'table'     ? [editQuestion(t), searchQuestion(t), rowPriorityQuestion(t), navigationPrefQuestion(t)] :
    branch === 'chart'     ? [chartKindQuestion(t), alsoStatsQuestion(t), sortPrefQuestion(t)] :
    []

  const primary = buildPrimaryTableQuestion(context.tables, t)

  return [
    layoutRootQuestion(t),
    ...branchQuestions,
    volumeQuestion(t),
    ...(primary ? [primary] : []),
    themeQuestion(t),
  ]
}
```

Tant que la racine n'est pas répondue, seules les questions de fin commune
suivent (comportement déjà existant : le nombre total de questions varie
selon les réponses). Si l'utilisateur change sa réponse à la racine après
avoir répondu à des questions de branche, l'ancienne branche disparaît de
la liste ; ses réponses orphelines sont ignorées par le mécanisme existant
(`getValidAnswers`/`validAnswer` ne comptent que les réponses dont l'id
d'option existe encore parmi les options de la question courante du banc
actuel — inchangé).

## Champs `PreferenceProfile` déjà existants mais jusqu'ici jamais pilotés

`searchEnabled`, `sortMode`, `navigation`, `exportMode` existent déjà dans
`preferenceEngine.ts` (valeurs par défaut appliquées, mécanisme de
fusion déjà en place) mais aucune question ne les ciblait depuis leur
retrait lors de la refonte du 2026-07-15. Ce lot les remet en usage réel
sans aucun changement de `preferenceEngine.ts`, `uiProposals.ts`,
`session.ts` ni `StepUiProposals.tsx` — uniquement de nouvelles questions
qui définissent des deltas sur des champs déjà consommés en aval.

## Suppressions

- `identityQuestion`, `focusQuestions` (contacts/sales/inventory/events),
  et toute référence à l'archétype dans `questions.ts`.
- `rowFocusQuestion`, `statusEditableQuestion`, `numbersQuestion`,
  `imagesQuestion` (remplacées par l'arbre ci-dessus ; leur rôle est repris
  différemment par les branches B et C).
- `insertAfter` et son usage dans `buildQuestionBank`.
- Les clés i18n `qb.identity.*`, `qb.rowFocus.*`, `qb.numbers.*`,
  `qb.images.*`, `qb.statusEditable.*`, `qb.focusContacts.*`,
  `qb.focusSales.*`, `qb.focusInventory.*`, `qb.focusEvents.*`
  (FR et EN) sont retirées de `frontend/src/lib/i18n.tsx`.

## Ce qui ne change pas

- `preferenceEngine.ts`, `uiProposals.ts`, `session.ts`,
  `StepQuestionnaire.tsx`, `QuestionCard.tsx`, `ProposalPreview.tsx` :
  aucun changement de code. Ces composants opèrent déjà sur `Question[]`
  générique et ne connaissent pas la structure interne de l'arbre.
- `hasImages`/`hasMeaningfulChart` restent calculés dans `App.tsx` mais ne
  conditionnent plus aucune question (elles ne sont plus utilisées par
  `buildQuestionBank` après ce lot) — conservées car utilisées ailleurs
  (aperçu, `buildUiProposals`).
- Le mécanisme de la question dynamique `primary-table` (plafond à 3
  tables triées par nombre de lignes) est inchangé.

## Tests

`frontend/src/lib/questions.test.ts` réécrit :
- Sans réponse à `layout-root` : seules `layout-root`, `volume`,
  (`primary-table` si ≥2 tables), `theme` apparaissent.
- Réponse `dashboard` : insère exactement `focus-metric`,
  `consult-frequency`, `exports-pref` entre la racine et la fin commune.
- Réponse `table` : insère les 4 questions de la branche B, dans l'ordre.
- Réponse `chart` : insère les 3 questions de la branche C, dans l'ordre.
- Changer la réponse à `layout-root` remplace entièrement la séquence de
  branche (aucun résidu de l'ancienne branche).
- Chaque question a entre 2 et 4 options (règle déjà en vigueur).

## Hors périmètre

- Toute logique de tri dynamique liée à `sortMode`/`navigation` côté
  rendu final (`GeneratedApp.tsx` consomme déjà ces champs via
  `appSeed`/props existants depuis le lot précédent — à vérifier mais pas
  à modifier ici sauf régression constatée).
- Ajout d'une librairie de graphiques supplémentaire (explicitement refusé
  par l'utilisateur — Recharts reste la seule).
