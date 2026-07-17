// Détection d'archétype : déduit le « type métier » d'une table entière
// (Contacts, Ventes, Inventaire, Événements) à partir des rôles sémantiques
// des colonnes et de leurs noms. Module pur et testable, jumeau de semantic.ts.

import type { AnalyzedColumn, LayoutKind, SemanticRole } from './semantic'

export type TableArchetype = 'contacts' | 'sales' | 'inventory' | 'events' | 'generic'

export interface ArchetypePreset {
  label: string
  description: string
  // Layout appliqué par défaut quand ce template est actif
  defaultLayout: LayoutKind
  // Layouts ajoutés en plus de ceux suggérés par le contenu (suggestLayouts)
  extraLayouts: LayoutKind[]
  // Tri par défaut : première colonne portant ce rôle
  sort?: { role: SemanticRole; direction: 'asc' | 'desc' }
}

export const ARCHETYPE_PRESETS: Record<TableArchetype, ArchetypePreset> = {
  contacts: {
    label: 'Annuaire de personnes',
    description: 'Annuaire de personnes',
    defaultLayout: 'cards',
    extraLayouts: ['cards'],
    sort: { role: 'title', direction: 'asc' },
  },
  sales: {
    label: 'Ventes',
    description: 'Registre de transactions',
    defaultLayout: 'table',
    extraLayouts: ['dashboard'],
    sort: { role: 'date', direction: 'desc' },
  },
  inventory: {
    label: 'Inventaire',
    description: 'Catalogue de produits',
    defaultLayout: 'cards',
    extraLayouts: ['cards', 'dashboard'],
    sort: { role: 'title', direction: 'asc' },
  },
  events: {
    label: 'Événements',
    description: 'Agenda / planning',
    defaultLayout: 'table',
    extraLayouts: ['cards'],
    sort: { role: 'date', direction: 'asc' },
  },
  generic: {
    label: 'Générique',
    description: 'Table standard',
    defaultLayout: 'table',
    extraLayouts: [],
  },
}

export const ARCHETYPE_ORDER: TableArchetype[] = ['contacts', 'sales', 'inventory', 'events', 'generic']

// --- Signaux de détection (noms de colonnes) ---
const EMAIL_RE   = /(mail|courriel)/i
const PHONE_RE   = /(t[ée]l[ée]?p?h?|phone|portable|mobile|gsm|fax)/i
const PERSON_RE  = /(^nom|pr[ée]nom|first.?name|last.?name|contact|employ[ée]|personne|utilisateur|user|[ée]l[èe]ve|[ée]tudiant|student|pupil|learner)/i
const PERSONAL_DETAIL_RE = /(age|âge|naissance|birth|birthday|date.?of.?birth|dob)/i
const PLACE_RE   = /(lieu|ville|adresse|city|location|salle|pays|address)/i
const QTY_RE     = /(stock|quantit|qty|quantity|inventaire|unit[ée]s?$)/i
const PRODUCT_RE = /(produit|article|item|product)/i
const CLIENT_RE  = /(client|customer|acheteur|fournisseur|vendeur)/i
const EVENT_RE   = /([ée]v[ée]nement|event|r[ée]union|meeting|rendez|rdv|s[ée]ance|session|conf[ée]rence|atelier)/i

// Signaux sur le nom de la table (indice fort)
const TABLE_NAME_RE: Partial<Record<TableArchetype, RegExp>> = {
  contacts:  /(contact|client|personne|employ|membre|user|utilisateur|annuaire|[ée]l[èe]ve|[ée]tudiant|student|pupil|learner)/i,
  sales:     /(vente|sale|commande|order|transaction|facture|achat)/i,
  inventory: /(produit|product|inventaire|stock|catalogue|article)/i,
  events:    /([ée]v[ée]nement|event|planning|agenda|r[ée]union|calendrier)/i,
}

