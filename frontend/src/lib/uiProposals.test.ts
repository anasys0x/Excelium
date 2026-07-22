import { describe, expect, it } from 'vitest'
import { buildPreferenceProfile } from './preferenceEngine'
import { buildUiProposals } from './uiProposals'

describe('buildUiProposals', () => {
  it('classe les layouts disponibles par score et marque le premier comme recommandé', () => {
    const profile = buildPreferenceProfile([
      { questionId: 'row-focus', optionId: 'visual', delta: { layout: { gallery: 2 } } },
      { questionId: 'row-focus-2', optionId: 'compare', delta: { widget: { stats: 2 }, layout: { dashboard: 1 } } },
    ])

    const proposals = buildUiProposals(profile, {
      hasImages: true,
      hasMeaningfulChart: true,
      archetype: 'generic',
    })

    expect(proposals).toHaveLength(3)
    expect(proposals[0].config.layout).toBe('gallery')
    expect(proposals[0].recommended).toBe(true)
    expect(proposals[1].recommended).toBe(false)
    expect(proposals[2].recommended).toBe(false)
    expect(new Set(proposals.map((p) => p.config.layout)).size).toBe(3)
  })

  it('reste toujours à 3 propositions même sans image ni graphique pertinent (déprioritise, ne retire pas)', () => {
    const profile = buildPreferenceProfile([])
    const proposals = buildUiProposals(profile, {
      hasImages: false,
      hasMeaningfulChart: false,
      archetype: 'generic',
    })

    expect(proposals).toHaveLength(3)
    expect(proposals.map((p) => p.config.layout)).toEqual(['table', 'cards', 'dashboard'])
  })

  it('toutes les propositions partagent le même thème/densité/navigation (issus du profil)', () => {
    const profile = buildPreferenceProfile([
      { questionId: 'theme', optionId: 'light', delta: { theme: 'light' } },
    ])
    const proposals = buildUiProposals(profile, {
      hasImages: true,
      hasMeaningfulChart: true,
      archetype: 'generic',
    })

    for (const proposal of proposals) {
      expect(proposal.config.theme).toBe('light')
    }
  })

  it('un choix explicite de galerie/dashboard l\'emporte même sans image/métrique idéale', () => {
    const proposals = buildUiProposals(
      buildPreferenceProfile([{ questionId: 'row-focus', optionId: 'visual', delta: { layout: { gallery: 2 } } }]),
      { hasImages: false, hasMeaningfulChart: false, archetype: 'generic' },
    )
    expect(proposals[0].config.layout).toBe('gallery')
  })

  it('un changement de réponse qui modifie le score de layout change le classement', () => {
    const withTableFocus = buildUiProposals(
      buildPreferenceProfile([{ questionId: 'row-focus', optionId: 'identifier', delta: { layout: { table: 2 } } }]),
      { hasImages: true, hasMeaningfulChart: true, archetype: 'generic' },
    )
    const withGalleryFocus = buildUiProposals(
      buildPreferenceProfile([{ questionId: 'row-focus', optionId: 'visual', delta: { layout: { gallery: 2 } } }]),
      { hasImages: true, hasMeaningfulChart: true, archetype: 'generic' },
    )

    expect(withTableFocus[0].config.layout).toBe('table')
    expect(withGalleryFocus[0].config.layout).toBe('gallery')
  })
})
