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
### Décisions et ajustements

> À compléter uniquement si des choix structurants ont été faits
> ou si l’orientation du projet a évolué.

!!! info "Décisions"
    - Abandon de l’approche X jugée trop complexe
    - Reformulation de la problématique suite aux premières analyses

### Difficultés rencontrées

> À compléter uniquement si des obstacles ont eu un impact réel
> sur l’avancement du projet.

!!! warning "Difficultés"
    - Problème de configuration du plugin Mermaid
        - Confusion entre `mkdocs-mermaid2-plugin` (pip)
          et `mermaid2` (nom du plugin)
        - Résolu après nettoyage et configuration correcte dans `mkdocs.yml`
