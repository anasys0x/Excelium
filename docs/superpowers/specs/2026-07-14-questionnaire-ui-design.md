# Questionnaire de pondération pour la génération d'UI

Date : 2026-07-14
Statut : Validé (design), en attente de plan d'implémentation

## Contexte

Aujourd'hui, entre l'étape `confirm` (récapitulatif des tables) et l'affichage
de la webapp générée (`GeneratedApp`), aucune question n'est posée à
l'utilisateur. Le choix des layouts (`table`, `gallery`, `dashboard`, `cards`)
et des widgets de cellule repose uniquement sur une détection automatique
(`detectArchetype` dans `frontend/src/lib/archetype.ts`, `suggestLayouts`
dans `frontend/src/lib/semantic.ts`) basée sur les noms/types de colonnes.

Objectif : ajouter un questionnaire de 20 questions (pondéré) qui affine ce
choix, sans remplacer la détection automatique. L'utilisateur peut
interrompre le questionnaire à tout moment et cliquer sur **« Créer WebApp »**.

## Flow

Nouvel ordre des étapes (state machine `Step` dans `App.tsx`) :

```
upload → select → config → confirm → questionnaire → app
```

- L'écran `done` intermédiaire disparaît.
- `questionnaire` est un nouveau `Step`, affiché juste après validation de
  `confirm`.
- Le bouton « Créer WebApp » est visible dès la première question. Il
  déclenche `POST /create` (création BD, inchangé) + `POST /sessions`
  (nouveau, voir plus bas) + affichage direct de `GeneratedApp` avec le
  preset calculé.
- Les questions non répondues au moment du clic n'apportent aucun poids ; le
  résultat final retombe sur la détection automatique pour les dimensions
  non couvertes par des réponses.

## Banque de questions

20 questions, choix unique, 2 à 4 options chacune, réparties en 6 catégories.
Chaque option porte des deltas de poids sur des dimensions fixes :

- `archetype` : `contacts | sales | inventory | events` (delta ajouté au
  score existant de `detectArchetype`)
- `layout` : `table | gallery | dashboard | cards` (delta ajouté au score
  existant de `suggestLayouts`)
- `widget` : `chart | stats` (accumulateur, seuil déclenche l'ajout du
  widget)
- `interaction` : scalaire signé, positif = édition, négatif = consultation
- `density` : scalaire signé, positif = compact, négatif = aéré

### 1. Usage & intention

1. Qui va utiliser principalement cette webapp ?
   - Moi seul, pour suivre mes données — `interaction:+1`
   - Mon équipe en interne — `interaction:+1`, `collaboration:+1`
   - Des clients/partenaires externes — `layout.cards:+1`, `interaction:-1`
2. À quelle fréquence les données vont-elles changer ?
   - Rarement (référence stable) — `interaction:-2`, `layout.table:+1`
   - Régulièrement — `interaction:+2`
   - Plusieurs fois par jour — `interaction:+2`, `widget.stats:+1`
3. Le but principal de cette webapp est de...
   - Consulter et rechercher rapidement l'information — `layout.table:+2`, `interaction:-1`
   - Suivre l'évolution d'indicateurs — `layout.dashboard:+2`, `widget.stats:+2`
   - Gérer et modifier les données au quotidien — `interaction:+2`, `layout.table:+1`
   - Présenter les données de façon attractive (catalogue, portfolio) — `layout.gallery:+2`, `layout.cards:+1`
4. Combien de personnes vont utiliser cette webapp en même temps ?
   - Une seule personne — `collaboration:-1`
   - Une petite équipe (2-10) — `collaboration:+1`
   - Beaucoup d'utilisateurs — `collaboration:+2`

### 2. Visualisation & reporting

5. As-tu besoin de graphiques (courbes, barres) pour visualiser les données ?
   - Oui, essentiel — `widget.chart:+3`, `layout.dashboard:+2`
   - Ce serait un plus — `widget.chart:+1`
   - Non, pas nécessaire — `widget.chart:-1`
