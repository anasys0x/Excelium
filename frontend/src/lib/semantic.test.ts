import { describe, expect, it } from 'vitest'
import { detectArchetype } from './archetype'
import { analyzeColumns, findChartRecommendation } from './semantic'

describe('compréhension sémantique des tables', () => {
  it('traite âge et date de naissance comme des attributs étudiants, sans graphique', () => {
    const columns = [
      { name: 'Nom', type: 'TEXT' },
      { name: 'Âge', type: 'INT' },
      { name: 'Date de naissance', type: 'DATE' },
    ]
    const rows = [
      ['Alice', 20, '2006-02-12'],
      ['Benoît', 22, '2004-07-03'],
      ['Chloé', 19, '2007-01-17'],
    ]
    const analyzed = analyzeColumns(columns, rows)

    expect(findChartRecommendation(analyzed)).toBeNull()
    expect(detectArchetype(analyzed, 'Feuille 1')).toBe('contacts')
  })

  it('autorise un graphique quand une mesure métier possède une vraie dimension', () => {
    const columns = [
      { name: 'Région', type: 'TEXT' },
      { name: 'Montant', type: 'FLOAT' },
      { name: 'Date de vente', type: 'DATE' },
    ]
    const rows = [
      ['Nord', 1200, '2026-01-10'],
      ['Sud', 900, '2026-01-11'],
      ['Nord', 1500, '2026-01-12'],
      ['Sud', 1100, '2026-01-13'],
    ]
    const recommendation = findChartRecommendation(analyzeColumns(columns, rows))

    expect(recommendation?.metric.name).toBe('Montant')
    expect(recommendation?.dimension.name).toBe('Région')
  })
})
