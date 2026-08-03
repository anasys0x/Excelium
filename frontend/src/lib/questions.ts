// Banque de questions du questionnaire de pondération, organisée en arbre :
// une question racine sur le type de vue voulu (tableau de bord / tableau
// classique / avec graphique), puis une séquence de 3-4 questions de
// comportement propres à la branche choisie, puis une fin commune à toutes
// les branches. Aucune catégorisation de domaine (contacts/ventes/...) :
// l'archétype reste entièrement piloté par la détection automatique
// (archetype.ts). Les textes sont localisés (FR/EN) via `t`.

import type { PreferenceDelta } from './preferenceEngine'
import type { QuestionAnswer } from './preferenceEngine'
import { isMetricRole } from './semantic'
import type { AnalyzedColumn } from './semantic'

export type QuestionCategory = 'donnees' | 'usage' | 'confort'

type TFn = (key: string, vars?: Record<string, string | number>) => string

export interface QuestionOption {
  id: string
  label: string
  delta: PreferenceDelta
}

export interface Question {
  id: string
  category: QuestionCategory
  summaryLabel: string
  text: string
  options: QuestionOption[]
}

export interface QuestionBankContext {
  tables: readonly { tableName: string; rowCount: number; analyzed: readonly AnalyzedColumn[] }[]
  hasImages: boolean
  hasMeaningfulChart: boolean
  answers: Record<string, QuestionAnswer>
}

// Colonnes de la table réellement prévisualisée (celle choisie en réponse à
// "primary-table", sinon la première) : permet de construire des questions
// qui citent de vraies colonnes détectées plutôt que des catégories génériques.
function primaryColumns(context: QuestionBankContext): readonly AnalyzedColumn[] {
  const primaryName = context.answers['primary-table']?.delta.primaryTableName
  const table = context.tables.find((t) => t.tableName === primaryName) ?? context.tables[0]
  return table?.analyzed ?? []
}

function metricColumns(context: QuestionBankContext, limit = 3): AnalyzedColumn[] {
  return primaryColumns(context).filter((c) => isMetricRole(c.role)).slice(0, limit)
}

// ─── Racine ──────────────────────────────────────────────────────────────────

const layoutRootQuestion = (t: TFn): Question => ({
  id: 'layout-root', category: 'donnees', summaryLabel: t('qb.layoutRoot.s'), text: t('qb.layoutRoot.t'),
  options: [
    { id: 'dashboard', label: t('qb.layoutRoot.dashboard'), delta: { layout: { dashboard: 4 } } },
    { id: 'table', label: t('qb.layoutRoot.table'), delta: { layout: { table: 4 } } },
    { id: 'chart', label: t('qb.layoutRoot.chart'), delta: { layout: { dashboard: 3 }, widget: { chart: 3 } } },
  ],
})

// ─── Branche A : Vue chiffrée ────────────────────────────────────────────

// Colonne à suivre en priorité : construite uniquement à partir des vraies
// colonnes numériques détectées (prix, montant, note...). Appelée seulement
// quand metricColumns(context) n'est pas vide (cf. dashboardBranchQuestions) :
// sans colonne numérique réelle, il n'y a rien de honnête à proposer comme
// "Total" ou "Tendance", donc pas de repli générique ici.
const focusMetricQuestion = (context: QuestionBankContext, t: TFn): Question => {
  const columns = metricColumns(context)

  const options: QuestionOption[] = columns.map((c) => ({
    id: `metric-${c.name}`, label: c.name, delta: { widget: { stats: 3 } },
  }))
  // Échappatoire : rien à suivre pour cette table (pas obligé de forcer un
  // chiffre sur un tableau de bord qui n'en a pas besoin).
  options.push({ id: 'none', label: t('qb.focusMetric.none'), delta: {} })

  return { id: 'focus-metric', category: 'donnees', summaryLabel: t('qb.focusMetric.s'), text: t('qb.focusMetric.t'), options }
}

// Se spécialise selon la colonne choisie juste avant : ne propose une
// évolution dans le temps ou une répartition que si une vraie colonne date
// ou catégorie a été détectée dans la même table.
const metricViewQuestion = (context: QuestionBankContext, t: TFn): Question => {
  const columns = primaryColumns(context)
  const dateColumn = columns.find((c) => c.role === 'date')
  const categoryColumn = columns.find((c) => c.role === 'category' || c.role === 'status')

  const options: QuestionOption[] = [
    { id: 'total', label: t('qb.metricView.total'), delta: { widget: { stats: 3 } } },
  ]
  if (dateColumn) {
    options.push({ id: 'time', label: t('qb.metricView.time'), delta: { widget: { chart: 3 }, chartPreference: 'time' } })
  }
  if (categoryColumn) {
    options.push({
      id: 'category',
      label: t('qb.metricView.category', { column: categoryColumn.name }),
      delta: { widget: { chart: 3 }, chartPreference: 'category' },
    })
  }
  if (options.length === 1) {
    options.push({ id: 'trend', label: t('qb.focusMetric.trend'), delta: { widget: { chart: 3 }, chartPreference: 'time' } })
  }

  return { id: 'metric-view', category: 'donnees', summaryLabel: t('qb.metricView.s'), text: t('qb.metricView.t'), options }
}

