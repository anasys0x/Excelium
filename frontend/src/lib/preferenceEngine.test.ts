import { describe, expect, it } from 'vitest'
import {
  buildPreferenceProfile,
  getDisplayDensity,
  shouldAllowEditing,
  shouldShowChartWidget,
  shouldShowStatsWidget,
} from './preferenceEngine'
import type { QuestionAnswer } from './preferenceEngine'

describe('buildPreferenceProfile', () => {
  it('retourne un profil neutre pour une liste vide', () => {
    const profile = buildPreferenceProfile([])
    expect(profile).toEqual({
      archetype: {},
      layout: {},
      widget: { chart: 0, stats: 0 },
      interaction: 0,
      density: 0,
      navigation: 'tabs',
      searchEnabled: true,
      sortMode: 'source',
      exportMode: 'all',
      theme: 'dark',
    })
  })

  it('additionne les deltas de plusieurs réponses', () => {
    const answers: QuestionAnswer[] = [
      { questionId: 'q1', optionId: 'a', delta: { interaction: 1 } },
      { questionId: 'q5', optionId: 'a', delta: { widget: { chart: 3 }, layout: { dashboard: 2 } } },
      { questionId: 'q7', optionId: 'a', delta: { widget: { chart: 2 }, archetype: { sales: 1 } } },
    ]
    const profile = buildPreferenceProfile(answers)
    expect(profile.interaction).toBe(1)
    expect(profile.widget.chart).toBe(5)
    expect(profile.widget.stats).toBe(0)
    expect(profile.layout.dashboard).toBe(2)
    expect(profile.archetype.sales).toBe(1)
  })

  it('retient le dernier primaryTableName rencontré', () => {
    const answers: QuestionAnswer[] = [
      { questionId: 'q15', optionId: 'primary-clients', delta: { primaryTableName: 'clients' } },
    ]
    const profile = buildPreferenceProfile(answers)
    expect(profile.primaryTableHint).toBe('clients')
  })

  it("ne mute pas le tableau de réponses ni ses éléments", () => {
    const answer: QuestionAnswer = { questionId: 'q1', optionId: 'a', delta: { interaction: 1 } }
    const answers = Object.freeze([answer])
    expect(() => buildPreferenceProfile(answers)).not.toThrow()
    expect(answer.delta.interaction).toBe(1)
  })

  it('traduit les réponses en réglages visibles', () => {
    const profile = buildPreferenceProfile([
      { questionId: 'access', optionId: 'edit', delta: { interaction: 2 } },
      { questionId: 'density', optionId: 'compact', delta: { density: 2 } },
      { questionId: 'insights', optionId: 'charts', delta: { widget: { chart: 3, stats: 3 } } },
      { questionId: 'navigation', optionId: 'sidebar', delta: { navigation: 'sidebar' } },
      { questionId: 'search', optionId: 'hidden', delta: { searchEnabled: false } },
      { questionId: 'sort', optionId: 'alphabetical', delta: { sortMode: 'alphabetical' } },
      { questionId: 'exports', optionId: 'excel', delta: { exportMode: 'excel' } },
      { questionId: 'theme', optionId: 'light', delta: { theme: 'light' } },
    ])

    expect(shouldAllowEditing(profile)).toBe(true)
    expect(getDisplayDensity(profile)).toBe('compact')
    expect(shouldShowChartWidget(profile)).toBe(true)
    expect(shouldShowStatsWidget(profile)).toBe(true)
    expect(profile.navigation).toBe('sidebar')
    expect(profile.searchEnabled).toBe(false)
    expect(profile.sortMode).toBe('alphabetical')
    expect(profile.exportMode).toBe('excel')
    expect(profile.theme).toBe('light')
  })
})
