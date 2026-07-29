# Export de la webapp générée en ZIP auto-hébergeable

Date : 2026-07-29
Statut : Validé, à implémenter directement (pas de plan séparé pour ce lot)

## Contexte

Une fois sa webapp générée (base + thème choisi), le client doit pouvoir
télécharger un `.zip` autonome contenant sa webapp et sa base de données,
qu'il peut héberger où il veut. Contraintes explicites de l'utilisateur :
pas de Docker, aucune modification de l'architecture actuelle
(React/Vite + FastAPI + PostgreSQL), rester simple. Le zip ne doit contenir
que **ce que voit le client final** (son thème/CRUD) — jamais l'assistant
d'import/questionnaire — et doit s'ouvrir directement sur sa webapp, sans
qu'il ait à coller un identifiant de session.

## Principe

Réutiliser au maximum ce qui existe déjà :
- `GeneratedApp.tsx` (le composant CRUD) est réutilisé tel quel, sans
  modification de sa logique interne.
- Le mécanisme de reprise de session existant (`restoreSession`,
  `GET /sessions/{id}`, table `webapp_sessions`) est réutilisé pour
  reconstruire `tables`/`seed`/`theme` — mais déclenché automatiquement au
  chargement, sans formulaire.
- La génération SQL des tables de données réutilise le même principe que
  `GET /export/sql` déjà en place.

Un **nouveau mini-frontend** (`frontend/src/export/`), buildé une seule
fois (pas à chaque export), sert de point d'entrée minimal : pas de wizard,
juste un chargement puis `<GeneratedApp>`. Au moment de l'export, le
backend copie ce build déjà prêt et y écrit l'identifiant de session dans
un petit fichier de config — aucune reconstruction par export.

## Ce qui est touché dans le code existant

Deux modifications, les deux additives et rétrocompatibles :

1. `GeneratedApp.tsx` : `onBack` et `onNewImport` deviennent optionnels
   (`onBack?: () => void`), boutons masqués si absents. Nécessaire car un
   webapp autonome n'a pas de wizard vers lequel "retourner" — sans ce
   changement, ces boutons seraient présents mais ne mèneraient nulle part.
   Comportement actuel inchangé partout où ces props sont déjà fournies.
2. `frontend/package.json` : un nouveau script `build:export` (ligne
   ajoutée, aucun script existant modifié).

Tout le reste est additif (nouveaux fichiers uniquement) : `vite.config.ts`,
`index.html`, `App.tsx`, le wizard, et tous les endpoints backend existants
restent inchangés.

## Le mini-frontend exporté

Nouveaux fichiers :
- `frontend/export.html` — point d'entrée HTML séparé (à côté de
  `index.html`, ne le remplace pas).
- `frontend/vite.export.config.ts` — config Vite dédiée, `build.outDir:
  'dist-export'`, entrée `export.html`.
