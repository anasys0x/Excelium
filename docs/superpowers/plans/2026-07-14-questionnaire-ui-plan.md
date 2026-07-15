# Questionnaire de pondération pour la génération d'UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insérer un questionnaire de 20 questions pondérées entre la validation du schéma (`confirm`) et la génération de la webapp, dont les réponses affinent (sans la remplacer) la détection sémantique automatique existante, et sauvegarder schéma + preset UI en base sous un identifiant de session.

**Architecture:** Un nouveau module pur et testable `preferenceEngine.ts` agrège les réponses en un `PreferenceProfile`, puis fusionne ce profil avec les scores réels de la détection automatique (`archetype.ts`, `semantic.ts`, légèrement étendus pour exposer leurs scores internes) afin de produire, pour chaque table, l'archétype et le layout retenus. Le résultat sert à préremplir les overrides déjà existants dans `GeneratedApp.tsx`. Côté backend, un nouvel endpoint `POST /sessions` persiste schéma + preset dans une table Postgres système, en fondation pour la reprise de session future.

**Tech Stack:** React 19 + TypeScript + Vite (frontend), FastAPI + psycopg2 + PostgreSQL (backend), Vitest (nouveaux tests frontend), pytest (nouveaux tests backend), Recharts (nouveau widget graphique).

## Global Constraints

- Spec de référence : `docs/superpowers/specs/2026-07-14-questionnaire-ui-design.md` — relire avant de commencer, toute divergence doit être signalée avant implémentation.
- Pour un profil de préférences vide (aucune réponse), `computeTablePreset` doit reproduire exactement le résultat que produit aujourd'hui `GeneratedApp.tsx` (même archétype, même layout par défaut) — c'est un test obligatoire de la Task 3.
- Aucune mutation : `buildPreferenceProfile` et `computeTablePreset` ne mutent jamais leurs arguments, ils retournent toujours un nouvel objet.
- 20 questions, choix unique (pas de multi-sélection), 2 à 4 options chacune.
- Seuil de décision d'archétype inchangé : `DETECTION_THRESHOLD = 4`. Seuil d'activation d'un widget (`chart`/`stats`) : score cumulé `>= 2`.
- Aucun écran de reprise de session (saisie d'un `session_id` pour recharger) dans ce lot — hors périmètre, couvert par `.taches/reprise-session.md`.
- Style de code existant à respecter : TypeScript sans point-virgule, guillemets simples, indentation 2 espaces, types explicites sur les fonctions exportées (`typescript/coding-style.md`) ; Python avec type hints PEP 8, indentation 4 espaces, docstring uniquement si le "pourquoi" n'est pas évident.
- Aucun `console.log` dans le code livré.
- Toutes les URLs backend utilisées côté frontend restent `http://localhost:8000`, cohérent avec le reste de `App.tsx`/`GeneratedApp.tsx`.

---

### Task 1: Vitest + exposer les scores internes de `archetype.ts`

**Files:**
- Create: `frontend/vitest.config.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/src/lib/archetype.ts`
- Test: `frontend/src/lib/archetype.test.ts`

**Interfaces:**
- Produces: `computeArchetypeScores(columns: AnalyzedColumn[], tableName = ''): Record<TableArchetype, number>` (exported), `DETECTION_THRESHOLD` (exported `number`, valeur `4`). `detectArchetype` garde exactement la même signature et le même comportement.

- [ ] **Step 1: Ajouter Vitest aux dépendances et au script de test**

Dans `frontend/package.json`, ajouter le script et la dépendance :

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "react-grid-layout": "^2.2.3",
    "recharts": "^2.15.0"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/node": "^24.13.2",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.2",
    "eslint": "^10.5.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.3",
    "globals": "^17.6.0",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.61.0",
    "vite": "^8.1.0",
    "vitest": "^3.2.4"
  }
```

(`recharts` est ajouté ici aussi car c'est le même fichier ; utilisé à partir de la Task 10.)

Run: `cd frontend && npm install`
Expected: installation réussie, `node_modules/vitest` et `node_modules/recharts` présents.

- [ ] **Step 2: Créer la config Vitest**

Create `frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Écrire le test qui échoue pour `computeArchetypeScores`/`DETECTION_THRESHOLD`**

Create `frontend/src/lib/archetype.test.ts`:

```typescript
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
```

- [ ] **Step 4: Lancer les tests et vérifier l'échec**

Run: `cd frontend && npm run test`
Expected: FAIL — `computeArchetypeScores` and `DETECTION_THRESHOLD` are not exported from `./archetype`.

- [ ] **Step 5: Exporter `computeArchetypeScores` et `DETECTION_THRESHOLD`**

Dans `frontend/src/lib/archetype.ts`, remplacer :

```typescript
const DETECTION_THRESHOLD = 4

export function detectArchetype(columns: AnalyzedColumn[], tableName = ''): TableArchetype {
  const scores = scoreArchetypes(collectSignals(columns), tableName)

  let best: TableArchetype = 'generic'
  let bestScore = 0
  for (const a of ARCHETYPE_ORDER) {
    if (scores[a] > bestScore) {
      best = a
      bestScore = scores[a]
    }
  }

  return bestScore >= DETECTION_THRESHOLD ? best : 'generic'
}
```

par :

```typescript
export const DETECTION_THRESHOLD = 4

export function computeArchetypeScores(columns: AnalyzedColumn[], tableName = ''): Record<TableArchetype, number> {
  return scoreArchetypes(collectSignals(columns), tableName)
}

export function detectArchetype(columns: AnalyzedColumn[], tableName = ''): TableArchetype {
  const scores = computeArchetypeScores(columns, tableName)

  let best: TableArchetype = 'generic'
  let bestScore = 0
  for (const a of ARCHETYPE_ORDER) {
    if (scores[a] > bestScore) {
      best = a
      bestScore = scores[a]
    }
  }

  return bestScore >= DETECTION_THRESHOLD ? best : 'generic'
}
```

Aucun autre changement dans le fichier : `scoreArchetypes`/`collectSignals` restent privés, comportement de `detectArchetype` inchangé (simple extraction).

- [ ] **Step 6: Lancer les tests et vérifier le succès**

Run: `cd frontend && npm run test`
Expected: PASS — tous les tests de `archetype.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/lib/archetype.ts frontend/src/lib/archetype.test.ts
git commit -m "feat(front): exposer les scores d'archétype et configurer Vitest"
```

---

### Task 2: `preferenceEngine.ts` — types + `buildPreferenceProfile`

**Files:**
- Create: `frontend/src/lib/preferenceEngine.ts`
- Test: `frontend/src/lib/preferenceEngine.test.ts`

**Interfaces:**
- Consumes: `TableArchetype` from `./archetype`, `LayoutKind` from `./semantic`.
- Produces: `PreferenceDelta`, `QuestionAnswer`, `PreferenceProfile` (types), `buildPreferenceProfile(answers: readonly QuestionAnswer[]): PreferenceProfile`.

- [ ] **Step 1: Écrire le test qui échoue**

Create `frontend/src/lib/preferenceEngine.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { buildPreferenceProfile } from './preferenceEngine'
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
})
```

- [ ] **Step 2: Lancer les tests et vérifier l'échec**

Run: `cd frontend && npm run test`
Expected: FAIL — le module `./preferenceEngine` n'existe pas.

- [ ] **Step 3: Implémenter `buildPreferenceProfile`**

Create `frontend/src/lib/preferenceEngine.ts`:

```typescript
// Moteur de préférences : agrège les réponses au questionnaire en un profil
// de pondération pur et immutable, utilisé pour affiner (jamais remplacer)
// la détection sémantique automatique (archetype.ts, semantic.ts).

import type { TableArchetype } from './archetype'
import type { LayoutKind } from './semantic'

export interface PreferenceDelta {
  archetype?: Partial<Record<TableArchetype, number>>
  layout?: Partial<Record<LayoutKind, number>>
  widget?: { chart?: number; stats?: number }
  interaction?: number
  density?: number
  primaryTableName?: string
}

export interface QuestionAnswer {
  questionId: string
  optionId: string
  delta: PreferenceDelta
}

export interface PreferenceProfile {
  archetype: Partial<Record<TableArchetype, number>>
  layout: Partial<Record<LayoutKind, number>>
  widget: { chart: number; stats: number }
  interaction: number
  density: number
  primaryTableHint?: string
}

function addRecord<K extends string>(
  base: Partial<Record<K, number>>,
  extra: Partial<Record<K, number>> | undefined,
): Partial<Record<K, number>> {
  if (!extra) return base
  const next = { ...base }
  for (const key of Object.keys(extra) as K[]) {
    next[key] = (next[key] ?? 0) + (extra[key] ?? 0)
  }
  return next
}

export function buildPreferenceProfile(answers: readonly QuestionAnswer[]): PreferenceProfile {
  const initial: PreferenceProfile = {
    archetype: {},
    layout: {},
    widget: { chart: 0, stats: 0 },
    interaction: 0,
    density: 0,
  }

  return answers.reduce<PreferenceProfile>((profile, answer) => {
    const { delta } = answer
    return {
      archetype: addRecord(profile.archetype, delta.archetype),
      layout: addRecord(profile.layout, delta.layout),
      widget: {
        chart: profile.widget.chart + (delta.widget?.chart ?? 0),
        stats: profile.widget.stats + (delta.widget?.stats ?? 0),
      },
      interaction: profile.interaction + (delta.interaction ?? 0),
      density: profile.density + (delta.density ?? 0),
      primaryTableHint: delta.primaryTableName ?? profile.primaryTableHint,
    }
  }, initial)
}
```

- [ ] **Step 4: Lancer les tests et vérifier le succès**