6. Veux-tu voir des indicateurs clés en un coup d'œil (totaux, moyennes) ?
   - Oui — `widget.stats:+2`, `layout.dashboard:+1`
   - Non, je préfère voir les données brutes — `layout.table:+1`
7. Le suivi de tendances dans le temps est important ?
   - Très important — `widget.chart:+2`, `archetype.sales:+1`
   - Peu important — `widget.chart:-1`
8. Compares-tu souvent des catégories entre elles (ex : ventes par région) ?
   - Oui, souvent — `widget.chart:+2`, `layout.dashboard:+1`
   - Rarement — `widget.chart:-1`

### 3. Édition & workflow

9. À quelle fréquence ajoutes-tu de nouvelles lignes ?
   - Très souvent — `interaction:+2`
   - De temps en temps — `interaction:+1`
   - Presque jamais — `interaction:-2`
10. As-tu besoin de formulaires détaillés pour chaque entrée ?
    - Oui, beaucoup de champs — `layout.table:+1`, `interaction:+1`
    - Non, l'édition rapide en ligne suffit — `interaction:+2`, `layout.table:+2`
11. Les données doivent-elles être validées avant enregistrement (champs
    obligatoires, formats) ?
    - Oui, strictement — `interaction:+1`
    - Non, flexibilité suffisante — pas de poids
12. Prévois-tu de supprimer souvent des lignes ?
    - Oui, régulièrement — `interaction:+1`
    - Rarement — `interaction:-1`

### 4. Volume & organisation

13. Combien de lignes environ contient ta table principale ?
    - Moins de 50 — `layout.cards:+1`, `layout.gallery:+1`
    - Entre 50 et 500 — `layout.table:+1`
    - Plus de 500 — `layout.table:+2`, `widget.stats:+1`
14. As-tu besoin de rechercher/filtrer souvent dans les données ?
    - En permanence — `layout.table:+2`
    - Occasionnellement — `layout.table:+1`
    - Rarement — `layout.cards:+1`
15. Une des tables est-elle clairement plus importante que les autres ?
    - Oui, une table centrale domine — sert à choisir l'onglet par défaut
      affiché dans `GeneratedApp` (pas de poids layout/widget)
    - Non, elles sont d'importance équivalente — pas de poids

### 5. Style & présentation

16. Quelle densité d'affichage préfères-tu ?
    - Compacte, voir un maximum d'information — `density:+2`
    - Aérée, plus lisible — `density:-2`
17. Les images sont-elles importantes dans tes données (produits, profils…) ?
    - Oui, très importantes — `layout.gallery:+2`
    - Non, peu ou pas d'images — `layout.gallery:-1`
18. Préfères-tu une présentation en tableau classique ou en cartes visuelles ?
    - Tableau classique — `layout.table:+2`
    - Cartes visuelles — `layout.cards:+2`
    - Mélange selon la table — pas de poids

### 6. Collaboration & accès

19. Plusieurs personnes modifieront-elles les mêmes données en parallèle ?
    - Oui — `collaboration:+2`, `interaction:+1`
    - Non, un seul éditeur à la fois — `collaboration:-1`
20. As-tu besoin de partager cette webapp avec des personnes externes ?
    - Oui — `layout.cards:+1`, `interaction:-1`
    - Non, usage interne uniquement — pas de poids

## `preferenceEngine` (nouveau module frontend)

Fichier `frontend/src/lib/preferenceEngine.ts`, isolé de `archetype.ts` et
`semantic.ts` (non modifiés).

```typescript
interface PreferenceProfile {
  archetype: Partial<Record<TableArchetype, number>>
  layout: Partial<Record<LayoutKind, number>>
  widget: { chart: number; stats: number }
  interaction: number   // négatif = consultation, positif = édition
  density: number        // négatif = aéré, positif = compact
  primaryTableHint?: string
}

function buildPreferenceProfile(answers: readonly QuestionAnswer[]): PreferenceProfile
function mergePresets(
  autoDetected: AutoDetectedPreset,
  profile: PreferenceProfile
): FinalPreset
```

- `buildPreferenceProfile` additionne les deltas des réponses données
  (pure, immutable — retourne un nouvel objet, ne mute rien).
