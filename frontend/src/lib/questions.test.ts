import { describe, expect, it } from 'vitest'
import { buildQuestionBank } from './questions'

describe('buildQuestionBank', () => {
  it('ne propose que des questions qui modifient une dimension du rendu', () => {
    const questions = buildQuestionBank({
      tables: [{ tableName: 'Clients', rowCount: 12 }],
      hasImages: false,
      hasMeaningfulChart: false,
    })

    expect(questions).toHaveLength(9)
    expect(questions.find((question) => question.id === 'layout')?.options.some((option) => option.id === 'dashboard')).toBe(false)
    expect(questions.find((question) => question.id === 'insights')?.options.some((option) => option.id === 'charts')).toBe(false)
    for (const question of questions) {
      for (const option of question.options) {
        expect(Object.keys(option.delta).length).toBeGreaterThan(0)
        expect(option.impact.length).toBeGreaterThan(0)
      }
    }
  })

  it('ajoute uniquement les choix pertinents pour les données importées', () => {
    const questions = buildQuestionBank({
      tables: [
        { tableName: 'Produits', rowCount: 20 },
        { tableName: 'Commandes', rowCount: 35 },
      ],
      hasImages: true,
      hasMeaningfulChart: true,
    })

    expect(questions).toHaveLength(10)
    expect(questions.find((question) => question.id === 'layout')?.options.some((option) => option.id === 'gallery')).toBe(true)
    expect(questions.find((question) => question.id === 'insights')?.options.some((option) => option.id === 'charts')).toBe(true)
    expect(questions.find((question) => question.id === 'layout')?.options.some((option) => option.id === 'dashboard')).toBe(true)
    expect(questions.find((question) => question.id === 'primary-table')?.options).toHaveLength(2)
  })

  it('contient les cinq préférences supplémentaires demandées', () => {
    const ids = buildQuestionBank({
      tables: [{ tableName: 'Clients', rowCount: 12 }],
      hasImages: false,
      hasMeaningfulChart: false,
    }).map((question) => question.id)

    expect(ids).toEqual(expect.arrayContaining(['navigation', 'search', 'sort', 'exports', 'theme']))
  })
})
