// Banque de questions du questionnaire de pondération. Centrée sur le sens
// des données (quel type de table, ce qui compte dans une ligne, l'usage
// des chiffres) plutôt que sur des réglages d'application génériques.
// 3 questions déclenchent une sous-question dynamique une fois répondues
// (voir buildBranchQuestion) ; le reste est une liste statique.

import type { PreferenceDelta } from './preferenceEngine'
import type { QuestionAnswer } from './preferenceEngine'

export type QuestionCategory = 'donnees' | 'usage' | 'confort'

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

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  donnees: 'Tes données',
  usage: 'Utilisation',
  confort: 'Confort',
}

const IDENTITY_QUESTION: Question = {
  id: 'identity',
  category: 'donnees',
  summaryLabel: 'Cette table',
  text: 'Cette table représente surtout...',
  options: [
    { id: 'contacts', label: 'Des personnes/contacts', delta: { archetype: { contacts: 5 }, layout: { cards: 1 } } },
    { id: 'sales', label: 'Des ventes/transactions', delta: { archetype: { sales: 5 }, layout: { table: 1 } } },
    { id: 'inventory', label: 'Un catalogue de produits', delta: { archetype: { inventory: 5 }, layout: { cards: 1 } } },
    { id: 'events', label: 'Des événements', delta: { archetype: { events: 5 }, layout: { table: 1 } } },
  ],
}

const ROW_FOCUS_QUESTION: Question = {
  id: 'row-focus',
  category: 'donnees',
  summaryLabel: 'Une ligne',
  text: 'En regardant une ligne, tu cherches surtout...',
  options: [
    { id: 'compare', label: 'Comparer des valeurs', delta: { widget: { stats: 2 }, layout: { dashboard: 1 } } },
    { id: 'status', label: 'Voir un statut', delta: { layout: { table: 1 } } },
    { id: 'visual', label: 'Repérer visuellement', delta: { layout: { gallery: 2 } } },
    { id: 'identifier', label: "L'identifiant/le nom", delta: { layout: { table: 2 } } },
  ],
}

const EDIT_QUESTION: Question = {
  id: 'edit',
  category: 'usage',
  summaryLabel: 'Modifications',
  text: 'Tu vas modifier ces données ?',
  options: [
    { id: 'yes', label: 'Oui', delta: { interaction: 2 } },
    { id: 'no', label: "Non, c'est une référence", delta: { interaction: -2, layout: { table: 1 } } },
  ],
}

function buildNumbersQuestion(): Question {
  return {
    id: 'numbers',
    category: 'donnees',
    summaryLabel: 'Chiffres',
    text: 'Ces chiffres, tu veux les...',
    options: [
      { id: 'chart', label: 'Comparer en graphique', delta: { widget: { chart: 3 } } },
      { id: 'total', label: 'Suivre un total', delta: { widget: { stats: 3 } } },
      { id: 'consult', label: 'Juste consulter', delta: { widget: { chart: -1, stats: -1 } } },
    ],
  }
}

const IMAGES_QUESTION: Question = {
  id: 'images',
  category: 'donnees',
  summaryLabel: 'Photos',
  text: 'Les photos sont importantes ?',
  options: [
    { id: 'yes', label: 'Oui, mets-les en avant', delta: { layout: { gallery: 3 } } },
    { id: 'no', label: 'Non', delta: { layout: { gallery: -1 } } },
  ],
}

const VOLUME_QUESTION: Question = {
  id: 'volume',
  category: 'usage',
  summaryLabel: 'Volume',
  text: 'Combien de lignes environ ?',
  options: [
    { id: 'few', label: 'Peu (moins de 100)', delta: { density: -2 } },
    { id: 'many', label: 'Beaucoup (plus de 100)', delta: { density: 2, widget: { stats: 1 } } },
  ],
}

const THEME_QUESTION: Question = {
  id: 'theme',
  category: 'confort',
  summaryLabel: 'Thème',
  text: 'Thème de la webapp ?',
  options: [
    { id: 'dark', label: 'Sombre', delta: { theme: 'dark' } },
    { id: 'light', label: 'Clair', delta: { theme: 'light' } },
  ],
}

function buildPrimaryTableQuestion(
  tables: readonly { tableName: string; rowCount: number }[],
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
    id: 'primary-table',
    category: 'usage',
    summaryLabel: 'Table principale',
    text: 'Table la plus importante ?',
    options,
  }
}

// ─── Branches : sous-questions insérées après leur question déclenchante ─────

const CHART_KIND_QUESTION: Question = {
  id: 'chart-kind',
  category: 'donnees',
  summaryLabel: 'Type de graphique',
  text: 'Comparer comment ?',
  options: [
    { id: 'time', label: 'Évolution dans le temps', delta: { chartPreference: 'time' } },
    { id: 'category', label: 'Par catégorie', delta: { chartPreference: 'category' } },
    { id: 'neutral', label: 'Peu importe', delta: {} },
  ],
}