// ─── Branche B : Tableau classique ──────────────────────────────────────────

const editQuestion = (t: TFn): Question => ({
  id: 'edit', category: 'usage', summaryLabel: t('qb.edit.s'), text: t('qb.edit.t'),
  options: [
    { id: 'yes', label: t('qb.edit.yes'), delta: { interaction: 2 } },
    { id: 'no', label: t('qb.edit.no'), delta: { interaction: -2, layout: { table: 1 } } },
  ],
})

const searchQuestion = (t: TFn): Question => ({
  id: 'search', category: 'usage', summaryLabel: t('qb.search.s'), text: t('qb.search.t'),
  options: [
    { id: 'yes', label: t('qb.search.yes'), delta: { searchEnabled: true } },
    { id: 'no', label: t('qb.search.no'), delta: { searchEnabled: false } },
  ],
})

const rowPriorityQuestion = (t: TFn): Question => ({
  id: 'row-priority', category: 'donnees', summaryLabel: t('qb.rowPriority.s'), text: t('qb.rowPriority.t'),
  options: [
    { id: 'identifier', label: t('qb.rowPriority.identifier'), delta: { layout: { table: 2 } } },
    { id: 'status', label: t('qb.rowPriority.status'), delta: { layout: { table: 1 } } },
    { id: 'compare', label: t('qb.rowPriority.compare'), delta: { widget: { stats: 2 }, layout: { dashboard: 1 } } },
  ],
})

const navigationPrefQuestion = (t: TFn): Question => ({
  id: 'navigation-pref', category: 'confort', summaryLabel: t('qb.navigationPref.s'), text: t('qb.navigationPref.t'),
  options: [
    { id: 'tabs', label: t('qb.navigationPref.tabs'), delta: { navigation: 'tabs' } },
    { id: 'sidebar', label: t('qb.navigationPref.sidebar'), delta: { navigation: 'sidebar' } },
  ],
})

// ─── Branche C : Avec graphique ─────────────────────────────────────────────

// Quelle donnée visualiser : construite à partir des vraies colonnes
// numériques détectées, comme focus-metric. Sans colonne numérique, il n'y a
// rien de pertinent à choisir précisément : repli sur l'ancien choix
// générique (temps/catégorie/peu importe), sans question de dimension à la
// suite (cf. chartBranchQuestions).
const chartMetricQuestion = (context: QuestionBankContext, t: TFn): Question => {
  const columns = metricColumns(context)
  if (columns.length === 0) {
    return {
      id: 'chart-kind', category: 'donnees', summaryLabel: t('qb.chartKind.s'), text: t('qb.chartKind.t'),
      options: [
        { id: 'time', label: t('qb.chartKind.time'), delta: { chartPreference: 'time' } },
        { id: 'category', label: t('qb.chartKind.category'), delta: { chartPreference: 'category' } },
        { id: 'neutral', label: t('qb.chartKind.neutral'), delta: {} },
      ],
    }
  }
  return {
    id: 'chart-metric', category: 'donnees', summaryLabel: t('qb.chartMetric.s'), text: t('qb.chartMetric.t'),
    options: columns.map((c) => ({
      id: `metric-${c.name}`, label: c.name, delta: { widget: { chart: 3 }, chartMetricName: c.name },
    })),
  }
}

// Selon quoi la répartir : ne propose "dans le temps"/"par <colonne>" que si
// une vraie colonne date/catégorie existe dans la table — se spécialise donc
// à la fois sur la donnée réelle et sur la colonne choisie juste avant.
const chartDimensionQuestion = (context: QuestionBankContext, t: TFn): Question => {
  const columns = primaryColumns(context)
  const dateColumn = columns.find((c) => c.role === 'date')
  const categoryColumn = columns.find((c) => c.role === 'category' || c.role === 'status')

  const options: QuestionOption[] = []
  if (dateColumn) {
    options.push({
      id: 'time', label: t('qb.chartDimension.time'),
      delta: { chartPreference: 'time', chartDimensionName: dateColumn.name },
    })
  }
  if (categoryColumn) {
    options.push({
      id: 'category', label: t('qb.chartDimension.category', { column: categoryColumn.name }),
      delta: { chartPreference: 'category', chartDimensionName: categoryColumn.name },
    })
  }
  options.push({ id: 'neutral', label: t('qb.chartDimension.neutral'), delta: {} })

  return { id: 'chart-dimension', category: 'donnees', summaryLabel: t('qb.chartDimension.s'), text: t('qb.chartDimension.t'), options }
}

