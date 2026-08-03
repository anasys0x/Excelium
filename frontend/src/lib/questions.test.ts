import { describe, expect, it } from 'vitest'
import { buildQuestionBank } from './questions'
import type { QuestionAnswer } from './preferenceEngine'
import type { AnalyzedColumn } from './semantic'

const ONE_TABLE = [{ tableName: 'Clients', rowCount: 12, analyzed: [] as AnalyzedColumn[] }]
const TWO_TABLES = [
  { tableName: 'Produits', rowCount: 20, analyzed: [] as AnalyzedColumn[] },
  { tableName: 'Commandes', rowCount: 35, analyzed: [] as AnalyzedColumn[] },
]

const VENTES_COLUMNS: AnalyzedColumn[] = [
  { name: 'id', role: 'id', index: 0 },
  { name: 'montant', role: 'currency', index: 1 },
  { name: 'date_vente', role: 'date', index: 2 },
  { name: 'statut', role: 'status', index: 3 },
]

function answer(questionId: string, optionId: string): Record<string, QuestionAnswer> {
  return { [questionId]: { questionId, optionId, delta: {} } }
}

describe('buildQuestionBank — racine et fin commune', () => {
  it('sans réponse à la racine : layout-root, edit apparaissent (une table)', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: {},
    })
    expect(questions.map((q) => q.id)).toEqual(['layout-root', 'edit'])
  })

  it('sans réponse à la racine, avec deux tables : primary-table apparaît après edit', () => {
    const questions = buildQuestionBank({
      tables: TWO_TABLES,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: {},
    })
    expect(questions.map((q) => q.id)).toEqual(['layout-root', 'edit', 'primary-table'])
  })

  it('la question "edit" (canEdit) est posée quelle que soit la branche choisie', () => {
    for (const branch of ['dashboard', 'table', 'chart']) {
      const questions = buildQuestionBank({
        tables: ONE_TABLE,
        hasImages: false,
        hasMeaningfulChart: false,
        answers: answer('layout-root', branch),
      })
      expect(questions.map((q) => q.id)[1]).toBe('edit')
    }
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

  it('primary-table propose toutes les tables, triées par nombre de lignes décroissant', () => {
    const questions = buildQuestionBank({
      tables: [
        { tableName: 'a', rowCount: 1, analyzed: [] },
        { tableName: 'b', rowCount: 5, analyzed: [] },
        { tableName: 'c', rowCount: 3, analyzed: [] },
        { tableName: 'd', rowCount: 2, analyzed: [] },
      ],
      hasImages: false,
      hasMeaningfulChart: false,
      answers: {},
    })
    const primaryTable = questions.find((q) => q.id === 'primary-table')!
    expect(primaryTable.options.map((o) => o.label)).toEqual(['b', 'c', 'd', 'a'])
  })
})

describe('buildQuestionBank — branche A (vue chiffrée)', () => {
  it('répondre "dashboard" insère focus-metric puis metric-view après edit, si la table a une colonne numérique', () => {
    const tables = [{ tableName: 'Ventes', rowCount: 10, analyzed: VENTES_COLUMNS }]
    const questions = buildQuestionBank({
      tables,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('layout-root', 'dashboard'),
    })
    expect(questions.map((q) => q.id)).toEqual(['layout-root', 'edit', 'focus-metric', 'metric-view'])
  })

  it('sans colonne numérique détectée (ex : une feuille d\'employés) : aucune question de métrique n\'est posée', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('layout-root', 'dashboard'),
    })
    expect(questions.map((q) => q.id)).toEqual(['layout-root', 'edit'])
  })

  it('avec des colonnes détectées : focus-metric propose les vraies colonnes numériques, plus "Rien de précis"', () => {
    const tables = [{ tableName: 'Ventes', rowCount: 10, analyzed: VENTES_COLUMNS }]
    const questions = buildQuestionBank({
      tables,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('layout-root', 'dashboard'),
    })
    const focusMetric = questions.find((q) => q.id === 'focus-metric')!
    expect(focusMetric.options.map((o) => o.id)).toEqual(['metric-montant', 'none'])
  })

  it('répondre "Rien de précis" à focus-metric saute metric-view', () => {
    const tables = [{ tableName: 'Ventes', rowCount: 10, analyzed: VENTES_COLUMNS }]
    const questions = buildQuestionBank({
      tables,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: {
        ...answer('layout-root', 'dashboard'),
        'focus-metric': { questionId: 'focus-metric', optionId: 'none', delta: {} },
      },
    })
    expect(questions.map((q) => q.id)).toEqual(['layout-root', 'edit', 'focus-metric'])
  })

  it('primary-table est posée avant focus-metric, et focus-metric utilise la table choisie (pas la première du classeur)', () => {
    const tables = [
      { tableName: 'Commandes', rowCount: 40, analyzed: [{ name: 'Total', role: 'currency', index: 0 } as AnalyzedColumn] },
      { tableName: 'Produits', rowCount: 15, analyzed: VENTES_COLUMNS },
    ]
    const noAnswerYet = buildQuestionBank({
      tables, hasImages: false, hasMeaningfulChart: false,
      answers: answer('layout-root', 'dashboard'),
    })
    expect(noAnswerYet.map((q) => q.id)).toEqual(['layout-root', 'edit', 'primary-table', 'focus-metric', 'metric-view'])

    const withPrimaryChosen = buildQuestionBank({
      tables, hasImages: false, hasMeaningfulChart: false,
      answers: {
        ...answer('layout-root', 'dashboard'),
        'primary-table': { questionId: 'primary-table', optionId: 'primary-Produits', delta: { primaryTableName: 'Produits' } },
      },
    })
    const focusMetric = withPrimaryChosen.find((q) => q.id === 'focus-metric')!
    expect(focusMetric.options.map((o) => o.id)).toEqual(['metric-montant', 'none'])
  })

  it('metric-view se spécialise : propose date/catégorie seulement si détectées dans la table', () => {
    const tables = [{ tableName: 'Ventes', rowCount: 10, analyzed: VENTES_COLUMNS }]
    const questions = buildQuestionBank({
      tables,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('layout-root', 'dashboard'),
    })
    const metricView = questions.find((q) => q.id === 'metric-view')!
    expect(metricView.options.map((o) => o.id)).toEqual(['total', 'time', 'category'])
  })
})

