---
title: Suivi du projet
---

<style>
    @media screen and (min-width: 76em) {
        .md-sidebar--primary {
            display: none !important;
        }
    }
</style>

# Suivi de projet

> :bulb: Cette page documente l’évolution du projet dans le temps.
> Elle sert à rendre visibles les décisions, ajustements et apprentissages.
> Les entrées peuvent être hebdomadaires ou bi-hebdomadaires.  
> N'oubliez pas d’effacer ou de mettre en commentaires les notes (`>`) avant la remise finale.

---

## Semaine 1 (06–13 Mai)

### Objectifs de la période
- Clarifier la problématique et le contexte du projet
- Explorer les solutions existantes (Airtable, NocoDB, Baserow)
- Définir la proposition de solution et le pipeline de données
- Établir les besoins fonctionnels et non-fonctionnels

### Travail réalisé

!!! abstract "Avancement"
    - [x] Définition du contexte et de la problématique
        - Transformation d'Excel statique → application web dynamique
    - [x] Analyse comparative des solutions existantes
        - Airtable : SaaS propriétaire, coûteux, interface intuitive
        - NocoDB : Open-source, auto-hébergeable, profil technique
        - Baserow : Open-source, accessible, import automatique sans validation
    - [x] Conception de la proposition de solution
        - Pipeline en 5 étapes : Importation → Validation guidée → Transformation → Stockage → Gestion CRUD
        - **Différenciation clé** : processus de validation interactif avant persistance
    - [x] Définition des besoins fonctionnels (9 besoins identifiés)
        - Import fichier, sélection feuille, mapping colonnes, validation types, CRUD complet
    - [x] Définition des besoins non-fonctionnels (7 besoins identifiés)
        - Sécurité, simplicité, fiabilité, performance, maintenabilité, compatibilité, traçabilité
    - [x] Création du diagramme de cas d'utilisation
    - [x] Établissement du glossaire technique
    - [ ] Choix définitif de la stack technique
        - **Hésitation principale** : JavaScript (full-stack) vs Python (full-stack ou hybride)
        - **Option 1 - JavaScript** : Node.js + Express (backend) + React (frontend)
            - Librairie Excel : SheetJS (xlsx)
            - Avantage : un seul langage front/back, écosystème npm riche
        - **Option 2 - Python full-stack** : Django (backend + templates frontend intégrés)
            - Librairie Excel : openpyxl ou pandas
            - Avantage : simplicité d'architecture, Django Admin pour prototypage rapide
        - **Option 3 - Python backend + JS frontend** : FastAPI (backend) + React (frontend)
            - Librairie Excel : openpyxl ou pandas
            - Avantage : API moderne et performante, séparation claire des responsabilités
       > On en discute cette semaine, dépendamment de la courbe d'apprentissage, de la rapidité de développement, de la qualité du parsing Excel et de la maintenabilité.
        - À finaliser semaine 2 après prototypage rapide des trois approches

---
## Semaine 2 (14–20 Mai)

### Retours sur la semaine 1
- Airtable, NocoDB et Baserow appartiennent à une même catégorie de solutions no-code/low-code de gestion de données. Elles permettent de transformer des données structurées, notamment issues de fichiers Excel ou CSV, en bases de données accessibles via une interface web intuitive.

### Travail réalisé

