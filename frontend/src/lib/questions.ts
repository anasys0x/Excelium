// Banque de questions du questionnaire de pondération. Les textes sont
// localisés (FR/EN) via la fonction `t` passée à buildQuestionBank ; la
// logique (ids, deltas, branches) reste inchangée.

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

const identityQuestion = (t: TFn): Question => ({
  id: 'identity', category: 'donnees', summaryLabel: t('qb.identity.s'), text: t('qb.identity.t'),
  options: [
    { id: 'contacts', label: t('qb.identity.contacts'), delta: { archetype: { contacts: 5 }, layout: { cards: 1 } } },
    { id: 'sales', label: t('qb.identity.sales'), delta: { archetype: { sales: 5 }, layout: { table: 1 } } },
    { id: 'inventory', label: t('qb.identity.inventory'), delta: { archetype: { inventory: 5 }, layout: { cards: 1 } } },
    { id: 'events', label: t('qb.identity.events'), delta: { archetype: { events: 5 }, layout: { table: 1 } } },
  ],
})

const rowFocusQuestion = (t: TFn): Question => ({
  id: 'row-focus', category: 'donnees', summaryLabel: t('qb.rowFocus.s'), text: t('qb.rowFocus.t'),
  options: [
    { id: 'compare', label: t('qb.rowFocus.compare'), delta: { widget: { stats: 2 }, layout: { dashboard: 1 } } },
    { id: 'status', label: t('qb.rowFocus.status'), delta: { layout: { table: 1 } } },
    { id: 'visual', label: t('qb.rowFocus.visual'), delta: { layout: { gallery: 2 } } },
    { id: 'identifier', label: t('qb.rowFocus.identifier'), delta: { layout: { table: 2 } } },
  ],
})

const editQuestion = (t: TFn): Question => ({
  id: 'edit', category: 'usage', summaryLabel: t('qb.edit.s'), text: t('qb.edit.t'),
  options: [
    { id: 'yes', label: t('qb.edit.yes'), delta: { interaction: 2 } },
    { id: 'no', label: t('qb.edit.no'), delta: { interaction: -2, layout: { table: 1 } } },
  ],
})

const numbersQuestion = (t: TFn): Question => ({
  id: 'numbers', category: 'donnees', summaryLabel: t('qb.numbers.s'), text: t('qb.numbers.t'),
  options: [
    { id: 'chart', label: t('qb.numbers.chart'), delta: { widget: { chart: 3 } } },
    { id: 'total', label: t('qb.numbers.total'), delta: { widget: { stats: 3 } } },
    { id: 'consult', label: t('qb.numbers.consult'), delta: { widget: { chart: -1, stats: -1 } } },
  ],
})

const imagesQuestion = (t: TFn): Question => ({
  id: 'images', category: 'donnees', summaryLabel: t('qb.images.s'), text: t('qb.images.t'),
  options: [
    { id: 'yes', label: t('qb.images.yes'), delta: { layout: { gallery: 3 } } },
    { id: 'no', label: t('qb.images.no'), delta: { layout: { gallery: -1 } } },
  ],
})