- `mergePresets` ajoute les scores du profil aux scores existants de
  `detectArchetype`/`suggestLayouts` par table, puis réapplique le seuil de
  décision déjà en place (seuil = 4, cf. `archetype.ts`). Le widget
  `chart`/`stats` est activé sur `DashboardView` si son score cumulé
  atteint ou dépasse 2 (première réponse « essentiel »/« oui » sur une
  question de la catégorie visualisation suffit à l'activer).
- Aucune réponse ne peut, à elle seule, forcer un résultat contraire au
  reste du profil : c'est toujours une somme, jamais un override brutal —
  cohérent avec « la détection automatique reste la base, le questionnaire
  l'affine ».

## Widget graphique

Le projet n'a aujourd'hui aucune librairie de graphiques (`DashboardView.tsx`
n'affiche que des cartes de statistiques). Ajout de **Recharts** comme
nouvelle dépendance frontend.

Nouveau composant `frontend/src/components/app/ChartWidget.tsx` : rendu
d'un bar chart ou line chart selon le rôle sémantique de la colonne
(`currency`/`number` → bar chart de synthèse par catégorie si une colonne
`category`/`status` existe ; `date` + métrique → line chart d'évolution).
Intégré dans `DashboardView.tsx`, affiché uniquement quand
`profile.widget.chart` atteint ou dépasse 2.

## Persistance backend

Nouvelle table système Postgres, distincte des tables de données générées :

```sql
CREATE TABLE webapp_sessions (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  schema_json JSONB NOT NULL,
  preset_json JSONB NOT NULL
);
```

Nouvel endpoint FastAPI `POST /sessions` (`backend/api.py`) :

```python
class SessionPayload(BaseModel):
    schema: CreatePayload      # réutilise le modèle existant
    preset: dict               # FinalPreset sérialisé (JSON)

class SessionResponse(BaseModel):
    id: str                    # UUID généré côté backend
```

Appelé au clic « Créer WebApp », en parallèle de `POST /create`. L'UUID
retourné est affiché à l'utilisateur (texte + bouton copier) sur l'écran de
la webapp générée. Aucun écran de reprise de session n'est construit dans ce
lot — reste couvert par `.taches/reprise-session.md`, qui pourra directement
lire `schema_json`/`preset_json` de cette table plus tard.

## Composants frontend

- `frontend/src/components/steps/StepQuestionnaire.tsx` — wizard une
  question à la fois : barre de progression (ex. « Question 7/20 »),
  boutons Précédent/Suivant, bouton « Créer WebApp » toujours visible et
  actif dès le début.
- `frontend/src/components/steps/QuestionCard.tsx` — affichage générique
  d'une question et de ses 2-4 options (boutons radio stylés,
  sélection unique).
- `frontend/src/lib/questions.ts` — banque statique des 20 questions
  typées (id, texte, catégorie, options avec deltas de poids).
- `frontend/src/lib/preferenceEngine.ts` — `buildPreferenceProfile` +
  `mergePresets`, décrits ci-dessus.

`App.tsx` : nouvel état `answers: QuestionAnswer[]`, mis à jour à chaque
réponse ; passé à `buildPreferenceProfile` au moment du clic sur
« Créer WebApp ».

## Tests

- Unitaires sur `preferenceEngine` :
  - profil vide (aucune réponse) → `mergePresets` reproduit exactement le
    résultat de la détection automatique seule.
  - profil complet → deltas correctement additionnés par dimension.
  - seuil du widget graphique/stats correctement appliqué (activé/désactivé
    selon le score).
  - immutabilité : `buildPreferenceProfile` et `mergePresets` ne mutent pas
    leurs arguments.
- Backend : test d'intégration sur `POST /sessions` (création, réponse UUID,
  ligne bien insérée avec `schema_json`/`preset_json` corrects).

## Hors périmètre

- Écran de reprise de session (saisie du `session_id`, rechargement,
  modification) — tâche séparée `.taches/reprise-session.md`.
- Édition/suppression des sessions sauvegardées.
- Authentification ou contrôle d'accès sur les sessions.
