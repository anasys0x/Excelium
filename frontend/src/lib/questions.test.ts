import { describe, expect, it } from 'vitest'
import { buildQuestionBank } from './questions'
import type { QuestionAnswer } from './preferenceEngine'

const ONE_TABLE = [{ tableName: 'Clients', rowCount: 12 }]
const TWO_TABLES = [
  { tableName: 'Produits', rowCount: 20 },
  { tableName: 'Commandes', rowCount: 35 },
]

function answer(questionId: string, optionId: string): Record<string, QuestionAnswer> {
  return { [questionId]: { questionId, optionId, delta: {} } }
}

describe('buildQuestionBank — racine et fin commune', () => {
  it('sans réponse à la racine : seules layout-root, volume, theme apparaissent (une table)', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: {},
    })
    expect(questions.map((q) => q.id)).toEqual(['layout-root', 'volume', 'theme'])
  })

  it('sans réponse à la racine, avec deux tables : primary-table apparaît avant theme', () => {
    const questions = buildQuestionBank({
      tables: TWO_TABLES,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: {},
    })
    expect(questions.map((q) => q.id)).toEqual(['layout-root', 'volume', 'primary-table', 'theme'])
  })

  it('chaque question a entre 2 et 4 options, quelle que soit la branche', () => {
    for (const branch of ['dashboard', 'table', 'chart']) {
      const questions = buildQuestionBank({
        tables: TWO_TABLES,
        hasImages: false,
        hasMeaningfulChart: false,
        answers: answer('layout-root', branch),
      })
      for (const question of questions) {
        expect(question.options.length).toBeGreaterThanOrEqual(2)
        expect(question.options.length).toBeLessThanOrEqual(4)
      }
    }
  })

  it('primary-table plafonne à 3 options triées par nombre de lignes décroissant', () => {
    const questions = buildQuestionBank({
      tables: [
        { tableName: 'a', rowCount: 1 },
        { tableName: 'b', rowCount: 5 },
        { tableName: 'c', rowCount: 3 },
        { tableName: 'd', rowCount: 2 },
      ],
      hasImages: false,
      hasMeaningfulChart: false,
      answers: {},
    })
    const primaryTable = questions.find((q) => q.id === 'primary-table')!
    expect(primaryTable.options.map((o) => o.label)).toEqual(['b', 'c', 'd'])
  })
})

describe('buildQuestionBank — branche A (tableau de bord)', () => {
  it('répondre "dashboard" insère focus-metric, consult-frequency, exports-pref juste après la racine', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('layout-root', 'dashboard'),
    })
    expect(questions.map((q) => q.id)).toEqual([
      'layout-root', 'focus-metric', 'consult-frequency', 'exports-pref', 'volume', 'theme',
    ])
  })
})

describe('buildQuestionBank — branche B (tableau classique)', () => {
  it('répondre "table" insère edit, search, row-priority, navigation-pref juste après la racine', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('layout-root', 'table'),
    })
    expect(questions.map((q) => q.id)).toEqual([
      'layout-root', 'edit', 'search', 'row-priority', 'navigation-pref', 'volume', 'theme',
    ])
  })
})

describe('buildQuestionBank — branche C (avec graphique)', () => {
  it('répondre "chart" insère chart-kind, also-stats, sort-pref juste après la racine', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('layout-root', 'chart'),
    })
    expect(questions.map((q) => q.id)).toEqual([
      'layout-root', 'chart-kind', 'also-stats', 'sort-pref', 'volume', 'theme',
    ])
  })
})

describe('buildQuestionBank — changement de branche', () => {
  it('changer la réponse à la racine remplace entièrement la séquence de branche', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('layout-root', 'chart'),
    })
    const ids = questions.map((q) => q.id)
    expect(ids).toContain('chart-kind')
    expect(ids).not.toContain('edit')
    expect(ids).not.toContain('focus-metric')
  })

  it("aucune question d'archétype (contacts/ventes/catalogue/événements) n'existe plus dans l'arbre", () => {
    const removedIds = ['identity', 'focus-contacts', 'focus-sales', 'focus-inventory', 'focus-events', 'row-focus', 'numbers', 'images', 'status-editable']
    for (const branch of ['dashboard', 'table', 'chart']) {
      const questions = buildQuestionBank({
        tables: ONE_TABLE,
        hasImages: false,
        hasMeaningfulChart: false,
        answers: answer('layout-root', branch),
      })
      expect(questions.some((q) => removedIds.includes(q.id))).toBe(false)
    }
  })
})