const alsoStatsQuestion = (t: TFn): Question => ({
  id: 'also-stats', category: 'donnees', summaryLabel: t('qb.alsoStats.s'), text: t('qb.alsoStats.t'),
  options: [
    { id: 'yes', label: t('qb.alsoStats.yes'), delta: { widget: { stats: 2 } } },
    { id: 'no', label: t('qb.alsoStats.no'), delta: {} },
  ],
})

const sortPrefQuestion = (t: TFn): Question => ({
  id: 'sort-pref', category: 'confort', summaryLabel: t('qb.sortPref.s'), text: t('qb.sortPref.t'),
  options: [
    { id: 'source', label: t('qb.sortPref.source'), delta: { sortMode: 'source' } },
    { id: 'alphabetical', label: t('qb.sortPref.alphabetical'), delta: { sortMode: 'alphabetical' } },
  ],
})

// ─── Fin commune ─────────────────────────────────────────────────────────────
// Le volume de lignes et le thème ne sont plus demandés en amont : le thème
// se change directement dans la webapp générée (bouton dans l'en-tête), et
// le volume n'apportait pas de signal assez utile pour justifier une question.

function buildPrimaryTableQuestion(
  tables: readonly { tableName: string; rowCount: number }[],
  t: TFn,
): Question | null {
  if (tables.length < 2) return null

  // Toutes les tables sont proposées (pas de plafond arbitraire) : rien ne
  // garantit que la table la plus « importante » pour la personne soit
  // celle avec le plus de lignes.
  const options = [...tables]
    .sort((a, b) => b.rowCount - a.rowCount)
    .map((table) => ({
      id: `primary-${table.tableName}`,
      label: table.tableName,
      delta: { primaryTableName: table.tableName },
    }))

  return {
    id: 'primary-table', category: 'usage', summaryLabel: t('qb.primary.s'), text: t('qb.primary.t'),
    options,
  }
}

// ─── Composition de l'arbre ──────────────────────────────────────────────────

function chartBranchQuestions(context: QuestionBankContext, t: TFn): Question[] {
  const metricQuestion = chartMetricQuestion(context, t)
  // Pas de colonne numérique détectée : metricQuestion est déjà le repli
  // générique (temps/catégorie/peu importe), une question de dimension à la
  // suite n'apporterait rien de plus précis.
  if (metricQuestion.id === 'chart-kind') return [metricQuestion, alsoStatsQuestion(t), sortPrefQuestion(t)]
  return [metricQuestion, chartDimensionQuestion(context, t), alsoStatsQuestion(t), sortPrefQuestion(t)]
}

function dashboardBranchQuestions(context: QuestionBankContext, t: TFn): Question[] {
  // Aucune colonne numérique réelle dans la table (ex : une feuille
  // d'employés sans montant/quantité/note) : il n'y a rien à totaliser ou à
  // suivre, donc pas de question dessus. Le tableau de bord se rabat sur le
  // nombre d'enregistrements et la répartition par catégorie (DashboardView).
  if (metricColumns(context).length === 0) return []

  const focusMetric = focusMetricQuestion(context, t)
  // "Rien de précis" : pas de colonne choisie, donc metric-view (qui se
  // spécialise sur cette colonne) n'a plus de sens à poser.
  if (context.answers['focus-metric']?.optionId === 'none') return [focusMetric]
  return [focusMetric, metricViewQuestion(context, t)]
}

function branchQuestions(branch: string | undefined, context: QuestionBankContext, t: TFn): Question[] {
  if (branch === 'dashboard') return dashboardBranchQuestions(context, t)
  if (branch === 'table') return [searchQuestion(t), rowPriorityQuestion(t), navigationPrefQuestion(t)]
  if (branch === 'chart') return chartBranchQuestions(context, t)
  return []
}

// `edit` (modifier les données ?) pilote canEdit (bouton "+ Ajouter", formulaires) —
// une question universelle, pas propre à la branche "Tableau classique" :
// posée juste après la racine, avant les questions propres à chaque branche.
// "Table principale" est posée avant les questions de branche : focus-metric,
// metric-view, chart-metric et chart-dimension lisent les colonnes réelles de
// cette table (via primaryColumns) — il faut donc connaître la réponse avant
// de les construire, sinon elles retombent sur la première table du classeur,
// qui n'est pas forcément celle qui intéresse la personne.
export function buildQuestionBank(context: QuestionBankContext, t: TFn = (k) => k): Question[] {
  const branch = context.answers['layout-root']?.optionId
  const primary = buildPrimaryTableQuestion(context.tables, t)

  return [
    layoutRootQuestion(t),
    editQuestion(t),
    ...(primary ? [primary] : []),
    ...branchQuestions(branch, context, t),
  ]
}
