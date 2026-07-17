import { describe, expect, it } from 'vitest'
import { computeArchetypeScores, detectArchetype, DETECTION_THRESHOLD, ARCHETYPE_PRESETS } from './archetype'
import type { AnalyzedColumn } from './semantic'

function col(name: string, role: AnalyzedColumn['role'], index: number): AnalyzedColumn {
  return { name, role, index }
}

const CONTACT_COLUMNS: AnalyzedColumn[] = [
  col('id', 'id', 0),
  col('nom', 'title', 1),
  col('email', 'text', 2),
  col('telephone', 'text', 3),
]

describe('computeArchetypeScores', () => {
  it('donne un score positif à contacts pour des colonnes de type annuaire', () => {
    const scores = computeArchetypeScores(CONTACT_COLUMNS, 'contacts')
    expect(scores.contacts).toBeGreaterThanOrEqual(DETECTION_THRESHOLD)
  })

  it('donne un score de 0 pour generic', () => {
    const scores = computeArchetypeScores(CONTACT_COLUMNS, 'contacts')
    expect(scores.generic).toBe(0)
  })

  it('reste cohérent avec detectArchetype (même gagnant)', () => {
    const scores = computeArchetypeScores(CONTACT_COLUMNS, 'contacts')
    const best = (Object.keys(scores) as (keyof typeof scores)[]).reduce((a, b) =>
      scores[b] > scores[a] ? b : a
    )
    const detected = detectArchetype(CONTACT_COLUMNS, 'contacts')
    const bestScore = scores[best]
    expect(detected).toBe(bestScore >= DETECTION_THRESHOLD ? best : 'generic')
  })
})

describe('DETECTION_THRESHOLD', () => {
  it('vaut 4, inchangé', () => {
    expect(DETECTION_THRESHOLD).toBe(4)
  })
})

describe('ARCHETYPE_PRESETS (non affecté par le refactor)', () => {
  it('garde cards comme layout par défaut pour contacts', () => {
    expect(ARCHETYPE_PRESETS.contacts.defaultLayout).toBe('cards')
  })
})
