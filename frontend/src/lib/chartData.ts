// Construit les points de données d'un graphique à partir d'une recommandation
// (semantic.ts) et des lignes réelles d'une table. Pur, partagé entre le
// widget de la webapp générée (ChartWidget) et l'aperçu des propositions
// (MiniChart) — les deux doivent afficher exactement les mêmes données.

import type { ChartRecommendation } from './semantic'

export interface ChartPoint { label: string; value: number }

export function buildCategoryChart(recommendation: ChartRecommendation, rows: unknown[][]): ChartPoint[] | null {
  const groups = new Map<string, { total: number; count: number }>()
  for (const row of rows) {
    const key   = String(row[recommendation.dimension.index] ?? '—')
    const value = Number(row[recommendation.metric.index])
    if (isNaN(value)) continue
    const current = groups.get(key) ?? { total: 0, count: 0 }
    groups.set(key, { total: current.total + value, count: current.count + 1 })
  }
  if (groups.size === 0) return null
  const useAverage = recommendation.metric.role === 'percent' || recommendation.metric.role === 'rating'
  return [...groups.entries()].slice(0, 12).map(([label, group]) => ({
    label,
    value: useAverage ? group.total / group.count : group.total,
  }))
}

export function buildTimeChart(recommendation: ChartRecommendation, rows: unknown[][]): ChartPoint[] | null {
  const points = rows
    .map((row) => ({
      label: String(row[recommendation.dimension.index] ?? ''),
      value: Number(row[recommendation.metric.index]),
      time: Date.parse(String(row[recommendation.dimension.index])),
    }))
    .filter((p) => p.label && !isNaN(p.value) && !isNaN(p.time))
    .sort((a, b) => a.time - b.time)

  if (points.length < 2) return null
  return points.map(({ label, value }) => ({ label, value }))
}

export function buildChartData(recommendation: ChartRecommendation, rows: unknown[][]): ChartPoint[] | null {
  return recommendation.kind === 'time'
    ? buildTimeChart(recommendation, rows)
    : buildCategoryChart(recommendation, rows)
}