- `frontend/src/export/ExportApp.tsx` — au montage : lit
  `./config.json` (fichier statique à côté du build, `{ "sessionId": "..."
  }`, écrit par le backend à l'export, absent en dev), appelle
  `fetch('http://localhost:8000/sessions/' + sessionId)`, passe la réponse
  à `restoreSession` (déjà existant, inchangé), applique
  `document.documentElement.dataset.theme = restored.theme`, puis rend
  `<GeneratedApp tables={restored.sheets[0].tables} {...restored.seed} />`
  (sans `onBack`/`onNewImport`, donc pas de boutons de wizard). État de
  chargement/erreur simple (spinner texte, message si session introuvable).
- `frontend/src/export/main.tsx` — bootstrap React standard (`createRoot`),
  importe `../index.css` et `../App.css` pour le style.

`npm run build:export` produit `frontend/dist-export/` (statique,
committable ou à builder une fois avant la démo). C'est ce dossier que le
backend copie tel quel dans chaque zip généré — builder une fois, réutiliser
pour tous les clients (seul `config.json` change).

## Backend : génération du zip

Nouveau module `backend/services/webapp_zip.py` :

```python
def build_webapp_zip(conn, session_id: str) -> bytes:
    """Assemble et retourne le contenu binaire du zip pour une session."""
```

Étapes :
1. `load_session(conn, session_id)` (déjà existant) — 404 si absente.
2. Génère `database/schema.sql` :
   - `CREATE TABLE`/`INSERT` pour chaque table listée dans
     `dbSchema.tables`, réutilisant le même principe de sérialisation que
     `_sql_value` de `export_sql` dans `api.py` (dupliqué localement dans
     `webapp_zip.py` — fonction assez courte pour ne pas justifier de
     toucher `api.py` pour la factoriser).
   - `CREATE_TABLE_SQL` de `session_store.py` (réutilisé, déjà exporté) +
     un `INSERT INTO webapp_sessions (id, schema_json, preset_json) VALUES
     (...)` avec les données exactes de la session, pour que la webapp
     exportée retrouve son thème dès la première requête.
3. Copie `frontend/dist-export/` dans `frontend/` du zip, puis écrit
   `frontend/config.json` avec `{"sessionId": session_id}`.
4. Copie les fichiers backend nécessaires dans `backend/` du zip : `api.py`,
   `constants.py`, `errors.py`, `utils.py`, `requirements.txt`, `models/`,
   `services/`. Exclus explicitement : `.env` (secrets locaux), `tests/`,
   `main.py`, `export.py`, `Pipfile`, `transforms/` (dossier racine inutilisé,
   à ne pas confondre avec `models/transforms/`), `__pycache__/`.
   Dans la copie de `api.py` incluse dans le zip (uniquement cette copie —
   le fichier source du dépôt n'est pas modifié), la ligne
   `allow_origins=["http://localhost:5173"]` du `CORSMiddleware` est
   remplacée par `allow_origins=["*"]` : le backend exporté sert une seule
   webapp privée pour un seul client, servie depuis une origine que
   l'utilisateur choisit lui-même (pas forcément `localhost:5173`) — sans
   ce changement, le navigateur bloquerait les appels `fetch` du frontend
   exporté par la politique CORS actuelle, qui ne connaît que l'origine du
   serveur de développement Excelium.
5. Ajoute `.env.example` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
   `DB_PASSWORD` vides/placeholder) et `README.md` (voir plus bas).
6. Zip le tout en mémoire (`zipfile.ZipFile` sur un `io.BytesIO`), retourne
   les bytes.

Nouvel endpoint dans `api.py` :

```python
@app.get("/export/webapp-zip/{session_id}")
def export_webapp_zip(session_id: str):
    ...
    content = build_webapp_zip(conn, session_id)
    return StreamingResponse(
        BytesIO(content),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="webapp-{session_id[:8]}.zip"'},
    )
```

Si `frontend/dist-export/` est absent (pas encore buildé), retourne une
erreur 500 explicite ("Lancez `npm run build:export` dans `frontend/`
avant d'exporter une webapp.") plutôt qu'un zip cassé.

## README.md généré dans le zip

Instructions en français, écrites une fois (fichier statique copié, pas
généré dynamiquement) :

1. Créer une base PostgreSQL vide.
2. Copier `.env.example` en `.env`, renseigner les identifiants.
3. `cd backend && pip install -r requirements.txt`
4. Importer les données : `psql -U <user> -d <db> -f database/schema.sql`
5. Lancer le backend : `uvicorn api:app --host 0.0.0.0 --port 8000`
6. Servir le dossier `frontend/` avec un serveur de fichiers statiques (ex.
   `npx serve frontend`, ou tout serveur web habituel) et ouvrir
   `export.html` dans le navigateur. Ne pas ouvrir le fichier directement
   depuis le disque (`file://`) : certains navigateurs bloquent alors le
   chargement de `config.json` et les appels au backend.

Note explicite : le frontend s'attend à un backend sur `localhost:8000`
(limite actuelle, non configurable — cohérent avec le reste de
l'application qui a la même contrainte aujourd'hui).

## Interface : bouton de téléchargement

Dans `GeneratedApp.tsx`, à côté des boutons d'export existants (Excel/SQL)
dans la barre d'outils : nouveau lien `<a href="http://localhost:8000/export/webapp-zip/{sessionId}"
download>Télécharger ma WebApp (.zip)</a>`, affiché uniquement si
`sessionId` n'est pas `null` (une session doit exister pour pouvoir
reconstruire la config au chargement).

## Tests

- Backend : test sur `build_webapp_zip` avec une session mockée — vérifie
  que le zip contient bien `database/schema.sql`, `backend/api.py`,
  `frontend/config.json` avec le bon `sessionId`, et qu'aucun fichier
  `.env` n'est présent.
- Pas de nouveau test frontend automatisé pour `ExportApp.tsx` (composant
  de bootstrap simple, cohérent avec le reste du projet où les composants
  React ne sont pas testés unitairement) — vérifié manuellement en
  buildant et ouvrant `dist-export/export.html` avec une session réelle.

## Hors périmètre

- Rendre l'URL du backend configurable dans le frontend exporté (reste
  `localhost:8000`, limite déjà présente ailleurs dans l'app).
- Docker ou tout autre mode de déploiement packagé (explicitement exclu).
- Authentification sur l'endpoint d'export (même limite que
  `session_id` déjà documentée dans `.taches/reprise-session.md`).