const volumeQuestion = (t: TFn): Question => ({
  id: 'volume', category: 'usage', summaryLabel: t('qb.volume.s'), text: t('qb.volume.t'),
  options: [
    { id: 'few', label: t('qb.volume.few'), delta: { density: -2 } },
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

// ─── Branches : sous-questions insérées après leur question déclenchante ─────

const chartKindQuestion = (t: TFn): Question => ({
  id: 'chart-kind', category: 'donnees', summaryLabel: t('qb.chartKind.s'), text: t('qb.chartKind.t'),
  options: [
    { id: 'time', label: t('qb.chartKind.time'), delta: { chartPreference: 'time' } },
    { id: 'category', label: t('qb.chartKind.category'), delta: { chartPreference: 'category' } },
    { id: 'neutral', label: t('qb.chartKind.neutral'), delta: {} },
  ],
})

const statusEditableQuestion = (t: TFn): Question => ({
  id: 'status-editable', category: 'donnees', summaryLabel: t('qb.statusEditable.s'), text: t('qb.statusEditable.t'),
  options: [
    { id: 'yes', label: t('qb.statusEditable.yes'), delta: { interaction: 2 } },
    { id: 'no', label: t('qb.statusEditable.no'), delta: { interaction: 0 } },
    { id: 'neutral', label: t('qb.statusEditable.neutral'), delta: {} },
  ],
})

function focusQuestions(t: TFn): Record<string, Question> {
  return {
    contacts: {
      id: 'focus-contacts', category: 'donnees', summaryLabel: t('qb.focusContacts.s'), text: t('qb.focusContacts.t'),
      options: [
        { id: 'find', label: t('qb.focusContacts.find'), delta: { layout: { table: 2 } } },
        { id: 'cards', label: t('qb.focusContacts.cards'), delta: { layout: { cards: 2 } } },
        { id: 'visual', label: t('qb.focusContacts.visual'), delta: { layout: { gallery: 2 } } },
      ],
    },
    sales: {
      id: 'focus-sales', category: 'donnees', summaryLabel: t('qb.focusSales.s'), text: t('qb.focusSales.t'),
      options: [
        { id: 'total', label: t('qb.focusSales.total'), delta: { widget: { stats: 2 }, archetype: { sales: 2 } } },
        { id: 'evolution', label: t('qb.focusSales.evolution'), delta: { widget: { chart: 2 }, chartPreference: 'time' } },
        { id: 'who', label: t('qb.focusSales.who'), delta: { layout: { table: 2 } } },
      ],
    },
    inventory: {
      id: 'focus-inventory', category: 'donnees', summaryLabel: t('qb.focusInventory.s'), text: t('qb.focusInventory.t'),
      options: [
        { id: 'stock', label: t('qb.focusInventory.stock'), delta: { widget: { stats: 2 }, archetype: { inventory: 2 } } },
        { id: 'visual', label: t('qb.focusInventory.visual'), delta: { layout: { gallery: 2 } } },
        { id: 'prices', label: t('qb.focusInventory.prices'), delta: { widget: { chart: 2 }, chartPreference: 'category' } },
      ],
    },
    events: {
      id: 'focus-events', category: 'donnees', summaryLabel: t('qb.focusEvents.s'), text: t('qb.focusEvents.t'),
      options: [
        { id: 'upcoming', label: t('qb.focusEvents.upcoming'), delta: { layout: { table: 2 } } },
        { id: 'history', label: t('qb.focusEvents.history'), delta: { layout: { table: 1 }, widget: { stats: 1 } } },
        { id: 'calendar', label: t('qb.focusEvents.calendar'), delta: { layout: { cards: 2 } } },
      ],
    },
  }
}

function insertAfter(questions: Question[], afterId: string, toInsert: Question | null): Question[] {
  if (!toInsert) return questions
  const index = questions.findIndex((q) => q.id === afterId)
  if (index === -1) return questions
  return [...questions.slice(0, index + 1), toInsert, ...questions.slice(index + 1)]
}

export function buildQuestionBank(context: QuestionBankContext, t: TFn = (k) => k): Question[] {
  const { answers } = context

  let questions: Question[] = [
    identityQuestion(t),
    rowFocusQuestion(t),
    editQuestion(t),
    ...(context.hasMeaningfulChart ? [numbersQuestion(t)] : []),
    ...(context.hasImages ? [imagesQuestion(t)] : []),
    volumeQuestion(t),
    ...(() => {
      const primary = buildPrimaryTableQuestion(context.tables, t)
      return primary ? [primary] : []
    })(),
    themeQuestion(t),
  ]

  // Branche B : variante selon l'archétype choisi en question 1.
  const identityAnswer = answers.identity
  const focusQuestion = identityAnswer ? focusQuestions(t)[identityAnswer.optionId] ?? null : null
  questions = insertAfter(questions, 'identity', focusQuestion)

  // Branche C : ce statut est-il modifié souvent.
  const rowFocusAnswer = answers['row-focus']
  const statusFollowUp = rowFocusAnswer?.optionId === 'status' ? statusEditableQuestion(t) : null
  questions = insertAfter(questions, 'row-focus', statusFollowUp)

  // Branche A : quel type de graphique.
  const numbersAnswer = answers.numbers
  const chartKindFollowUp = numbersAnswer?.optionId === 'chart' ? chartKindQuestion(t) : null
  questions = insertAfter(questions, 'numbers', chartKindFollowUp)

  return questions
}
