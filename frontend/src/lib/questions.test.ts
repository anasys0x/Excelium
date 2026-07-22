import { describe, expect, it } from 'vitest'
import { buildQuestionBank } from './questions'
import type { QuestionAnswer } from './preferenceEngine'

const ONE_TABLE = [{ tableName: 'Clients', rowCount: 12 }]
const TWO_TABLES = [
  { tableName: 'Produits', rowCount: 20 },
  { tableName: 'Commandes', rowCount: 35 },
]

describe('buildQuestionBank — banc de base', () => {
  it("sans image, sans graphique pertinent et une seule table : identity, row-focus, edit, volume, theme", () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: {},
    })
    expect(questions.map((q) => q.id)).toEqual(['identity', 'row-focus', 'edit', 'volume', 'theme'])
  })

  it('avec image, graphique pertinent et deux tables : ajoute numbers, images, primary-table', () => {
    const questions = buildQuestionBank({
      tables: TWO_TABLES,
      hasImages: true,
      hasMeaningfulChart: true,
      answers: {},
    })
    expect(questions.map((q) => q.id)).toEqual([
      'identity', 'row-focus', 'edit', 'numbers', 'images', 'volume', 'primary-table', 'theme',
    ])
  })

  it('chaque question a entre 2 et 4 options', () => {
    const questions = buildQuestionBank({
      tables: TWO_TABLES,
      hasImages: true,
      hasMeaningfulChart: true,
      answers: {},
    })
    for (const question of questions) {
      expect(question.options.length).toBeGreaterThanOrEqual(2)
      expect(question.options.length).toBeLessThanOrEqual(4)
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

describe('buildQuestionBank — branches dynamiques', () => {
  function answer(questionId: string, optionId: string): Record<string, QuestionAnswer> {
    return { [questionId]: { questionId, optionId, delta: {} } }
  }

  it('branche B : répondre "sales" à identity insère focus-sales juste après', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('identity', 'sales'),
    })
    const ids = questions.map((q) => q.id)
    expect(ids.indexOf('focus-sales')).toBe(ids.indexOf('identity') + 1)
  })

  it('branche B : changer la réponse à identity remplace la sous-question', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('identity', 'events'),
    })
    const ids = questions.map((q) => q.id)
    expect(ids).toContain('focus-events')
    expect(ids).not.toContain('focus-sales')
  })

  it('branche B : aucune sous-question tant que identity est sans réponse', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: {},
    })
    expect(questions.some((q) => q.id.startsWith('focus-'))).toBe(false)
  })

  it('branche C : répondre "status" à row-focus insère status-editable juste après', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('row-focus', 'status'),
    })
    const ids = questions.map((q) => q.id)
    expect(ids.indexOf('status-editable')).toBe(ids.indexOf('row-focus') + 1)
  })

  it('branche C : une autre réponse à row-focus ne déclenche rien', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('row-focus', 'compare'),
    })
    expect(questions.some((q) => q.id === 'status-editable')).toBe(false)
  })

  it('branche A : répondre "chart" à numbers insère chart-kind juste après (nécessite hasMeaningfulChart)', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: true,
      answers: answer('numbers', 'chart'),
    })
    const ids = questions.map((q) => q.id)
    expect(ids.indexOf('chart-kind')).toBe(ids.indexOf('numbers') + 1)
  })

  it('branche A : "total" ne déclenche pas chart-kind', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: true,
      answers: answer('numbers', 'total'),
    })
    expect(questions.some((q) => q.id === 'chart-kind')).toBe(false)
  })

  it('les 3 branches peuvent être actives simultanément', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: true,
      answers: {
        identity: { questionId: 'identity', optionId: 'contacts', delta: {} },
        'row-focus': { questionId: 'row-focus', optionId: 'status', delta: {} },
        numbers: { questionId: 'numbers', optionId: 'chart', delta: {} },
      },
    })
    const ids = questions.map((q) => q.id)
    expect(ids).toEqual([
      'identity', 'focus-contacts', 'row-focus', 'status-editable', 'edit',
      'numbers', 'chart-kind', 'volume', 'theme',
    ])
  })
})