Run: `cd frontend && npm run test`
Expected: PASS — tous les tests de `preferenceEngine.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/preferenceEngine.ts frontend/src/lib/preferenceEngine.test.ts
git commit -m "feat(front): ajouter buildPreferenceProfile au moteur de préférences"
```

---

### Task 3: `preferenceEngine.ts` — `computeTablePreset` + seuils de widgets

**Files:**
- Modify: `frontend/src/lib/preferenceEngine.ts`
- Test: `frontend/src/lib/preferenceEngine.test.ts`

**Interfaces:**
- Consumes: `ARCHETYPE_ORDER`, `DETECTION_THRESHOLD` from `./archetype` (Task 1). `PreferenceProfile` (Task 2).
- Produces: `AutoDetectedTablePreset`, `FinalTablePreset` (types), `computeTablePreset(auto: AutoDetectedTablePreset, profile: PreferenceProfile): FinalTablePreset`, `shouldShowChartWidget(profile: PreferenceProfile): boolean`, `shouldShowStatsWidget(profile: PreferenceProfile): boolean`.

- [ ] **Step 1: Ajouter les tests qui échouent**

Append to `frontend/src/lib/preferenceEngine.test.ts`:

```typescript
import { computeTablePreset, shouldShowChartWidget, shouldShowStatsWidget } from './preferenceEngine'
import type { AutoDetectedTablePreset } from './preferenceEngine'

const EMPTY_PROFILE = buildPreferenceProfile([])

describe('computeTablePreset', () => {
  it('reproduit exactement la détection auto pour un profil vide (archétype sous le seuil)', () => {
    const auto: AutoDetectedTablePreset = {
      archetypeScores: { contacts: 2, sales: 0, inventory: 0, events: 0, generic: 0 },
      availableLayouts: ['table', 'dashboard'],
      defaultLayout: 'table',
    }
    const result = computeTablePreset(auto, EMPTY_PROFILE)
    expect(result.archetype).toBe('generic')
    expect(result.layout).toBe('table')
  })

  it('reproduit exactement la détection auto pour un profil vide (archétype au-dessus du seuil)', () => {
    const auto: AutoDetectedTablePreset = {
      archetypeScores: { contacts: 5, sales: 0, inventory: 0, events: 0, generic: 0 },
      availableLayouts: ['table', 'cards'],
      defaultLayout: 'cards',
    }
    const result = computeTablePreset(auto, EMPTY_PROFILE)
    expect(result.archetype).toBe('contacts')
    expect(result.layout).toBe('cards')
  })

  it('un delta de profil peut faire franchir le seuil à un archétype', () => {
    const auto: AutoDetectedTablePreset = {
      archetypeScores: { contacts: 0, sales: 2, inventory: 0, events: 0, generic: 0 },
      availableLayouts: ['table'],
      defaultLayout: 'table',
    }
    const profile = buildPreferenceProfile([
      { questionId: 'q7', optionId: 'a', delta: { archetype: { sales: 3 } } },
    ])
    const result = computeTablePreset(auto, profile)
    expect(result.archetype).toBe('sales')
  })

  it('un delta de layout peut faire basculer vers un autre layout disponible', () => {
    const auto: AutoDetectedTablePreset = {
      archetypeScores: { contacts: 0, sales: 0, inventory: 0, events: 0, generic: 0 },
      availableLayouts: ['table', 'dashboard'],
      defaultLayout: 'table',
    }
    const profile = buildPreferenceProfile([
      { questionId: 'q5', optionId: 'a', delta: { layout: { dashboard: 2 } } },
    ])
    const result = computeTablePreset(auto, profile)
    expect(result.layout).toBe('dashboard')
  })

  it('ne choisit jamais un layout absent des layouts disponibles', () => {
    const auto: AutoDetectedTablePreset = {
      archetypeScores: { contacts: 0, sales: 0, inventory: 0, events: 0, generic: 0 },
      availableLayouts: ['table'],
      defaultLayout: 'table',
    }
    const profile = buildPreferenceProfile([
      { questionId: 'q17', optionId: 'a', delta: { layout: { gallery: 10 } } },
    ])
    const result = computeTablePreset(auto, profile)
    expect(result.layout).toBe('table')
  })
})

describe('shouldShowChartWidget / shouldShowStatsWidget', () => {
  it('est false sous le seuil de 2', () => {
    const profile = buildPreferenceProfile([
      { questionId: 'q5', optionId: 'b', delta: { widget: { chart: 1 } } },
    ])
    expect(shouldShowChartWidget(profile)).toBe(false)
  })

  it('est true au seuil de 2', () => {
    const profile = buildPreferenceProfile([
      { questionId: 'q5', optionId: 'b', delta: { widget: { chart: 1 } } },
      { questionId: 'q7', optionId: 'a', delta: { widget: { chart: 1 } } },
    ])
    expect(shouldShowChartWidget(profile)).toBe(true)
  })

  it('shouldShowStatsWidget suit le même seuil sur widget.stats', () => {
    const profile = buildPreferenceProfile([
      { questionId: 'q6', optionId: 'a', delta: { widget: { stats: 2 } } },
    ])
    expect(shouldShowStatsWidget(profile)).toBe(true)
  })
})
```

- [ ] **Step 2: Lancer les tests et vérifier l'échec**

Run: `cd frontend && npm run test`
Expected: FAIL — `computeTablePreset`, `shouldShowChartWidget`, `shouldShowStatsWidget` not exported.

- [ ] **Step 3: Implémenter**