interface Signals {
  hasEmail: boolean
  hasPhone: boolean
  hasPerson: boolean
  hasPersonalDetails: boolean
  hasPlace: boolean
  hasQty: boolean
  hasProduct: boolean
  hasClient: boolean
  hasEvent: boolean
  hasDate: boolean
  hasCurrency: boolean
  hasCategory: boolean
}

function collectSignals(columns: AnalyzedColumn[]): Signals {
  const names = columns.map((c) => c.name)
  const roles = new Set(columns.map((c) => c.role))
  const anyName = (re: RegExp) => names.some((n) => re.test(n))

  return {
    hasEmail: anyName(EMAIL_RE),
    hasPhone: anyName(PHONE_RE),
    hasPerson: anyName(PERSON_RE),
    hasPersonalDetails: anyName(PERSONAL_DETAIL_RE),
    hasPlace: anyName(PLACE_RE),
    hasQty: anyName(QTY_RE),
    hasProduct: anyName(PRODUCT_RE),
    hasClient: anyName(CLIENT_RE),
    hasEvent: anyName(EVENT_RE),
    hasDate: roles.has('date'),
    hasCurrency: roles.has('currency'),
    hasCategory: roles.has('category'),
  }
}

// Chaque archétype reçoit un score ; le meilleur gagne s'il dépasse le seuil.
function scoreArchetypes(s: Signals, tableName: string): Record<TableArchetype, number> {
  const nameBonus = (a: TableArchetype) => (TABLE_NAME_RE[a]?.test(tableName) ? 3 : 0)

  return {
    contacts:
      (s.hasEmail ? 3 : 0) + (s.hasPhone ? 2 : 0) + (s.hasPerson ? 2 : 0) +
      (s.hasPerson && s.hasPersonalDetails ? 2 : 0) +
      (s.hasCurrency ? -2 : 0) + nameBonus('contacts'),
    sales:
      (s.hasDate && s.hasCurrency ? 3 : 0) + (s.hasClient ? 2 : 0) +
      (s.hasProduct ? 1 : 0) + nameBonus('sales'),
    inventory:
      (s.hasCurrency && s.hasQty ? 3 : 0) + (s.hasProduct ? 2 : 0) +
      (s.hasCategory ? 1 : 0) + (s.hasDate ? -1 : 0) + nameBonus('inventory'),
    events:
      (s.hasDate && (s.hasEvent || s.hasPlace) ? 3 : 0) + (s.hasPlace ? 1 : 0) +
      (s.hasEvent ? 1 : 0) + (s.hasCurrency ? -1 : 0) + nameBonus('events'),
    generic: 0,
  }
}

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

// --- Tri par défaut du preset (immutable : retourne une copie triée) ---
function compareValues(a: unknown, b: unknown): number {
  const na = Number(a)
  const nb = Number(b)
  if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).trim() !== '' && String(b).trim() !== '') {
    return na - nb
  }
  const da = Date.parse(String(a))
  const db = Date.parse(String(b))
  if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db
  return String(a ?? '').localeCompare(String(b ?? ''), 'fr', { sensitivity: 'base' })
}

// Ordre d'affichage : indices des lignes triés selon le preset.
// Permet de retrouver la ligne d'origine (CRUD) depuis une position affichée.
export function presetSortOrder(
  rows: unknown[][],
  columns: AnalyzedColumn[],
  preset: ArchetypePreset,
): number[] {
  const indices = rows.map((_, i) => i)
  if (!preset.sort) return indices
  const col = columns.find((c) => c.role === preset.sort!.role)
  if (!col) return indices

  const dir = preset.sort.direction === 'asc' ? 1 : -1
  return indices.sort((a, b) => dir * compareValues(rows[a][col.index], rows[b][col.index]))
}

export function applyPresetSort(
  rows: unknown[][],
  columns: AnalyzedColumn[],
  preset: ArchetypePreset,
): unknown[][] {
  return presetSortOrder(rows, columns, preset).map((i) => rows[i])
}
