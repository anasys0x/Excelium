import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { analyzeColumns } from '../../lib/semantic'
import MiniChart from './MiniChart'

const chartColumns = [{ name: 'Région', type: 'TEXT' }, { name: 'Montant', type: 'FLOAT' }, { name: 'Date de vente', type: 'DATE' }]
const chartRows = [
  ['Nord', 1200, '2026-01-10'],
  ['Sud', 900, '2026-01-11'],
  ['Nord', 1500, '2026-01-12'],
  ['Sud', 1100, '2026-01-13'],
]

const noChartColumns = [{ name: 'Nom', type: 'TEXT' }, { name: 'Âge', type: 'INT' }]
const noChartRows = [['Alice', 20], ['Bob', 22]]

describe('MiniChart', () => {
  it('rend un graphique quand une recommandation existe', () => {
    const analyzed = analyzeColumns(chartColumns, chartRows)
    const { container } = render(<MiniChart columns={analyzed} rows={chartRows} height={44} />)
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('ne rend rien quand aucune donnée graphique n\'est disponible', () => {
    const analyzed = analyzeColumns(noChartColumns, noChartRows)
    const { container } = render(<MiniChart columns={analyzed} rows={noChartRows} height={44} />)
    expect(container.querySelector('.recharts-responsive-container')).not.toBeInTheDocument()
  })
})