!!! abstract "Avancement"
    - [x] Comparaison des librairies de parsing Excel
        - **Apache POI (Java)** : robuste, mature, supporte `.xls` et `.xlsx`, mais plus complexe et verbeux.
        - **openpyxl (Python)** : simple, léger, lisible, orienté `.xlsx`.
        - Tests réalisés : lecture/modification, formules, valeurs calculées, dépendances entre feuilles, lignes et colonnes.
        - [Voir la comparaison openpyxl / Apache POI](ressources/openpyxl_apache-poi.pdf){:target="_blank"}

    - [x] Analyse de **LlamaPress / Excel-to-Webapp**
    - Analyse réalisée à partir de tests effectués directement sur [LlamaPress Excel-to-App](https://llamapress.ai/excel-to-app){:target="_blank"}
        - Outil proche de notre objectif : importer un fichier Excel et générer une application web exploitable.
        - [Voir la capture LlamaPress](ressources/llamapress.png){:target="_blank"}

    - [x] Analyse d’**Airtable**
        - Import Excel/CSV → base de données visuelle → interface web.
        - Fonctionnalités observées : vues en grille, formulaires, filtres, regroupements, tableaux de bord et automatisations.
        - Limite : solution no-code déjà structurée, moins orientée vers la génération personnalisée d’une webapp complète.
        - [Voir l’analyse Airtable](ressources/airtable-flow.pdf){:target="_blank"}

    - [x] Modélisation des données : diagramme de classes de la structure Excel
        - `Classeur` : fichier Excel complet, composé de plusieurs feuilles.
        - `Feuille` : onglet contenant lignes, colonnes et cellules.
        - `Ligne` : ensemble horizontal de cellules.
        - `Colonne` : ensemble vertical de cellules, avec nom et type inféré.
        - `Cellule` : valeur atomique avec position, contenu, type et formule éventuelle.
        - Relations principales : `Classeur` → `Feuille`, `Feuille` → `Ligne` / `Colonne`, `Ligne` → `Cellule`.

---
## Semaine 3 (21–27 Mai)

### Travail réalisé

!!! abstract "Avancement"
    - [x] Révision de la modélisation du projet
        - Clarification du rôle des principales classes liées à la structure Excel.
        - Ajustement du modèle pour mieux représenter les feuilles, lignes, colonnes et cellules.

    - [x] Retravail du diagramme de classe
        - Ajout de la classe `Ligne` afin de mieux représenter les enregistrements du fichier Excel.
        - Suppression des éléments jugés trop complexes pour une première version, notamment la gestion détaillée des dépendances entre cellules.
        - Clarification des relations entre `Classeur`, `Feuille`, `Ligne`, `Colonne` et `Cellule`.


    - [x] Familiarisation avec `openpyxl` et clarification de certaines ambiguïtés
        - Prise en main de `openpyxl` pour comprendre comment accéder aux feuilles, aux lignes, aux colonnes et aux cellules d’un fichier Excel.
        - Clarification d’une ambiguïté liée à la représentation d’un fichier Excel comme tableau 2D classique, avec des en-têtes en colonnes et des lignes de données.


### Décisions et ajustements

!!! info "Décisions"
    - Le diagramme de classe a été simplifié afin de mieux correspondre au périmètre du MVP.
    - La classe `Ligne` est conservée, car elle représente naturellement un enregistrement potentiel dans la base de données.
    - La gestion avancée des formules et dépendances entre cellules est mise de côté pour la première itération.

---
## Semaine 4 (28 Mai–03 Juin)

### Travail réalisé

!!! abstract "Avancement"
    - [x] Finalisation du diagramme de classe
        - Validation de la structure générale du modèle de données.
        - Stabilisation des principales classes du projet : `Classeur`, `Feuille`, `Ligne`, `Colonne` et `Cellule`.

    - [x] Mise en place d’une première itération du MVP
        - Lecture d’un fichier Excel local avec `openpyxl`.
        - Extraction des feuilles disponibles.
        - Sélection de la feuille active.
        - Extraction et nettoyage des noms de colonnes.
        - Lecture des lignes de données.
        - Détection simple des types Python des colonnes.
        - Conversion des types Python vers des types SQL.
        - Génération d’une requête `CREATE TABLE`.
        - Exécution de la requête dans une base SQLite locale.

    - [x] Organisation initiale du code
        - Séparation progressive du pipeline en plusieurs services :
            - `excel_reader.py` pour la lecture du fichier Excel.
            - `type_detector.py` pour la détection des types.
            - `sql_mapper.py` pour la conversion vers les types SQL.
            - `database_builder.py` pour l’exécution locale dans SQLite.
        - Création d’une structure de base pour les modèles du projet.

### Décisions et ajustements

!!! info "Décisions"
    - Le MVP reste volontairement simple pour valider le pipeline principal avant d’ajouter des fonctionnalités avancées.
    - SQLite est utilisé localement pour tester rapidement la création de tables.
    - L’insertion des données et l’intégration avec une base plus complète seront traitées dans les prochaines itérations.


### Décisions et ajustements

!!! info "Décisions"
    - **openpyxl** retenu comme librairie de parsing Excel (légèreté et adéquation avec la stack Python)
    - Le modèle de données à 5 classes (`Classeur`, `Feuille`, `Ligne`, `Colonne`, `Cellule`) constitue la base de la couche de lecture du fichier Excel
    - **Stack technique potentiel** : React (frontend) + FastAPI (backend) + openpyxl (parsing Excel) + PostgreSQL (BDD) + SQLAlchemy (ORM)

### Difficultés rencontrées

    - Difficulté à structurer directement les classes du modèle tout en intégrant "openpyxl".
    - Besoin nécessaire de clarifier la génération de SQL simple et l’utilisation d’un ORM
    - Confusion entre les objets fournis par `openpyxl` et les classes propres au projet.