Append to `frontend/src/lib/preferenceEngine.ts` (après `buildPreferenceProfile`, ajouter aussi l'import en haut du fichier) :

Modifier la ligne d'import en haut du fichier :

```typescript
import { ARCHETYPE_ORDER, DETECTION_THRESHOLD } from './archetype'
import type { TableArchetype } from './archetype'
import type { LayoutKind } from './semantic'
```

Ajouter à la fin du fichier :

```typescript
export interface AutoDetectedTablePreset {
  archetypeScores: Record<TableArchetype, number>
  availableLayouts: LayoutKind[]
  defaultLayout: LayoutKind
}

export interface FinalTablePreset {
  archetype: TableArchetype
  layout: LayoutKind
}

export function computeTablePreset(
  auto: AutoDetectedTablePreset,
  profile: PreferenceProfile,
): FinalTablePreset {
  let bestArchetype: TableArchetype = 'generic'
  let bestScore = 0
  for (const a of ARCHETYPE_ORDER) {
    const score = (auto.archetypeScores[a] ?? 0) + (profile.archetype[a] ?? 0)
    if (score > bestScore) {
      bestArchetype = a
      bestScore = score
    }
  }
  const archetype = bestScore >= DETECTION_THRESHOLD ? bestArchetype : 'generic'

  let bestLayout = auto.defaultLayout
  let bestLayoutScore = 1 + (profile.layout[auto.defaultLayout] ?? 0)
  for (const layout of auto.availableLayouts) {
    if (layout === auto.defaultLayout) continue
    const score = 1 + (profile.layout[layout] ?? 0)
    if (score > bestLayoutScore) {
      bestLayout = layout
      bestLayoutScore = score
    }
  }

  return { archetype, layout: bestLayout }
}

const WIDGET_THRESHOLD = 2

export function shouldShowChartWidget(profile: PreferenceProfile): boolean {
  return profile.widget.chart >= WIDGET_THRESHOLD
}

export function shouldShowStatsWidget(profile: PreferenceProfile): boolean {
  return profile.widget.stats >= WIDGET_THRESHOLD
}
```

Note : `ARCHETYPE_ORDER` termine toujours par `'generic'` (score 0), donc la boucle reproduit exactement l'algorithme de `detectArchetype` quand `profile.archetype` est vide.

- [ ] **Step 4: Lancer les tests et vérifier le succès**

Run: `cd frontend && npm run test`
Expected: PASS — tous les tests de `preferenceEngine.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/preferenceEngine.ts frontend/src/lib/preferenceEngine.test.ts
git commit -m "feat(front): ajouter computeTablePreset et les seuils de widgets"
```

---

### Task 4: `questions.ts` — banque des 20 questions

**Files:**
- Create: `frontend/src/lib/questions.ts`
- Test: `frontend/src/lib/questions.test.ts`

**Interfaces:**
- Consumes: `PreferenceDelta` from `./preferenceEngine` (Task 2).
- Produces: `QuestionOption`, `Question` (types), `CATEGORY_LABELS`, `buildQuestionBank(tables: readonly { tableName: string; rowCount: number }[]): Question[]`.

- [ ] **Step 1: Écrire le test qui échoue**

Create `frontend/src/lib/questions.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { buildQuestionBank } from './questions'

const THREE_TABLES = [
  { tableName: 'clients', rowCount: 500 },
  { tableName: 'commandes', rowCount: 1200 },
  { tableName: 'produits', rowCount: 80 },
]

describe('buildQuestionBank', () => {
  it('retourne exactement 20 questions', () => {
    expect(buildQuestionBank(THREE_TABLES)).toHaveLength(20)
  })

  it('chaque question a entre 2 et 4 options uniques', () => {
    for (const q of buildQuestionBank(THREE_TABLES)) {
      expect(q.options.length).toBeGreaterThanOrEqual(2)
      expect(q.options.length).toBeLessThanOrEqual(4)
      const ids = q.options.map((o) => o.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('les ids de question sont uniques', () => {
    const ids = buildQuestionBank(THREE_TABLES).map((q) => q.id)
    expect(new Set(ids).size).toBe(20)
  })

  it('la question dynamique liste les tables triées par nombre de lignes décroissant, plafonnée à 3, plus une option neutre', () => {
    const q15 = buildQuestionBank(THREE_TABLES).find((q) => q.id === 'q15')!
    expect(q15.options.map((o) => o.label)).toEqual(['commandes', 'clients', 'produits', 'Aucune en particulier'])
  })

  it('avec une seule table, la question dynamique a exactement 2 options', () => {
    const q15 = buildQuestionBank([{ tableName: 'solo', rowCount: 10 }]).find((q) => q.id === 'q15')!
    expect(q15.options).toHaveLength(2)
  })

  it('avec plus de 3 tables, la question dynamique en garde au plus 3 plus l\'option neutre', () => {
    const many = [
      { tableName: 'a', rowCount: 1 },
      { tableName: 'b', rowCount: 2 },
      { tableName: 'c', rowCount: 3 },
      { tableName: 'd', rowCount: 4 },
      { tableName: 'e', rowCount: 5 },
    ]
    const q15 = buildQuestionBank(many).find((q) => q.id === 'q15')!
    expect(q15.options).toHaveLength(4)
  })
})
```

- [ ] **Step 2: Lancer les tests et vérifier l'échec**

Run: `cd frontend && npm run test`
Expected: FAIL — le module `./questions` n'existe pas.

- [ ] **Step 3: Implémenter la banque de questions**

Create `frontend/src/lib/questions.ts`:

```typescript
// Banque des 20 questions du questionnaire de pondération. 19 questions
// statiques + 1 question dynamique (q15, générée à partir des tables
// réellement importées). Module pur, sans dépendance à React.

import type { PreferenceDelta } from './preferenceEngine'

export type QuestionCategory = 'usage' | 'visualisation' | 'edition' | 'volume' | 'style' | 'collaboration'

export interface QuestionOption {
  id: string
  label: string
  delta: PreferenceDelta
}

export interface Question {
  id: string
  category: QuestionCategory
  text: string
  options: QuestionOption[]
}

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  usage: 'Usage & intention',
  visualisation: 'Visualisation & reporting',
  edition: 'Édition & workflow',
  volume: 'Volume & organisation',
  style: 'Style & présentation',
  collaboration: 'Collaboration & accès',
}

const STATIC_QUESTIONS: Question[] = [
  {
    id: 'q1',
    category: 'usage',
    text: 'Qui va utiliser principalement cette webapp ?',
    options: [
      { id: 'solo', label: 'Moi seul, pour suivre mes données', delta: { interaction: 1 } },
      { id: 'team', label: 'Mon équipe en interne', delta: { interaction: 1 } },
      { id: 'external', label: 'Des clients/partenaires externes', delta: { layout: { cards: 1 }, interaction: -1 } },
    ],
  },
  {
    id: 'q2',
    category: 'usage',
    text: 'À quelle fréquence les données vont-elles changer ?',
    options: [
      { id: 'rare', label: 'Rarement (référence stable)', delta: { interaction: -2, layout: { table: 1 } } },
      { id: 'regular', label: 'Régulièrement', delta: { interaction: 2 } },
      { id: 'daily', label: 'Plusieurs fois par jour', delta: { interaction: 2, widget: { stats: 1 } } },
    ],
  },
  {
    id: 'q3',
    category: 'usage',
    text: 'Le but principal de cette webapp est de...',
    options: [
      { id: 'consult', label: 'Consulter et rechercher rapidement l\'information', delta: { layout: { table: 2 }, interaction: -1 } },
      { id: 'follow', label: 'Suivre l\'évolution d\'indicateurs', delta: { layout: { dashboard: 2 }, widget: { stats: 2 } } },
      { id: 'manage', label: 'Gérer et modifier les données au quotidien', delta: { interaction: 2, layout: { table: 1 } } },
      { id: 'showcase', label: 'Présenter les données de façon attractive (catalogue, portfolio)', delta: { layout: { gallery: 2, cards: 1 } } },
    ],
  },
  {
    id: 'q4',
    category: 'usage',
    text: 'Combien de personnes vont utiliser cette webapp en même temps ?',
    options: [
      { id: 'one', label: 'Une seule personne', delta: {} },
      { id: 'small-team', label: 'Une petite équipe (2-10)', delta: { interaction: 1 } },
      { id: 'many', label: 'Beaucoup d\'utilisateurs', delta: { interaction: 1 } },
    ],
  },
  {
    id: 'q5',
    category: 'visualisation',
    text: 'As-tu besoin de graphiques (courbes, barres) pour visualiser les données ?',
    options: [
      { id: 'essential', label: 'Oui, essentiel', delta: { widget: { chart: 3 }, layout: { dashboard: 2 } } },
      { id: 'nice', label: 'Ce serait un plus', delta: { widget: { chart: 1 } } },
      { id: 'no', label: 'Non, pas nécessaire', delta: { widget: { chart: -1 } } },
    ],
  },
  {
    id: 'q6',
    category: 'visualisation',
    text: 'Veux-tu voir des indicateurs clés en un coup d\'œil (totaux, moyennes) ?',
    options: [
      { id: 'yes', label: 'Oui', delta: { widget: { stats: 2 }, layout: { dashboard: 1 } } },
      { id: 'no', label: 'Non, je préfère voir les données brutes', delta: { layout: { table: 1 } } },
    ],
  },
  {
    id: 'q7',
    category: 'visualisation',
    text: 'Le suivi de tendances dans le temps est important ?',
    options: [
      { id: 'yes', label: 'Très important', delta: { widget: { chart: 2 }, archetype: { sales: 1 } } },
      { id: 'no', label: 'Peu important', delta: { widget: { chart: -1 } } },
    ],
  },
  {
    id: 'q8',
    category: 'visualisation',
    text: 'Compares-tu souvent des catégories entre elles (ex : ventes par région) ?',
    options: [
      { id: 'yes', label: 'Oui, souvent', delta: { widget: { chart: 2 }, layout: { dashboard: 1 } } },
      { id: 'no', label: 'Rarement', delta: { widget: { chart: -1 } } },
    ],
  },
  {
    id: 'q9',
    category: 'edition',
    text: 'À quelle fréquence ajoutes-tu de nouvelles lignes ?',
    options: [
      { id: 'often', label: 'Très souvent', delta: { interaction: 2 } },
      { id: 'sometimes', label: 'De temps en temps', delta: { interaction: 1 } },
      { id: 'rare', label: 'Presque jamais', delta: { interaction: -2 } },
    ],
  },
  {
    id: 'q10',
    category: 'edition',
    text: 'As-tu besoin de formulaires détaillés pour chaque entrée ?',
    options: [
      { id: 'detailed', label: 'Oui, beaucoup de champs', delta: { layout: { table: 1 }, interaction: 1 } },
      { id: 'quick', label: 'Non, l\'édition rapide en ligne suffit', delta: { interaction: 2, layout: { table: 2 } } },
    ],
  },
  {
    id: 'q11',
    category: 'edition',
    text: 'Les données doivent-elles être validées avant enregistrement (champs obligatoires, formats) ?',
    options: [
      { id: 'strict', label: 'Oui, strictement', delta: { interaction: 1 } },
      { id: 'flexible', label: 'Non, flexibilité suffisante', delta: {} },
    ],
  },
  {
    id: 'q12',
    category: 'edition',
    text: 'Prévois-tu de supprimer souvent des lignes ?',
    options: [
      { id: 'often', label: 'Oui, régulièrement', delta: { interaction: 1 } },
      { id: 'rare', label: 'Rarement', delta: { interaction: -1 } },
    ],
  },
  {
    id: 'q13',
    category: 'volume',
    text: 'Combien de lignes environ contient ta table principale ?',
    options: [
      { id: 'small', label: 'Moins de 50', delta: { layout: { cards: 1, gallery: 1 } } },
      { id: 'medium', label: 'Entre 50 et 500', delta: { layout: { table: 1 } } },
      { id: 'large', label: 'Plus de 500', delta: { layout: { table: 2 }, widget: { stats: 1 } } },
    ],
  },
  {
    id: 'q14',
    category: 'volume',
    text: 'As-tu besoin de rechercher/filtrer souvent dans les données ?',
    options: [
      { id: 'always', label: 'En permanence', delta: { layout: { table: 2 } } },
      { id: 'sometimes', label: 'Occasionnellement', delta: { layout: { table: 1 } } },
      { id: 'rare', label: 'Rarement', delta: { layout: { cards: 1 } } },
    ],
  },
  {
    id: 'q16',
    category: 'style',
    text: 'Quelle densité d\'affichage préfères-tu ?',
    options: [
      { id: 'compact', label: 'Compacte, voir un maximum d\'information', delta: { density: 2 } },
      { id: 'spacious', label: 'Aérée, plus lisible', delta: { density: -2 } },
    ],
  },
  {
    id: 'q17',
    category: 'style',
    text: 'Les images sont-elles importantes dans tes données (produits, profils…) ?',
    options: [
      { id: 'yes', label: 'Oui, très importantes', delta: { layout: { gallery: 2 } } },
      { id: 'no', label: 'Non, peu ou pas d\'images', delta: { layout: { gallery: -1 } } },
    ],
  },
  {
    id: 'q18',
    category: 'style',
    text: 'Préfères-tu une présentation en tableau classique ou en cartes visuelles ?',
    options: [
      { id: 'table', label: 'Tableau classique', delta: { layout: { table: 2 } } },
      { id: 'cards', label: 'Cartes visuelles', delta: { layout: { cards: 2 } } },
      { id: 'mixed', label: 'Mélange selon la table', delta: {} },
    ],
  },
  {
    id: 'q19',
    category: 'collaboration',
    text: 'Plusieurs personnes modifieront-elles les mêmes données en parallèle ?',
    options: [
      { id: 'yes', label: 'Oui', delta: { interaction: 2 } },
      { id: 'no', label: 'Non, un seul éditeur à la fois', delta: { interaction: -1 } },
    ],
  },
  {
    id: 'q20',
    category: 'collaboration',
    text: 'As-tu besoin de partager cette webapp avec des personnes externes ?',
    options: [
      { id: 'yes', label: 'Oui', delta: { layout: { cards: 1 }, interaction: -1 } },
      { id: 'no', label: 'Non, usage interne uniquement', delta: {} },
    ],
  },
]

function buildPrimaryTableQuestion(
  tables: readonly { tableName: string; rowCount: number }[],
): Question {
  const top = [...tables].sort((a, b) => b.rowCount - a.rowCount).slice(0, 3)
  const options: QuestionOption[] = [
    ...top.map((t) => ({
      id: `primary-${t.tableName}`,
      label: t.tableName,
      delta: { primaryTableName: t.tableName },
    })),
    { id: 'primary-none', label: 'Aucune en particulier', delta: {} },
  ]
  return {
    id: 'q15',
    category: 'volume',
    text: 'Quelle table est la plus importante pour toi ?',
    options,
  }
}

export function buildQuestionBank(
  tables: readonly { tableName: string; rowCount: number }[],
): Question[] {
  const q15 = buildPrimaryTableQuestion(tables)
  return [...STATIC_QUESTIONS.slice(0, 14), q15, ...STATIC_QUESTIONS.slice(14)]
}
```

- [ ] **Step 4: Lancer les tests et vérifier le succès**

Run: `cd frontend && npm run test`
Expected: PASS — tous les tests de `questions.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/questions.ts frontend/src/lib/questions.test.ts
git commit -m "feat(front): ajouter la banque des 20 questions du questionnaire"
```

---

### Task 5: `QuestionCard.tsx`

**Files:**
- Create: `frontend/src/components/steps/QuestionCard.tsx`
- Modify: `frontend/src/App.css`

**Interfaces:**
- Consumes: `Question`, `QuestionOption`, `CATEGORY_LABELS` from `../../lib/questions` (Task 4).
- Produces: `QuestionCard` (default export React component), props `{ question: Question; selectedOptionId: string | null; onSelect: (option: QuestionOption) => void }`.

Pas de test automatisé pour ce composant (aucun composant React du projet n'a de test aujourd'hui — cohérent avec l'existant). Vérifié manuellement en Task 12.

- [ ] **Step 1: Créer le composant**

Create `frontend/src/components/steps/QuestionCard.tsx`:

```typescript
import { CATEGORY_LABELS } from '../../lib/questions'
import type { Question, QuestionOption } from '../../lib/questions'

interface Props {
  question: Question
  selectedOptionId: string | null
  onSelect: (option: QuestionOption) => void
}

function QuestionCard({ question, selectedOptionId, onSelect }: Props) {
  return (
    <div className="question-card">
      <p className="question-card-category">{CATEGORY_LABELS[question.category]}</p>
      <h2 className="question-card-text">{question.text}</h2>
      <div className="question-card-options">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`question-option${selectedOptionId === option.id ? ' selected' : ''}`}
            onClick={() => onSelect(option)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuestionCard
```

- [ ] **Step 2: Ajouter les styles**

Append to `frontend/src/App.css`:

```css
/* ─── Questionnaire ──────────────────────────────────────────────────────────── */
.question-card {
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  background: var(--surface);
  padding: 28px;
  max-width: 560px;
  margin: 0 auto;
}
.question-card-category { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
.question-card-text { font-size: 19px; font-weight: 600; color: var(--text); margin: 0 0 20px; }
.question-card-options { display: flex; flex-direction: column; gap: 10px; }
.question-option {
  text-align: left;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-strong);
  background: var(--surface-alt);
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
}
.question-option.selected { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-text); }
```

- [ ] **Step 3: Vérifier la compilation TypeScript**

Run: `cd frontend && npm run build`
Expected: build réussi, aucune erreur de type (le composant n'est pas encore utilisé mais doit compiler seul).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/steps/QuestionCard.tsx frontend/src/App.css
git commit -m "feat(front): ajouter le composant QuestionCard"
```

---

### Task 6: `StepQuestionnaire.tsx`

**Files:**
- Create: `frontend/src/components/steps/StepQuestionnaire.tsx`
- Modify: `frontend/src/App.css`

**Interfaces:**
- Consumes: `Question`, `QuestionOption` from `../../lib/questions` (Task 4). `QuestionAnswer` from `../../lib/preferenceEngine` (Task 2). `QuestionCard` (Task 5).
- Produces: `StepQuestionnaire` (default export), props `{ questions: Question[]; answers: Record<string, QuestionAnswer>; onAnswer: (answer: QuestionAnswer) => void; onBack: () => void; onCreateWebApp: () => void; isCreating: boolean; error: string | null }`.

- [ ] **Step 1: Créer le composant**

Create `frontend/src/components/steps/StepQuestionnaire.tsx`:

```typescript
import { useState } from 'react'
import type { Question, QuestionOption } from '../../lib/questions'
import type { QuestionAnswer } from '../../lib/preferenceEngine'
import QuestionCard from './QuestionCard'

interface Props {
  questions: Question[]
  answers: Record<string, QuestionAnswer>
  onAnswer: (answer: QuestionAnswer) => void
  onBack: () => void
  onCreateWebApp: () => void
  isCreating: boolean
  error: string | null
}

function StepQuestionnaire({ questions, answers, onAnswer, onBack, onCreateWebApp, isCreating, error }: Props) {
  const [index, setIndex] = useState(0)
  const question = questions[index]
  const total = questions.length
  const selected = answers[question.id]

  const selectOption = (option: QuestionOption) => {
    onAnswer({ questionId: question.id, optionId: option.id, delta: option.delta })
  }

  return (
    <div className="questionnaire-section">
      <div className="questionnaire-progress">
        <div className="questionnaire-progress-bar">
          <div
            className="questionnaire-progress-fill"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <span className="questionnaire-progress-label">Question {index + 1}/{total}</span>
      </div>

      <QuestionCard
        question={question}
        selectedOptionId={selected?.optionId ?? null}
        onSelect={selectOption}
      />

      {error && <div className="confirm-error">{error}</div>}

      <div className="questionnaire-actions">
        <button
          className="btn btn-secondary"
          onClick={index === 0 ? onBack : () => setIndex((i) => i - 1)}
          disabled={isCreating}
        >
          ← {index === 0 ? 'Retour' : 'Précédent'}
        </button>
        {index < total - 1 && (
          <button
            className="btn btn-secondary"
            onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
            disabled={isCreating}
          >
            Suivant →
          </button>
        )}
        <button className="btn-primary btn-ml-auto" onClick={onCreateWebApp} disabled={isCreating}>
          {isCreating ? 'Création en cours…' : 'Créer WebApp'}
        </button>
      </div>
    </div>
  )
}

export default StepQuestionnaire
```

- [ ] **Step 2: Ajouter les styles**

Append to `frontend/src/App.css` (à la suite du bloc questionnaire de la Task 5):

```css
.questionnaire-progress { max-width: 560px; margin: 0 auto 24px; }
.questionnaire-progress-bar { height: 6px; border-radius: 3px; background: var(--surface-alt); overflow: hidden; }
.questionnaire-progress-fill { height: 100%; background: var(--accent); transition: width 0.2s ease; }
.questionnaire-progress-label { display: block; margin-top: 6px; font-size: 12px; color: var(--text-muted); text-align: right; }
.questionnaire-actions { display: flex; gap: 10px; max-width: 560px; margin: 24px auto 0; }
```

- [ ] **Step 3: Vérifier la compilation TypeScript**

Run: `cd frontend && npm run build`
Expected: build réussi.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/steps/StepQuestionnaire.tsx frontend/src/App.css
git commit -m "feat(front): ajouter le wizard StepQuestionnaire"
```

---

### Task 7: Modifier `StepTableConfirmation.tsx`

Le bouton « Créer la base de données » ne crée plus rien directement : il
mène désormais au questionnaire. La création réelle se fait au clic sur
« Créer WebApp » dans `StepQuestionnaire` (Task 9).

**Files:**
- Modify: `frontend/src/components/steps/StepTableConfirmation.tsx`

**Interfaces:**
- Produces: `StepTableConfirmation` props changent de `{ tables, onBack, onConfirm, isCreating?, error? }` à `{ tables, onBack, onNext }`.

- [ ] **Step 1: Modifier les props et le bouton**

Dans `frontend/src/components/steps/StepTableConfirmation.tsx`, remplacer :

```typescript
interface Props {
  tables: TableConfig[]
  onBack: () => void
  onConfirm: () => void
  isCreating?: boolean
  error?: string | null
}

function StepTableConfirmation({ tables, onBack, onConfirm, isCreating = false, error = null }: Props) {
```

par :

```typescript
interface Props {
  tables: TableConfig[]
  onBack: () => void
  onNext: () => void
}

function StepTableConfirmation({ tables, onBack, onNext }: Props) {
```

Puis remplacer le bloc actions en fin de fichier :

```typescript
      {error && <div className="confirm-error">{error}</div>}

      <div className="confirm-actions">
        <button className="btn btn-secondary" onClick={onBack} disabled={isCreating}>← Retour</button>
        <button className="btn-primary" onClick={onConfirm} disabled={isCreating}>
          {isCreating ? 'Création en cours…' : 'Créer la base de données'}
        </button>
      </div>
```

par :

```typescript
      <div className="confirm-actions">
        <button className="btn btn-secondary" onClick={onBack}>← Retour</button>
        <button className="btn-primary" onClick={onNext}>Continuer →</button>
      </div>
```

- [ ] **Step 2: Vérifier la compilation**

Run: `cd frontend && npm run build`
Expected: échec attendu à ce stade — `App.tsx` utilise encore l'ancien nom de prop `onConfirm`. C'est normal, corrigé en Task 9. Vérifier que l'erreur pointe bien vers `App.tsx` (usage de `StepTableConfirmation`) et pas vers ce fichier.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/steps/StepTableConfirmation.tsx
git commit -m "refactor(front): StepTableConfirmation ne fait plus que naviguer vers le questionnaire"
```

---

### Task 8: Backend — table `webapp_sessions` + `session_store.py` + `POST /sessions`

**Files:**
- Create: `backend/services/session_store.py`
- Modify: `backend/api.py`
- Modify: `backend/requirements.txt`
- Test: `backend/tests/test_session_store.py`
- Test: `backend/tests/test_api_sessions.py`

**Interfaces:**
- Produces: `ensure_sessions_table(conn) -> None`, `save_session(conn, schema: dict, preset: dict) -> str` (module `services.session_store`). Endpoint `POST /sessions` acceptant `{ dbSchema: CreatePayload, preset: dict }`, retournant `{ id: str }`.

- [ ] **Step 1: Ajouter pytest et httpx aux dépendances**

Dans `backend/requirements.txt`, ajouter deux lignes :

```
pytest
httpx
```

Run: `cd backend && pip install -r requirements.txt pytest httpx fastapi uvicorn python-multipart psycopg2-binary python-dotenv`
Expected: installation réussie (les paquets API déjà présents selon le README ne sont pas réinstallés inutilement).

- [ ] **Step 2: Écrire le test qui échoue pour `session_store`**

Create `backend/tests/test_session_store.py`:

```python
import os
import sys
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.session_store import ensure_sessions_table, save_session


def _make_mock_conn():
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value = cursor
    return conn, cursor


def test_ensure_sessions_table_executes_create_and_commits():
    conn, cursor = _make_mock_conn()
    ensure_sessions_table(conn)
    assert cursor.execute.call_count == 1
    assert "CREATE TABLE IF NOT EXISTS webapp_sessions" in cursor.execute.call_args[0][0]
    conn.commit.assert_called_once()
    cursor.close.assert_called_once()


def test_save_session_returns_a_uuid_string():
    conn, _ = _make_mock_conn()
    session_id = save_session(conn, {"tables": []}, {"showChartWidget": False})
    assert isinstance(session_id, str)
    assert len(session_id) == 36


def test_save_session_inserts_schema_and_preset_as_json():
    conn, cursor = _make_mock_conn()
    schema = {"tables": [{"tableName": "clients", "columns": [], "rows": []}]}
    preset = {"archetypeOverrides": {}, "layoutOverrides": {}, "showChartWidget": True}

    session_id = save_session(conn, schema, preset)

    insert_call = cursor.execute.call_args_list[-1]
    sql, params = insert_call[0]
    assert "INSERT INTO webapp_sessions" in sql
    assert params[0] == session_id
    assert params[1].adapted == schema
    assert params[2].adapted == preset


def test_save_session_generates_a_different_id_each_call():
    conn, _ = _make_mock_conn()
    id_one = save_session(conn, {"tables": []}, {})
    id_two = save_session(conn, {"tables": []}, {})
    assert id_one != id_two
```

- [ ] **Step 3: Lancer les tests et vérifier l'échec**

Run: `cd backend && python -m pytest tests/test_session_store.py -v`
Expected: FAIL — `services.session_store` n'existe pas.

- [ ] **Step 4: Implémenter `session_store.py`**

Create `backend/services/session_store.py`:

```python
"""Persistance des sessions de génération de webapp (schéma + preset UI).

Fondation pour la reprise de session (.taches/reprise-session.md) : chaque
création génère un identifiant, sauvegardé avec le schéma confirmé et le
preset UI calculé par le questionnaire. Aucun écran de reprise n'est
construit ici.
"""

import uuid

import psycopg2.extras

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS webapp_sessions (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  schema_json JSONB NOT NULL,
  preset_json JSONB NOT NULL
);
"""


def ensure_sessions_table(conn) -> None:
    cursor = conn.cursor()
    try:
        cursor.execute(CREATE_TABLE_SQL)
        conn.commit()
    finally:
        cursor.close()


def save_session(conn, schema: dict, preset: dict) -> str:
    """Enregistre une session et retourne son identifiant (UUID, str)."""
    ensure_sessions_table(conn)
    session_id = str(uuid.uuid4())
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO webapp_sessions (id, schema_json, preset_json) VALUES (%s, %s, %s);",
            (session_id, psycopg2.extras.Json(schema), psycopg2.extras.Json(preset)),
        )
        conn.commit()
    finally:
        cursor.close()
    return session_id
```

- [ ] **Step 5: Lancer les tests et vérifier le succès**

Run: `cd backend && python -m pytest tests/test_session_store.py -v`
Expected: PASS — 4 tests.

- [ ] **Step 6: Écrire le test qui échoue pour l'endpoint**

Create `backend/tests/test_api_sessions.py`:

```python
import os
import sys
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

import api

PAYLOAD = {
    "dbSchema": {"tables": [{"tableName": "clients", "columns": [], "rows": []}]},
    "preset": {"archetypeOverrides": {}, "layoutOverrides": {}, "showChartWidget": False},
}


def test_post_sessions_returns_a_uuid(monkeypatch):
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    monkeypatch.setattr(api, "get_connection", lambda: mock_conn)

    client = TestClient(api.app)
    response = client.post("/sessions", json=PAYLOAD)

    assert response.status_code == 200
    body = response.json()
    assert len(body["id"]) == 36
    mock_conn.close.assert_called_once()


def test_post_sessions_returns_503_when_connection_fails(monkeypatch):
    def _raise():
        raise Exception("boom")
    monkeypatch.setattr(api, "get_connection", _raise)

    client = TestClient(api.app)
    response = client.post("/sessions", json=PAYLOAD)

    assert response.status_code == 503
```

- [ ] **Step 7: Lancer les tests et vérifier l'échec**

Run: `cd backend && python -m pytest tests/test_api_sessions.py -v`
Expected: FAIL — `POST /sessions` renvoie 404 (endpoint inexistant).

- [ ] **Step 8: Implémenter l'endpoint dans `api.py`**

Dans `backend/api.py`, ajouter l'import après les imports de services existants (ligne 18, après `from services.db_creator import create_tables`) :

```python
from services.session_store import save_session
```

Ajouter les modèles après `CreatePayload` (ligne 59) :

```python
class SessionPayload(BaseModel):
    dbSchema: CreatePayload   # "schema" est réservé par Pydantic
    preset: dict


class SessionResponse(BaseModel):
    id: str
```

Ajouter l'endpoint juste après `create_database` (après la fonction se terminant ligne 167) :

```python
@app.post("/sessions", response_model=SessionResponse)
def create_session(payload: SessionPayload):
    try:
        conn = get_connection()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Connexion à la base de données impossible : {exc}"
        )

    try:
        session_id = save_session(conn, payload.dbSchema.model_dump(), payload.preset)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la sauvegarde de la session : {exc}"
        )
    finally:
        conn.close()

    return {"id": session_id}
```

- [ ] **Step 9: Lancer les tests et vérifier le succès**

Run: `cd backend && python -m pytest tests/ -v`
Expected: PASS — tous les tests backend, y compris `test_session_store.py` et `test_api_sessions.py`.

- [ ] **Step 10: Commit**

```bash
git add backend/services/session_store.py backend/api.py backend/requirements.txt backend/tests/test_session_store.py backend/tests/test_api_sessions.py
git commit -m "feat(backend): ajouter la persistance de session (POST /sessions)"
```

---

### Task 9: Brancher le flow dans `App.tsx`

Remplace l'écran `done` par le questionnaire, calcule le profil de
préférences et les overrides initiaux au clic sur « Créer WebApp », appelle
`/create` puis `/sessions`, et transmet le résultat à `GeneratedApp`.

**Files:**
- Modify: `frontend/src/App.tsx` (remplacement complet du fichier)

**Interfaces:**
- Consumes: `StepQuestionnaire` (Task 6), `buildQuestionBank` (Task 4), `buildPreferenceProfile`/`computeTablePreset`/`shouldShowChartWidget`/types (Tasks 2-3), `computeArchetypeScores`/`detectArchetype`/`ARCHETYPE_PRESETS` (Task 1), `analyzeColumns`/`suggestLayouts` from `./lib/semantic`, `StepTableConfirmation` avec les nouvelles props `onNext` (Task 7).
- Produces: `GeneratedApp` reçoit désormais 5 nouvelles props (voir Task 11) : `initialArchetypeOverrides`, `initialLayoutOverrides`, `initialActiveTableId`, `showChartWidget`, `sessionId`.

- [ ] **Step 1: Remplacer le contenu de `frontend/src/App.tsx`**

Ce fichier change sur de nombreux points dispersés (type `Step`, imports,
état, `handleCreate` → `handleCreateWebApp`, suppression de l'écran `done`,
ajout de l'écran `questionnaire`). Remplacer l'intégralité du fichier par :

```typescript
import { useState, useEffect } from 'react'
import './App.css'
import DropZone from './components/DropZone'
import SplitView from './components/layout/SplitView'
import TablePreview from './components/table/TablePreview'
import StepKeySelector from './components/steps/StepKeySelector'
import StepSheetSelector from './components/steps/StepSheetSelector'
import StepTableConfirmation from './components/steps/StepTableConfirmation'
import StepQuestionnaire from './components/steps/StepQuestionnaire'
import StepIndicator from './components/StepIndicator'
import GeneratedApp from './components/app/GeneratedApp'
import { buildQuestionBank } from './lib/questions'
import { analyzeColumns, suggestLayouts } from './lib/semantic'
import type { LayoutKind } from './lib/semantic'
import { ARCHETYPE_PRESETS, computeArchetypeScores, detectArchetype } from './lib/archetype'
import type { TableArchetype } from './lib/archetype'
import { buildPreferenceProfile, computeTablePreset, shouldShowChartWidget } from './lib/preferenceEngine'
import type { AutoDetectedTablePreset, PreferenceProfile, QuestionAnswer } from './lib/preferenceEngine'

export type Step = 'upload' | 'select' | 'config' | 'confirm' | 'questionnaire' | 'app'
export type Theme = 'dark' | 'light'

interface CreatedTable {
  table: string
  rows: number
}

export interface ColumnConfig {
  originalName: string
  name: string
  type: string
  isPrimaryKey: boolean
  isAuto?: boolean
  isPkCandidate?: boolean
  pkScore?: number
  foreignKey?: { refTable: string; refColumn: string } | null
  foreignKeyConfirmed?: boolean
  foreignKeyRefused?: boolean
  excluded?: boolean
}

export interface TableConfig {
  id: string
  sheetName: string
  tableName: string
  columns: ColumnConfig[]
  rows: unknown[][]
}

export interface SheetData {
  name: string
  tables: TableConfig[]
}

interface ParsedColumn  {
  name: string
  type: string
  isPrimaryKey: boolean
  isPkCandidate: boolean
  pkScore: number
  foreignKey?: { refTable: string; refColumn: string } | null
}
interface ParsedTable   { name: string; columns: ParsedColumn[]; rows: unknown[][] }
interface ParsedSheet   { name: string; tables: ParsedTable[] }
interface ParseResponse { sheets: ParsedSheet[] }

interface GeneratedAppSeed {
  archetypeOverrides: Record<string, TableArchetype>
  layoutOverrides: Record<string, LayoutKind>
  primaryTableId: string | null
  showChartWidget: boolean
  sessionId: string | null
}

function App() {
  const [step, setStep]                        = useState<Step>('upload')
  const [sheets, setSheets]                    = useState<SheetData[]>([])
  const [selectedSheetNames, setSelectedNames] = useState<string[]>([])
  const [activeSheetName, setActiveSheetName]  = useState<string | null>(null)
  const [activeTableId, setActiveTableId]      = useState<string | null>(null)
  const [focusedColumn, setFocusedColumn]      = useState<string | null>(null)
  const [isLoading, setIsLoading]              = useState(false)
  const [error, setError]                      = useState<string | null>(null)
  const [isCreating, setIsCreating]            = useState(false)
  const [createError, setCreateError]          = useState<string | null>(null)
  const [createdTables, setCreatedTables]      = useState<CreatedTable[]>([])
  const [answers, setAnswers]                  = useState<Record<string, QuestionAnswer>>({})
  const [appSeed, setAppSeed]                  = useState<GeneratedAppSeed | null>(null)
  const [theme, setTheme]                      = useState<Theme>(
    () => (localStorage.getItem('excelium-theme') as Theme) ?? 'dark'
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('excelium-theme', theme)
  }, [theme])

  const handleFileSelected = async (file: File) => {
    setIsLoading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch('http://localhost:8000/parse', { method: 'POST', body: formData })
      if (!response.ok) throw new Error()
      const data: ParseResponse = await response.json()
      const sheetsData: SheetData[] = data.sheets.map((sheet, si) => ({
        name: sheet.name,
        tables: sheet.tables.map((table, ti) => ({
          id: `${si}-${ti}`,
          sheetName: sheet.name,
          tableName: table.name,
          columns: table.columns.map((col) => ({
            originalName: col.name,
            name: col.name,
            type: col.type,
            isPrimaryKey: col.isPrimaryKey,
            isPkCandidate: col.isPkCandidate,
            pkScore: col.pkScore,
            foreignKey: col.foreignKey ?? null,
          })),
          rows: table.rows,
        })),
      }))
      setSheets(sheetsData)
      setSelectedNames(sheetsData.map((s) => s.name))
      setFocusedColumn(null)
      if (sheetsData.length === 1) {
        enterSheet(sheetsData[0])
        setStep('config')
      } else {
        setStep('select')
      }
    } catch {
      setError('Impossible de lire le fichier. Vérifiez que le backend est lancé.')
    } finally {
      setIsLoading(false)
    }
  }

  const enterSheet = (sheet: SheetData) => {
    setActiveSheetName(sheet.name)
    setActiveTableId(sheet.tables[0]?.id ?? null)
    setFocusedColumn(null)
  }

  const updateTable = (updated: TableConfig) => {
    setSheets((prev) => {
      const oldTable = prev.flatMap((s) => s.tables).find((t) => t.id === updated.id)
      const oldName  = oldTable?.tableName
      const newName  = updated.tableName
      const renamed  = oldTable != null && oldName !== newName
      return prev.map((sheet) => ({
        ...sheet,
        tables: sheet.tables.map((t) => {
          if (t.id === updated.id) return updated
          if (!renamed) return t
          return {
            ...t,
            columns: t.columns.map((col) =>
              col.foreignKey && col.foreignKey.refTable === oldName
                ? { ...col, foreignKey: { ...col.foreignKey, refTable: newName } }
                : col
            ),
          }
        }),
      }))
    })
  }

  const toggleSheet = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  const confirmSelection = () => {
    const firstSelected = sheets.find((s) => selectedSheetNames.includes(s.name))
    if (firstSelected) enterSheet(firstSelected)
    setStep('config')
  }

  // Colonnes/lignes réellement envoyées (colonnes exclues retirées, index alignés)
  const getIncludedTableData = (t: TableConfig) => {
    const includedIdx = t.columns.map((_, i) => i).filter((i) => !t.columns[i].excluded)
    const columns = includedIdx.map((i) => t.columns[i])
    const rows    = t.rows.map((row) => includedIdx.map((i) => row[i]))
    return { columns, rows }
  }

  // Pour chaque table : détection auto (archétype + layouts disponibles),
  // fusionnée avec le profil de préférences du questionnaire.
  const buildInitialOverrides = (tablesToSeed: TableConfig[], profile: PreferenceProfile) => {
    const archetypeOverrides: Record<string, TableArchetype> = {}
    const layoutOverrides: Record<string, LayoutKind> = {}
    for (const t of tablesToSeed) {
      const { columns, rows } = getIncludedTableData(t)
      const analyzed = analyzeColumns(columns, rows)
      const archetypeScores = computeArchetypeScores(analyzed, t.tableName)
      const detected = detectArchetype(analyzed, t.tableName)
      const preset = ARCHETYPE_PRESETS[detected]
      const suggested = suggestLayouts(analyzed)
      const availableLayouts = [...new Set([...suggested, ...preset.extraLayouts])]
      const auto: AutoDetectedTablePreset = { archetypeScores, availableLayouts, defaultLayout: preset.defaultLayout }
      const final = computeTablePreset(auto, profile)
      archetypeOverrides[t.id] = final.archetype
      layoutOverrides[t.id] = final.layout
    }
    return { archetypeOverrides, layoutOverrides }
  }

  const handleAnswer = (answer: QuestionAnswer) => {
    setAnswers((prev) => ({ ...prev, [answer.questionId]: answer }))
  }

  const handleCreateWebApp = async () => {
    setIsCreating(true)
    setCreateError(null)

    const payload = {
      tables: allTables.map((t) => {
        const { columns, rows } = getIncludedTableData(t)
        return {
          tableName: t.tableName,
          columns: columns.map((c) => ({
            name: c.name,
            type: c.type,
            isPrimaryKey: c.isPrimaryKey,
            ...(c.foreignKey && c.foreignKeyConfirmed ? { foreignKey: c.foreignKey } : {}),
          })),
          rows,
        }
      }),
    }

    const profile = buildPreferenceProfile(Object.values(answers))
    const { archetypeOverrides, layoutOverrides } = buildInitialOverrides(allTables, profile)
    const showChartWidget = shouldShowChartWidget(profile)
    const primaryTableId = profile.primaryTableHint
      ? allTables.find((t) => t.tableName === profile.primaryTableHint)?.id ?? null
      : null

    try {
      const response = await fetch('http://localhost:8000/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.detail ?? 'Erreur inconnue lors de la création.')
      setCreatedTables(data.created ?? [])

      let newSessionId: string | null = null
      try {
        const sessionRes = await fetch('http://localhost:8000/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dbSchema: payload,
            preset: { archetypeOverrides, layoutOverrides, showChartWidget, primaryTableId },
          }),
        })
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          newSessionId = sessionData.id ?? null
        }
      } catch {
        // La sauvegarde de session est secondaire : son échec ne bloque pas l'ouverture de la webapp.
      }

      setAppSeed({ archetypeOverrides, layoutOverrides, primaryTableId, showChartWidget, sessionId: newSessionId })
      setStep('app')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erreur lors de la création.')
    } finally {
      setIsCreating(false)
    }
  }

  const resetAll = () => {
    setSheets([])
    setSelectedNames([])
    setActiveSheetName(null)
    setActiveTableId(null)
    setFocusedColumn(null)
    setCreatedTables([])
    setCreateError(null)
    setError(null)
    setAnswers({})
    setAppSeed(null)
    setStep('upload')
  }

  const showSelect      = sheets.length > 1
  const selectedSheets  = sheets.filter((s) => selectedSheetNames.includes(s.name))
  const allTables       = selectedSheets.flatMap((s) => s.tables)
  const activeSheet     = selectedSheets.find((s) => s.name === activeSheetName) ?? selectedSheets[0] ?? null
  const activeTable     = activeSheet?.tables.find((t) => t.id === activeTableId) ?? activeSheet?.tables[0] ?? null
  const missingKeyCount = allTables.filter((t) => !t.columns.some((c) => c.isPrimaryKey && !c.excluded)).length

  const tableNames         = allTables.map((t) => t.tableName)
  const duplicateNames     = tableNames.filter((name, idx) => tableNames.indexOf(name) !== idx)
  const emptyTableName     = allTables.some((t) => !t.tableName.trim())
  const emptyColName       = allTables.some((t) => t.columns.filter((c) => !c.excluded).some((c) => !c.name.trim()))
  const hasDuplicateColNames = allTables.some((t) => {
    const names = t.columns.filter((c) => !c.excluded).map((c) => c.name.trim())
    return new Set(names).size !== names.length
  })
  const canProceed = missingKeyCount === 0 && duplicateNames.length === 0
    && !emptyTableName && !emptyColName && !hasDuplicateColNames

  const indicatorSteps = showSelect
    ? [
        { key: 'upload', label: 'Importer'   },
        { key: 'select', label: 'Feuilles'   },
        { key: 'config', label: 'Configurer' },
        { key: 'confirm', label: 'Créer'     },
        { key: 'questionnaire', label: 'Personnaliser' },
      ]
    : [
        { key: 'upload', label: 'Importer'   },
        { key: 'config', label: 'Configurer' },
        { key: 'confirm', label: 'Créer'     },
        { key: 'questionnaire', label: 'Personnaliser' },
      ]

  return (
    <div className="app-shell">

      <header className="app-header">
        <span className="app-header-logo">Excelium</span>
        <span className="app-header-sep">|</span>
        <span className="app-header-tagline">Excel → Base de données</span>
        <button
          className="app-theme-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Soft Sand'}
        </button>
      </header>

      <main className="app-main">

        {step !== 'app' && (
          <StepIndicator steps={indicatorSteps} currentKey={step} />
        )}

        {/* Étape 1 : Importer */}
        {step === 'upload' && (
          <div className="upload-section">
            <h1 className="upload-title">Importez votre fichier Excel</h1>
            <p className="upload-desc">
              Déposez un fichier{' '}
              <code className="upload-code">.xlsx</code>{' '}
              — Excelium détecte les feuilles, les colonnes et leurs types.
            </p>
            <DropZone onFileSelected={handleFileSelected} />
            {isLoading && <p className="upload-loading">Analyse du fichier en cours…</p>}
            {error    && <p className="upload-error">{error}</p>}
          </div>
        )}

        {/* Étape 2 : Sélection des feuilles */}
        {step === 'select' && (
          <StepSheetSelector
            sheets={sheets}
            selected={selectedSheetNames}
            onToggle={toggleSheet}
            onBack={() => setStep('upload')}
            onConfirm={confirmSelection}
          />
        )}

        {/* Étape 3 : Configurer */}
        {step === 'config' && activeSheet && activeTable && (
          <div>
            {selectedSheets.length > 1 && (
              <div className="config-tabs">
                {selectedSheets.map((sheet) => (
                  <button
                    key={sheet.name}
                    onClick={() => enterSheet(sheet)}
                    className={`config-tab${sheet.name === activeSheet.name ? ' active' : ''}`}
                  >
                    {sheet.name}
                  </button>
                ))}
              </div>
            )}

            {selectedSheets.length === 1 && activeSheet.tables.length > 1 && (
              <p className="config-sheet-label">
                Feuille :{' '}
                <strong>{activeSheet.name}</strong>
              </p>
            )}

            {activeSheet.tables.length > 1 && (
              <div className="config-table-selector">
                <span className="config-table-label">Tableau :</span>
                {activeSheet.tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => { setActiveTableId(table.id); setFocusedColumn(null) }}
                    className={`config-pill${table.id === activeTable.id ? ' active' : ''}`}
                  >
                    {table.tableName}
                  </button>
                ))}
              </div>
            )}

            <SplitView
              left={
                <TablePreview
                  columns={activeTable.columns}
                  rows={activeTable.rows}
                  focusedColumn={focusedColumn}
                />
              }
              right={
                <StepKeySelector
                  config={activeTable}
                  allTables={allTables}
                  onChange={updateTable}
                  onFocusColumn={setFocusedColumn}
                />
              }
            />

            <div className="config-nav">
              <button className="btn btn-secondary" onClick={() => setStep(showSelect ? 'select' : 'upload')}>
                ← Retour
              </button>

              {missingKeyCount > 0 && (
                <span className="config-nav-warn">
                  {missingKeyCount} table{missingKeyCount > 1 ? 's' : ''} sans identifiant
                </span>
              )}
              {duplicateNames.length > 0 && (
                <span className="config-nav-error">
                  Tableaux en double : {[...new Set(duplicateNames)].join(', ')}
                </span>
              )}
              {emptyTableName    && <span className="config-nav-error">Nom de tableau vide</span>}
              {emptyColName      && <span className="config-nav-error">Nom de colonne vide</span>}
              {hasDuplicateColNames && <span className="config-nav-error">Colonnes en double dans un tableau</span>}

              <button
                className="btn-primary btn-ml-auto"
                onClick={() => setStep('confirm')}
                disabled={!canProceed}
              >
                Vérifier et créer →
              </button>
            </div>
          </div>
        )}

        {/* Étape 4 : Récapitulatif */}
        {step === 'confirm' && (
          <StepTableConfirmation
            tables={allTables}
            onBack={() => setStep('config')}
            onNext={() => setStep('questionnaire')}
          />
        )}

        {/* Étape 5 : Questionnaire de pondération */}
        {step === 'questionnaire' && (
          <StepQuestionnaire
            questions={buildQuestionBank(allTables.map((t) => ({ tableName: t.tableName, rowCount: t.rows.length })))}
            answers={answers}
            onAnswer={handleAnswer}
            onBack={() => setStep('confirm')}
            onCreateWebApp={handleCreateWebApp}
            isCreating={isCreating}
            error={createError}
          />
        )}

        {step === 'app' && appSeed && (
          <GeneratedApp
            tables={allTables}
            onBack={() => setStep('confirm')}
            initialArchetypeOverrides={appSeed.archetypeOverrides}
            initialLayoutOverrides={appSeed.layoutOverrides}
            initialActiveTableId={appSeed.primaryTableId}
            showChartWidget={appSeed.showChartWidget}
            sessionId={appSeed.sessionId}
          />
        )}

      </main>
    </div>
  )
}

export default App
```

Notes sur ce remplacement :
- `createdTables` reste utilisé (Task future de reprise de session pourra s'en
  servir) même s'il n'est plus affiché à l'écran — TypeScript ne s'en plaint
  pas car c'est un setter d'état utilisé (`setCreatedTables`), pas une
  variable non lue.
- `confirmedLinks` et l'écran `done` sont supprimés (plus utilisés nulle
  part).

- [ ] **Step 2: Vérifier la compilation**

Run: `cd frontend && npm run build`
Expected: échec attendu — `GeneratedApp` n'accepte pas encore les nouvelles props (`initialArchetypeOverrides`, etc.), corrigé en Task 11.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(front): brancher le questionnaire dans le flow principal"
```

---

### Task 10: Recharts + `ChartWidget.tsx` + intégration dans `DashboardView.tsx`

**Files:**
- Create: `frontend/src/components/app/ChartWidget.tsx`
- Modify: `frontend/src/components/app/DashboardView.tsx`
- Modify: `frontend/src/App.css`

(`recharts` a déjà été ajouté à `package.json` en Task 1.)

**Interfaces:**
- Consumes: `AnalyzedColumn`, `isMetricRole` from `../../lib/semantic`.
- Produces: `ChartWidget` (default export), props `{ columns: AnalyzedColumn[]; rows: unknown[][] }`, retourne `null` si aucune combinaison de colonnes exploitable. `DashboardView` accepte une nouvelle prop optionnelle `showChart?: boolean` (défaut `false`).

- [ ] **Step 1: Créer `ChartWidget.tsx`**

Create `frontend/src/components/app/ChartWidget.tsx`:

```typescript
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AnalyzedColumn } from '../../lib/semantic'
import { isMetricRole } from '../../lib/semantic'

interface Props { columns: AnalyzedColumn[]; rows: unknown[][] }

interface ChartPoint { label: string; value: number }

function buildCategoryChart(columns: AnalyzedColumn[], rows: unknown[][]): ChartPoint[] | null {
  const categoryCol = columns.find((c) => c.role === 'category' || c.role === 'status')
  const metricCol   = columns.find((c) => isMetricRole(c.role))
  if (!categoryCol || !metricCol) return null

  const totals = new Map<string, number>()
  for (const row of rows) {
    const key   = String(row[categoryCol.index] ?? '—')
    const value = Number(row[metricCol.index])
    if (isNaN(value)) continue
    totals.set(key, (totals.get(key) ?? 0) + value)
  }
  if (totals.size === 0) return null
  return [...totals.entries()].map(([label, value]) => ({ label, value }))
}

function buildTimeChart(columns: AnalyzedColumn[], rows: unknown[][]): ChartPoint[] | null {
  const dateCol   = columns.find((c) => c.role === 'date')
  const metricCol = columns.find((c) => isMetricRole(c.role))
  if (!dateCol || !metricCol) return null

  const points = rows
    .map((row) => ({
      label: String(row[dateCol.index] ?? ''),
      value: Number(row[metricCol.index]),
      time: Date.parse(String(row[dateCol.index])),
    }))
    .filter((p) => p.label && !isNaN(p.value) && !isNaN(p.time))
    .sort((a, b) => a.time - b.time)

  if (points.length < 2) return null
  return points.map(({ label, value }) => ({ label, value }))
}

function ChartWidget({ columns, rows }: Props) {
  const timeSeries     = buildTimeChart(columns, rows)
  const categorySeries = !timeSeries ? buildCategoryChart(columns, rows) : null
  const data = timeSeries ?? categorySeries
  if (!data) return null

  return (
    <div className="chart-widget">
      <ResponsiveContainer width="100%" height={220}>
        {timeSeries ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
            <Tooltip />
            <Bar dataKey="value" fill="var(--accent)" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export default ChartWidget
```

- [ ] **Step 2: Intégrer dans `DashboardView.tsx`**

Dans `frontend/src/components/app/DashboardView.tsx`, remplacer :

```typescript
import type { AnalyzedColumn } from '../../lib/semantic'
import { isMetricRole } from '../../lib/semantic'

interface Props { columns: AnalyzedColumn[]; rows: unknown[][] }
```

par :

```typescript
import type { AnalyzedColumn } from '../../lib/semantic'
import { isMetricRole } from '../../lib/semantic'
import ChartWidget from './ChartWidget'

interface Props { columns: AnalyzedColumn[]; rows: unknown[][]; showChart?: boolean }
```

Et remplacer :

```typescript
function DashboardView({ columns, rows }: Props) {
```

par :

```typescript
function DashboardView({ columns, rows, showChart = false }: Props) {
```

Et remplacer le `return` final :

```typescript
  return (
    <div className="dashboard-grid">
      {stats.map((s, i) => <Stat key={i} label={s.label} value={s.value} />)}
    </div>
  )
```

par :

```typescript
  return (
    <div>
      <div className="dashboard-grid">
        {stats.map((s, i) => <Stat key={i} label={s.label} value={s.value} />)}
      </div>
      {showChart && <ChartWidget columns={columns} rows={rows} />}
    </div>
  )
```

- [ ] **Step 3: Ajouter les styles**

Dans `frontend/src/App.css`, juste après le bloc `/* ─── DashboardView ─── */` existant (après la ligne `.stat-value { ... }`), ajouter :

```css
.chart-widget { margin-top: 16px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); padding: 16px 18px; }
```

- [ ] **Step 4: Vérifier la compilation**

Run: `cd frontend && npm run build`
Expected: build réussi (DashboardView compile ; `showChart` n'est pas encore passé par `GeneratedApp`, ce qui est acceptable car la prop est optionnelle avec valeur par défaut).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/app/ChartWidget.tsx frontend/src/components/app/DashboardView.tsx frontend/src/App.css
git commit -m "feat(front): ajouter le widget graphique (Recharts) au dashboard"
```

---

### Task 11: `GeneratedApp.tsx` — overrides initiaux, widget graphique, bandeau de session

**Files:**
- Modify: `frontend/src/components/app/GeneratedApp.tsx`
- Modify: `frontend/src/App.css`

**Interfaces:**
- Consumes: `TableArchetype` from `../../lib/archetype`, `LayoutKind` from `../../lib/semantic`.
- Produces: `GeneratedApp` props étendues : `{ tables, onBack, initialArchetypeOverrides: Record<string, TableArchetype>, initialLayoutOverrides: Record<string, LayoutKind>, initialActiveTableId: string | null, showChartWidget: boolean, sessionId: string | null }`.

- [ ] **Step 1: Étendre les props et l'état initial**

Dans `frontend/src/components/app/GeneratedApp.tsx`, remplacer :

```typescript
interface Props { tables: TableConfig[]; onBack: () => void }
type FormMode = 'create' | 'edit' | null
```

par :

```typescript
interface Props {
  tables: TableConfig[]
  onBack: () => void
  initialArchetypeOverrides: Record<string, TableArchetype>
  initialLayoutOverrides: Record<string, LayoutKind>
  initialActiveTableId: string | null
  showChartWidget: boolean
  sessionId: string | null
}
type FormMode = 'create' | 'edit' | null
```

Puis remplacer la signature et les premières lignes du composant :

```typescript
function GeneratedApp({ tables, onBack }: Props) {
  // Onglet actif : index de table, ou 'custom' pour « Ma vue »
  const [activeTab, setActiveTab] = useState<number | 'custom'>(0)
  const activeIndex = typeof activeTab === 'number' ? activeTab : 0
  // Choix manuels de l'utilisateur, par table (absent = suivre la suggestion)
  const [archetypeOverrides, setArchetypeOverrides] = useState<Record<string, TableArchetype>>({})
  const [layoutOverrides, setLayoutOverrides] = useState<Record<string, LayoutKind>>({})
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
```

par :

```typescript
function GeneratedApp({
  tables, onBack,
  initialArchetypeOverrides, initialLayoutOverrides, initialActiveTableId,
  showChartWidget, sessionId,
}: Props) {
  const initialTabIndex = initialActiveTableId
    ? Math.max(0, tables.findIndex((t) => t.id === initialActiveTableId))
    : 0
  // Onglet actif : index de table, ou 'custom' pour « Ma vue »
  const [activeTab, setActiveTab] = useState<number | 'custom'>(initialTabIndex)
  const activeIndex = typeof activeTab === 'number' ? activeTab : 0
  // Choix par table : préremplis par le questionnaire, modifiables ensuite
  const [archetypeOverrides, setArchetypeOverrides] = useState<Record<string, TableArchetype>>(initialArchetypeOverrides)
  const [layoutOverrides, setLayoutOverrides] = useState<Record<string, LayoutKind>>(initialLayoutOverrides)
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
```

- [ ] **Step 2: Passer `showChartWidget` à `DashboardView`**

Remplacer :

```typescript
          {effectiveLayout === 'dashboard' && <DashboardView columns={analyzed} rows={displayRows} />}
```

par :

```typescript
          {effectiveLayout === 'dashboard' && <DashboardView columns={analyzed} rows={displayRows} showChart={showChartWidget} />}
```

- [ ] **Step 3: Ajouter le bandeau de session dans la toolbar**

Remplacer :

```typescript
        <div className="export-btns">
          <a href={`${API}/export/excel?tables=${tableParam}`} download="export.xlsx" className="export-btn export-btn-excel">↓ Excel</a>
          <a href={`${API}/export/sql?tables=${tableParam}`}   download="export.sql"  className="export-btn export-btn-sql">↓ SQL</a>
        </div>
      </div>
```

par :

```typescript
        <div className="export-btns">
          {sessionId && (
            <button
              type="button"
              className="session-badge"
              title="Copier l'identifiant de session"
              onClick={() => {
                navigator.clipboard.writeText(sessionId)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              Session : {sessionId.slice(0, 8)}… {copied ? '✓ copié' : '⧉'}
            </button>
          )}
          <a href={`${API}/export/excel?tables=${tableParam}`} download="export.xlsx" className="export-btn export-btn-excel">↓ Excel</a>
          <a href={`${API}/export/sql?tables=${tableParam}`}   download="export.sql"  className="export-btn export-btn-sql">↓ SQL</a>
        </div>
      </div>
```

- [ ] **Step 4: Ajouter les styles du bandeau de session**

Append to `frontend/src/App.css`:

```css
.session-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 6px;
  border: 1px solid var(--border-strong); background: var(--surface-alt);
  color: var(--text-muted); font-size: 12px; font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
}
.session-badge:hover { border-color: var(--accent); color: var(--accent-text); }
```

- [ ] **Step 5: Vérifier la compilation**

Run: `cd frontend && npm run build`
Expected: build réussi, aucune erreur de type. `App.tsx` (Task 9) et `GeneratedApp.tsx` sont maintenant cohérents.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/app/GeneratedApp.tsx frontend/src/App.css
git commit -m "feat(front): préremplir GeneratedApp avec le preset du questionnaire et afficher la session"
```

---

### Task 12: Vérification manuelle end-to-end

Aucun test automatisé de bout en bout n'existe dans ce projet (pas de
Playwright configuré). Cette tâche est une checklist manuelle dans un
navigateur, à exécuter avec un PostgreSQL local configuré (`backend/.env`).

**Files:** aucun (vérification uniquement).

- [ ] **Step 1: Démarrer le backend**

Run: `cd backend && uvicorn api:app --reload`
Expected: `INFO: Uvicorn running on http://127.0.0.1:8000`, `/docs` accessible.

- [ ] **Step 2: Démarrer le frontend**

Run: `cd frontend && npm run dev`
Expected: serveur Vite sur `http://localhost:5173`.

- [ ] **Step 3: Parcours complet avec réponses au questionnaire**

Dans le navigateur : importer un `.xlsx` de `data/` (ex. avec une colonne
date + une colonne montant, pour déclencher le widget graphique), passer
`config` → `confirm` → cliquer « Continuer → ». Vérifier :
- La barre de progression affiche « Question 1/20 ».
- Naviguer avec « Suivant »/« Précédent », vérifier que la sélection
  précédente reste visible en revenant en arrière.
- Répondre « Oui, essentiel » à la question sur les graphiques (catégorie
  Visualisation) puis avancer jusqu'à la fin, cliquer « Créer WebApp ».
- La webapp générée s'ouvre directement (pas d'écran intermédiaire), le
  tableau de bord affiche un graphique si les colonnes le permettent, et un
  badge « Session : xxxxxxxx… ⧉ » apparaît dans la barre d'export ; cliquer
  dessus copie l'UUID (vérifier via collage dans un champ texte).

- [ ] **Step 4: Interruption du questionnaire**

Répéter l'import, cliquer « Continuer → » puis directement « Créer WebApp »
sans répondre à aucune question. Vérifier que la webapp s'ouvre normalement
avec les templates identiques à ceux obtenus avant cette fonctionnalité
(détection automatique pure, aucune régression visible).

- [ ] **Step 5: Vérifier la ligne en base**

Run (`psql` ou l'outil disponible) :
```sql
SELECT id, created_at, jsonb_pretty(preset_json) FROM webapp_sessions ORDER BY created_at DESC LIMIT 1;
```
Expected: une ligne récente avec un `preset_json` contenant `archetypeOverrides`, `layoutOverrides`, `showChartWidget`.

- [ ] **Step 6: Lancer la suite de tests complète une dernière fois**

Run: `cd frontend && npm run test && npm run build`
Run: `cd backend && python -m pytest tests/ -v`
Expected: tout est vert.

Aucun commit pour cette tâche (vérification uniquement). Si un problème est
détecté, revenir à la task concernée, corriger, et committer le correctif.