describe('buildQuestionBank — branche B (tableau)', () => {
  it('répondre "table" insère search, row-priority, navigation-pref après edit', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('layout-root', 'table'),
    })
    expect(questions.map((q) => q.id)).toEqual([
      'layout-root', 'edit', 'search', 'row-priority', 'navigation-pref',
    ])
  })
})

describe('buildQuestionBank — branche C (avec graphique)', () => {
  it('sans colonne numérique détectée : repli sur chart-kind générique, also-stats, sort-pref', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('layout-root', 'chart'),
    })
    expect(questions.map((q) => q.id)).toEqual([
      'layout-root', 'edit', 'chart-kind', 'also-stats', 'sort-pref',
    ])
  })

  it('avec des colonnes détectées : chart-metric propose les vraies colonnes numériques', () => {
    const tables = [{ tableName: 'Ventes', rowCount: 10, analyzed: VENTES_COLUMNS }]
    const questions = buildQuestionBank({
      tables,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('layout-root', 'chart'),
    })
    expect(questions.map((q) => q.id)).toEqual([
      'layout-root', 'edit', 'chart-metric', 'chart-dimension', 'also-stats', 'sort-pref',
    ])
    const chartMetric = questions.find((q) => q.id === 'chart-metric')!
    expect(chartMetric.options.map((o) => o.id)).toEqual(['metric-montant'])
  })

  it('chart-dimension se spécialise selon les colonnes date/catégorie réellement détectées', () => {
    const tables = [{ tableName: 'Ventes', rowCount: 10, analyzed: VENTES_COLUMNS }]
    const questions = buildQuestionBank({
      tables,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('layout-root', 'chart'),
    })
    const chartDimension = questions.find((q) => q.id === 'chart-dimension')!
    expect(chartDimension.options.map((o) => o.id)).toEqual(['time', 'category', 'neutral'])
  })
})

describe('buildQuestionBank — changement de branche', () => {
  it('changer la réponse à la racine remplace entièrement la séquence de branche (edit reste, lui)', () => {
    const questions = buildQuestionBank({
      tables: ONE_TABLE,
      hasImages: false,
      hasMeaningfulChart: false,
      answers: answer('layout-root', 'chart'),
    })
    const ids = questions.map((q) => q.id)
    expect(ids).toContain('chart-kind')
    expect(ids).toContain('edit')
    expect(ids).not.toContain('search')
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

  it("le volume et le thème ne sont plus demandés (thème géré dans la webapp générée)", () => {
    for (const branch of ['dashboard', 'table', 'chart']) {
      const questions = buildQuestionBank({
        tables: ONE_TABLE,
        hasImages: false,
        hasMeaningfulChart: false,
        answers: answer('layout-root', branch),
      })
      const ids = questions.map((q) => q.id)
      expect(ids).not.toContain('volume')
      expect(ids).not.toContain('theme')
      expect(ids).not.toContain('exports-pref')
    }
  })
})
