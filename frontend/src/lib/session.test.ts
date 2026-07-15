import { describe, expect, it } from 'vitest'
import { restoreSession } from './session'
import type { SessionApiResponse } from './session'

function storedSession(preset: Record<string, unknown> = {}): SessionApiResponse {
  return {
    id: '2a39bfa1-4f2a-4aa8-ae38-1d70fb9f76fd',
    createdAt: '2026-07-15T12:00:00+00:00',
    dbSchema: {
      tables: [{
        tableName: 'Étudiants',
        columns: [
          { name: 'ID', type: 'INT', isPrimaryKey: true },
          { name: 'Nom', type: 'STRING', isPrimaryKey: false },
          { name: 'Âge', type: 'INT', isPrimaryKey: false },
        ],
        rows: [[1, 'Alice', 20]],
      }],
    },
    preset,
  }
}

describe('restoreSession', () => {
  it('reconstruit les tables et le preset sauvegardé', () => {
    const restored = restoreSession(storedSession({
      archetypeOverrides: { '0-0': 'contacts' },
      layoutOverrides: { '0-0': 'cards' },
      primaryTableId: '0-0',
      showChartWidget: false,
      showStatsWidget: true,
      canEdit: false,
      density: 'compact',
      navigation: 'sidebar',
      searchEnabled: false,
      sortMode: 'alphabetical',
      exportMode: 'excel',
      theme: 'light',
    }))

    expect(restored.sheets[0].tables[0].tableName).toBe('Étudiants')
    expect(restored.seed.layoutOverrides['session-0']).toBe('cards')
    expect(restored.seed.primaryTableId).toBe('session-0')
    expect(restored.seed.navigation).toBe('sidebar')
    expect(restored.seed.canEdit).toBe(false)
    expect(restored.theme).toBe('light')
  })

  it('applique des valeurs sûres aux anciennes sessions', () => {
    const restored = restoreSession(storedSession({
      archetypeOverrides: { '0-0': 'contacts' },
      layoutOverrides: { '0-0': 'table' },
    }))

    expect(restored.seed.canEdit).toBe(true)
    expect(restored.seed.searchEnabled).toBe(true)
    expect(restored.seed.exportMode).toBe('all')
    expect(restored.seed.showChartWidget).toBe(false)
  })

  it('refuse une session sans table', () => {
    expect(() => restoreSession({ ...storedSession(), dbSchema: { tables: [] } }))
      .toThrow('aucun schéma exploitable')
  })
})