const STATUS_EDITABLE_QUESTION: Question = {
  id: 'status-editable',
  category: 'donnees',
  summaryLabel: 'Statut',
  text: 'Ce statut, tu le modifies souvent ?',
  options: [
    { id: 'yes', label: 'Oui, facilement', delta: { interaction: 2 } },
    { id: 'no', label: 'Non, juste informatif', delta: { interaction: 0 } },
    { id: 'neutral', label: 'Peu importe', delta: {} },
  ],
}

const FOCUS_QUESTIONS: Record<string, Question> = {
  contacts: {
    id: 'focus-contacts',
    category: 'donnees',
    summaryLabel: 'Priorité contacts',
    text: 'Tu veux surtout...',
    options: [
      { id: 'find', label: 'Retrouver vite quelqu\'un', delta: { layout: { table: 2 } } },
      { id: 'cards', label: 'Des fiches individuelles', delta: { layout: { cards: 2 } } },
      { id: 'visual', label: 'Une vue visuelle', delta: { layout: { gallery: 2 } } },
    ],
  },
  sales: {
    id: 'focus-sales',
    category: 'donnees',
    summaryLabel: 'Priorité ventes',
    text: 'Le plus important ?',
    options: [
      { id: 'total', label: 'Le total', delta: { widget: { stats: 2 }, archetype: { sales: 2 } } },
      { id: 'evolution', label: "L'évolution", delta: { widget: { chart: 2 }, chartPreference: 'time' } },
      { id: 'who', label: 'Qui a acheté quoi', delta: { layout: { table: 2 } } },
    ],
  },
  inventory: {
    id: 'focus-inventory',
    category: 'donnees',
    summaryLabel: 'Priorité catalogue',
    text: 'Tu veux surtout...',
    options: [
      { id: 'stock', label: 'Suivre le stock', delta: { widget: { stats: 2 }, archetype: { inventory: 2 } } },
      { id: 'visual', label: 'Mettre en valeur visuellement', delta: { layout: { gallery: 2 } } },
      { id: 'prices', label: 'Comparer les prix', delta: { widget: { chart: 2 }, chartPreference: 'category' } },
    ],
  },
  events: {
    id: 'focus-events',
    category: 'donnees',
    summaryLabel: 'Priorité événements',
    text: 'Tu veux surtout...',
    options: [
      { id: 'upcoming', label: 'Les prochains rendez-vous', delta: { layout: { table: 2 } } },
      { id: 'history', label: "L'historique", delta: { layout: { table: 1 }, widget: { stats: 1 } } },
      { id: 'calendar', label: 'Une vue calendrier', delta: { layout: { cards: 2 } } },
    ],
  },
}

// Insère la sous-question déclenchée par `answers[triggerId]` (si elle
// existe et correspond à `whenOptionId`, ou à l'une des clés de `variants`)
// juste après `afterId` dans la liste. Ne modifie rien si non déclenchée.
function insertAfter(questions: Question[], afterId: string, toInsert: Question | null): Question[] {
  if (!toInsert) return questions
  const index = questions.findIndex((q) => q.id === afterId)
  if (index === -1) return questions
  return [...questions.slice(0, index + 1), toInsert, ...questions.slice(index + 1)]
}

export function buildQuestionBank(context: QuestionBankContext): Question[] {
  const { answers } = context

  let questions: Question[] = [
    IDENTITY_QUESTION,
    ROW_FOCUS_QUESTION,
    EDIT_QUESTION,
    ...(context.hasMeaningfulChart ? [buildNumbersQuestion()] : []),
    ...(context.hasImages ? [IMAGES_QUESTION] : []),
    VOLUME_QUESTION,
    ...(() => {
      const primary = buildPrimaryTableQuestion(context.tables)
      return primary ? [primary] : []
    })(),
    THEME_QUESTION,
  ]

  // Branche B : variante selon l'archétype choisi en question 1.
  const identityAnswer = answers.identity
  const focusQuestion = identityAnswer ? FOCUS_QUESTIONS[identityAnswer.optionId] ?? null : null
  questions = insertAfter(questions, 'identity', focusQuestion)

  // Branche C : ce statut est-il modifié souvent.
  const rowFocusAnswer = answers['row-focus']
  const statusFollowUp = rowFocusAnswer?.optionId === 'status' ? STATUS_EDITABLE_QUESTION : null
  questions = insertAfter(questions, 'row-focus', statusFollowUp)

  // Branche A : quel type de graphique.
  const numbersAnswer = answers.numbers
  const chartKindFollowUp = numbersAnswer?.optionId === 'chart' ? CHART_KIND_QUESTION : null
  questions = insertAfter(questions, 'numbers', chartKindFollowUp)

  return questions
}
