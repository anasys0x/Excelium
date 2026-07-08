![Excelium](https://github.com/anasys0x/Excelium/blob/main/excelium.png)

<h1 align="center">Excelium</h1>

<p align="center">
  Application web qui transforme un fichier Excel (.xlsx) en base de données PostgreSQL avec une interface de visualisation et de gestion CRUD, en détectant automatiquement la structure, les types et les dépendances entre feuilles.
</p>

---

## Prérequis

- Python 3.11+
- Node.js v18+
- PostgreSQL
- Backend : FastAPI · Uvicorn · openpyxl · psycopg2 — Frontend : React · Vite · TypeScript

---

## Installation

```bash
git clone https://github.com/anasys0x/Excelium.git
cd Excelium
```

Installe les dépendances Python :

```bash
pip install -r backend/requirements.txt
# si besoin, les dépendances de l'API :
pip install fastapi uvicorn python-multipart psycopg2-binary python-dotenv
```

Installe les dépendances du frontend :

```bash
cd frontend
npm install
```

---

## Lancer l'application

**1. Backend** — lance l'API FastAPI (dans un terminal) :

```bash
cd backend
uvicorn api:app --reload
```

L'API tourne sur `http://localhost:8000` (documentation interactive sur `/docs`).

**2. Frontend** — lance le serveur web (dans un autre terminal) :

```bash
cd frontend
npm run dev
```

Ouvre l'URL affichée (`http://localhost:5173`), glisse un fichier `.xlsx`, configure tes tables (renommage des colonnes, clé, réorganisation), puis crée la base de données.

### Configuration (`backend/.env`)

Crée un fichier `backend/.env` avec les paramètres de connexion PostgreSQL :

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=excelium
DB_USER=postgres
DB_PASSWORD=ton_mot_de_passe
```

---

## Export JSON (sans interface)

Pour exporter directement la structure d'un fichier Excel en JSON :

```bash
python3 backend/export.py data/excel.xlsx
```

---

## Structure du projet

```
Excelium/
├── backend/
│   ├── api.py                # API FastAPI — endpoints /parse et /create
│   ├── main.py               # Point d'entrée CLI (insertion PostgreSQL)
│   ├── export.py             # Script d'export JSON
│   ├── constants.py          # Constantes (formats de date…)
│   ├── errors.py             # Hiérarchie d'exceptions
│   ├── utils.py              # Utilitaires (slugify…)
│   ├── models/
│   │   ├── excel/            # Workbook, Worksheet, Table, Column, Row, Cell
│   │   ├── relational/       # Modèle relationnel (tables, contraintes, FK/PK)
│   │   └── transforms/       # Conversion type Excel → SQL (Strategy pattern)
│   └── services/             # excel_reader, type_detector, pk/fk_detector,
│                             # sql_generator, db_creator, database_*
├── frontend/                 # React + Vite + TypeScript
│   └── src/
│       ├── App.tsx           # Orchestration des étapes (import → config → création)
│       ├── index.css         # Thèmes clair/sombre (variables CSS)
│       └── components/
│           ├── DropZone.tsx, StepIndicator.tsx
│           ├── layout/SplitView.tsx
│           ├── table/TablePreview.tsx
│           └── steps/        # StepSheetSelector, StepKeySelector, StepTableConfirmation
├── data/                     # Fichiers Excel de test
└── docs/                     # Documentation MkDocs
```

---

## Statut actuel

- ✅ Semaine 1 : Documentation et analyse préliminaire.
- ✅ Semaine 2 : Choix de la stack technique, comparaison des solutions existantes, modélisation des données.
- ✅ Semaine 3 : Révision de la modélisation, retravail du diagramme de classe et clarification de certaines ambiguïtés.
- ✅ Semaine 4 : Finalisation du diagramme de classe et réalisation d'une première itération du MVP.
- ✅ Semaine 5 : Robustesse du backend et première interface de visualisation.
- ✅ Semaine 6 : Interface web React (import par glisser-déposer, sélection des feuilles, configuration des tables, thème clair/sombre) et API FastAPI (`/parse`, `/create`) connectée à PostgreSQL.
- ✅ Semaine 7 : Semaine de réflexion et préparation de la mise en commun II.
- ✅ Semaine 8 : Application générée complète, CRUD sur les données live avec détection PK/FK et analyse d'impact, exports Excel/SQL, archétypes de table (templates sémantiques) et vue personnalisée à formules sur grille.


---

## Documentation

La documentation complète est disponible sur :

**[https://anasys0x.github.io/Excelium/](https://anasys0x.github.io/Excelium/)**

---

## Équipe

- Anas Mrani Alaoui
- Farah Romdhane

**Superviseur :** Louis-Edouard Lafontant  
**Session :** Été 2026  
**Cours :** IFT3150 — Projet informatique

---

*Dernière mise à jour : 07 juillet 2026*
