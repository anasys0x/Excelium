![Excelium](https://github.com/anasys0x/Excelium/blob/main/excelium.png)

<h1 align="center">Excelium</h1>

<p align="center">
  Application web qui transforme un fichier Excel (.xlsx) en base de données PostgreSQL avec une interface de visualisation et de gestion CRUD, en détectant automatiquement la structure, les types et les dépendances entre feuilles.
</p>

---

## Prérequis

- Python 3.11+
- Node.js v18+
- PostgreSQL (pour l'insertion en base)
- `openpyxl` — parsing Excel

---

## Installation

```bash
git clone https://github.com/anasys0x/Excelium.git
cd Excelium
```

Installe les dépendances Python :

```bash
pip install -r backend/requirements.txt
```

Installe les dépendances de l'API :

```bash
cd api
npm install
```

---

## Lancer l'application

Lance l'API Express (dans un terminal) :

```bash
cd api
node index.js
```

Ouvre `http://localhost:3011` dans ton navigateur, glisse un fichier `.xlsx` et visualise les tables détectées.

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
├── api/
│   └── index.js              # Serveur Express — bridge entre frontend et Python
├── backend/
│   ├── export.py             # Script d'export JSON
│   ├── main.py               # Point d'entrée CLI (insertion PostgreSQL)
│   ├── errors.py             # Hiérarchie d'exceptions
│   ├── models/               # Workbook, Worksheet, Column, Row, Cell, CellDependency
│   ├── services/             # excel_reader, type_detector, dependency_detector, database_*
│   └── transforms/           # Conversion Excel type → SQL type (Strategy pattern)
├── frontend/
│   ├── index.html            # Interface de visualisation
│   └── style.css
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
