import { describe, expect, it } from 'vitest'
import { buildPreferenceProfile } from './preferenceEngine'
import { buildUiProposals } from './uiProposals'

describe('buildUiProposals', () => {
  it('propose 3 variantes du MÊME layout (le mieux noté), pas 3 layouts différents', () => {
    const profile = buildPreferenceProfile([
      { questionId: 'row-focus', optionId: 'visual', delta: { layout: { gallery: 2 } } },
    ])

    const proposals = buildUiProposals(profile, {
      hasImages: true,
      hasMeaningfulChart: true,
      archetype: 'generic',
    })

    expect(proposals).toHaveLength(3)
    expect(new Set(proposals.map((p) => p.config.layout))).toEqual(new Set(['gallery']))
    expect(proposals.filter((p) => p.recommended)).toHaveLength(1)
    // 3 compositions différentes (densité et/ou indicateurs), pas 3 clones
    expect(new Set(proposals.map((p) => p.id)).size).toBe(3)
  })

  it('layout "tableau de bord" : les 3 variantes combinent différemment indicateurs et graphique', () => {
    const profile = buildPreferenceProfile([
      { questionId: 'layout-root', optionId: 'dashboard', delta: { layout: { dashboard: 4 } } },
    ])
    const proposals = buildUiProposals(profile, {
      hasImages: false,
      hasMeaningfulChart: true,
      archetype: 'generic',
    })

    expect(proposals.every((p) => p.config.layout === 'dashboard')).toBe(true)
    expect(proposals.map((p) => [p.config.showStats, p.config.showChart])).toEqual([
      [true, false],
      [false, true],
      [true, true],
    ])
  })

  it('layout non-dashboard : les 3 variantes combinent différemment densité et aperçu chiffré', () => {
    const profile = buildPreferenceProfile([
      { questionId: 'layout-root', optionId: 'table', delta: { layout: { table: 4 } } },
    ])
    const proposals = buildUiProposals(profile, {
      hasImages: false,
      hasMeaningfulChart: false,
      archetype: 'generic',
    })

    expect(proposals.every((p) => p.config.layout === 'table')).toBe(true)
    expect(proposals.map((p) => [p.config.density, p.config.showStats || p.config.showChart])).toEqual([
      ['comfortable', false],
      ['compact', false],
      ['comfortable', true],
    ])
  })

  it('toutes les propositions partagent le même thème/navigation (issus du profil)', () => {
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

  it("un choix explicite de galerie l'emporte même sans image", () => {
    const proposals = buildUiProposals(
      buildPreferenceProfile([{ questionId: 'row-focus', optionId: 'visual', delta: { layout: { gallery: 2 } } }]),
      { hasImages: false, hasMeaningfulChart: false, archetype: 'generic' },
    )
    expect(proposals[0].config.layout).toBe('gallery')
  })

  it('un changement de réponse qui modifie le score de layout change le layout proposé', () => {
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

  it('la variante recommandée reflète ce que les réponses indiquent déjà (ex : profil orienté graphique)', () => {
    const chartLeaning = buildPreferenceProfile([
      { questionId: 'layout-root', optionId: 'dashboard', delta: { layout: { dashboard: 4 } } },
      { questionId: 'metric-view', optionId: 'time', delta: { widget: { chart: 3 }, chartPreference: 'time' } },
    ])
    const proposals = buildUiProposals(chartLeaning, { hasImages: false, hasMeaningfulChart: true, archetype: 'generic' })
    const recommended = proposals.find((p) => p.recommended)!
    expect(recommended.config.showChart).toBe(true)
    expect(recommended.config.showStats).toBe(false)
  })
})
