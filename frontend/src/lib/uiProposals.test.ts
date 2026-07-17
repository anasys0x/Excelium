import { describe, expect, it } from 'vitest'
import { buildPreferenceProfile } from './preferenceEngine'
import { buildUiProposals } from './uiProposals'

describe('buildUiProposals', () => {
  it('produit exactement trois propositions distinctes', () => {
    const profile = buildPreferenceProfile([
      { questionId: 'layout', optionId: 'cards', delta: { layout: { cards: 4 } } },
      { questionId: 'density', optionId: 'comfortable', delta: { density: -2 } },
      { questionId: 'navigation', optionId: 'tabs', delta: { navigation: 'tabs' } },
    ])

    const proposals = buildUiProposals(profile, {
      hasImages: false,
      hasMeaningfulChart: false,
      archetype: 'contacts',
    })
    const signatures = proposals.map(({ config }) => `${config.layout}:${config.density}:${config.navigation}`)

    expect(proposals).toHaveLength(3)
    expect(new Set(signatures)).toHaveLength(3)
    expect(proposals[0].id).toBe('recommended')
    expect(proposals[0].config.layout).toBe('cards')
    expect(proposals.some((proposal) => proposal.id === 'analytical')).toBe(false)
  })
})
