// Banque de questions du questionnaire de pondération, organisée en arbre :
// une question racine sur le type de vue voulu (tableau de bord / tableau
// classique / avec graphique), puis une séquence de 3-4 questions de
// comportement propres à la branche choisie, puis une fin commune à toutes
// les branches. Aucune catégorisation de domaine (contacts/ventes/...) :
// l'archétype reste entièrement piloté par la détection automatique
// (archetype.ts). Les textes sont localisés (FR/EN) via `t`.

import type { PreferenceDelta } from './preferenceEngine'
import type { QuestionAnswer } from './preferenceEngine'

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
  tables: readonly { tableName: string; rowCount: number }[]
  hasImages: boolean
  hasMeaningfulChart: boolean
  answers: Record<string, QuestionAnswer>
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

// ─── Branche A : Tableau de bord ────────────────────────────────────────────

const focusMetricQuestion = (t: TFn): Question => ({
  id: 'focus-metric', category: 'donnees', summaryLabel: t('qb.focusMetric.s'), text: t('qb.focusMetric.t'),
  options: [
    { id: 'total', label: t('qb.focusMetric.total'), delta: { widget: { stats: 3 } } },
    { id: 'trend', label: t('qb.focusMetric.trend'), delta: { widget: { chart: 3 }, chartPreference: 'time' } },
    { id: 'category', label: t('qb.focusMetric.category'), delta: { widget: { chart: 3 }, chartPreference: 'category' } },
  ],
})

const consultFrequencyQuestion = (t: TFn): Question => ({
  id: 'consult-frequency', category: 'usage', summaryLabel: t('qb.consultFrequency.s'), text: t('qb.consultFrequency.t'),
  options: [
    { id: 'often', label: t('qb.consultFrequency.often'), delta: { density: 2 } },
    { id: 'rarely', label: t('qb.consultFrequency.rarely'), delta: { density: -2 } },
  ],
})

const exportsPrefQuestion = (t: TFn): Question => ({
  id: 'exports-pref', category: 'confort', summaryLabel: t('qb.exportsPref.s'), text: t('qb.exportsPref.t'),
  options: [
    { id: 'all', label: t('qb.exportsPref.all'), delta: { exportMode: 'all' } },
    { id: 'excel', label: t('qb.exportsPref.excel'), delta: { exportMode: 'excel' } },
    { id: 'none', label: t('qb.exportsPref.none'), delta: { exportMode: 'none' } },
  ],
})

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

const chartKindQuestion = (t: TFn): Question => ({
  id: 'chart-kind', category: 'donnees', summaryLabel: t('qb.chartKind.s'), text: t('qb.chartKind.t'),
  options: [
    { id: 'time', label: t('qb.chartKind.time'), delta: { chartPreference: 'time' } },
    { id: 'category', label: t('qb.chartKind.category'), delta: { chartPreference: 'category' } },
    { id: 'neutral', label: t('qb.chartKind.neutral'), delta: {} },
  ],
})

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

const volumeQuestion = (t: TFn): Question => ({
  id: 'volume', category: 'usage', summaryLabel: t('qb.volume.s'), text: t('qb.volume.t'),
  options: [
    { id: 'few', label: t('qb.volume.few'), delta: { density: -1 } },
    { id: 'many', label: t('qb.volume.many'), delta: { density: 2, widget: { stats: 1 } } },
  ],
})

const themeQuestion = (t: TFn): Question => ({
  id: 'theme', category: 'confort', summaryLabel: t('qb.theme.s'), text: t('qb.theme.t'),
  options: [
    { id: 'dark', label: t('qb.theme.dark'), delta: { theme: 'dark' } },
    { id: 'light', label: t('qb.theme.light'), delta: { theme: 'light' } },
  ],
})

function buildPrimaryTableQuestion(
  tables: readonly { tableName: string; rowCount: number }[],
  t: TFn,
): Question | null {
  if (tables.length < 2) return null

  const options = [...tables]
    .sort((a, b) => b.rowCount - a.rowCount)
    .slice(0, 3)
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

function branchQuestions(branch: string | undefined, t: TFn): Question[] {
  if (branch === 'dashboard') return [focusMetricQuestion(t), consultFrequencyQuestion(t), exportsPrefQuestion(t)]
  if (branch === 'table') return [searchQuestion(t), rowPriorityQuestion(t), navigationPrefQuestion(t)]
  if (branch === 'chart') return [chartKindQuestion(t), alsoStatsQuestion(t), sortPrefQuestion(t)]
  return []
}

// `edit` (modifier les données ?) pilote canEdit (bouton "+ Ajouter", formulaires) —
// une question universelle, pas propre à la branche "Tableau classique" :
// posée juste après la racine, avant les questions propres à chaque branche.
export function buildQuestionBank(context: QuestionBankContext, t: TFn = (k) => k): Question[] {
  const branch = context.answers['layout-root']?.optionId
  const primary = buildPrimaryTableQuestion(context.tables, t)

  return [
    layoutRootQuestion(t),
    editQuestion(t),
    ...branchQuestions(branch, t),
    volumeQuestion(t),
    ...(primary ? [primary] : []),
    themeQuestion(t),
  ]
}
