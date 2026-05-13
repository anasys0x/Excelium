---
title: Vue d'ensemble du projet
---

<style>
    @media screen and (min-width: 76em) {
        .md-sidebar--primary {
            display: none !important;
        }
    }
</style>

# Vue d'ensemble du projet

!!! info "Informations générales"
    **Session**: Été 2026  
    **Auteur(s)**: Anas Mrani Alaoui(20257568) ; Farah Romdhane(20288662)<!-- Nom de chaque membre (matricule)  -->  
    **Thème(s)**: 
    - Développement d'application web full-stack
    - Ingénierie et transformation de données
    - Validation et qualité des données<!-- Thèmes principaux abordés dans le projet  -->  
    **Superviseur(s)**: Louis Edouard Lafontant<!-- Nom du superviseur (affiliation)  -->  
    **Collaborateur(s):** <!-- Nom de(s) collaborateur(s) et partenaire(s)` -->  

## Description du projet

Ce projet consiste à concevoir et développer une application web complète permettant la
gestion dynamique de données issues d'un fichier Excel. L'application offre à l'utilisateur la
possibilité d'importer un fichier au format .xlsx ou .xls, d'en extraire automatiquement la
structure (feuilles, colonnes, lignes) et de transformer ces données en enregistrements
structurés persistants dans une base de données relationnelle. Une interface web intuitive
permet ensuite de consulter, ajouter, modifier et supprimer ces données via des opérations
CRUD complètes.

### Contexte

Dans plusieurs organisations, les données sont encore gérées principalement dans des
fichiers Excel. Ces fichiers sont simples à créer et à modifier, mais ils deviennent rapidement
difficiles à maintenir lorsque le volume de données augmente ou lorsque plusieurs
utilisateurs doivent consulter, corriger ou mettre à jour les informations.

Un fichier Excel peut contenir plusieurs feuilles, colonnes, lignes, cellules et formules.
Cependant, ces données restent souvent isolées dans un fichier statique. Il devient donc
difficile d’assurer leur cohérence, de suivre les modifications, de valider les formats, de
centraliser les informations et de les exploiter dans une application web.

De plus, lorsqu’une organisation souhaite passer d’un fichier Excel vers une solution plus
structurée, la transformation manuelle des données vers une base de données peut être
longue, répétitive et sujette aux erreurs. Il faut lire le fichier, identifier les feuilles, comprendre
les colonnes, extraire les lignes, traiter les formules et convertir le tout en données
exploitables.

### Problématique

Comment transformer un fichier Excel statique en une application web dynamique et
interactive, capable d'assurer la persistance, la structuration et la gestion complète
des données qu'il contient ?

### Proposition et objectifs

La solution proposée est une application web full-stack structurée autour d'un pipeline en cinq étapes qui transforme un fichier Excel statique en une application de gestion de données complète.

**Pipeline proposé :**

1. **Importation** : Upload du fichier Excel via interface web, parsing automatique de la structure
2. **Validation guidée** : Assistant interactif pour sélection de feuille, mapping des colonnes, validation des types
3. **Transformation** : Normalisation des données selon le mapping validé
4. **Stockage** : Persistance dans une base de données relationnelle via transaction atomique
5. **Gestion CRUD** : Interface web pour consulter, créer, modifier et supprimer les enregistrements

**Différenciation clé :** Contrairement aux solutions existantes (Airtable, NocoDB, Baserow) qui effectuent l'import automatiquement sans validation préalable, notre approche propose un processus de validation guidé avant toute persistance, garantissant l'intégrité des données dès l'import.

**Objectifs mesurables :**

| # | Objectif | Critère de succès | Échéance |
|---|----------|-------------------|----------|
| O1 | Parser correctement un fichier Excel (.xlsx) | Extraction complète de la structure (feuilles, colonnes, types) sans perte de données | Semaine X (A discuter avec Mr Louis) |
| O2 | Implémenter le processus de validation guidé | Assistant fonctionnel en 4 étapes avec prévisualisation | Semaine X (A discuter avec Mr Louis) |
| O3 | Générer et peupler une base de données | Schéma créé automatiquement, données importées sans erreur | Semaine X (A discuter avec Mr Louis) |
| O4 | Créer une interface CRUD fonctionnelle | Toutes les opérations (Create, Read, Update, Delete) opérationnelles | Semaine X (A discuter avec Mr Louis) |
| O5 | Valider la robustesse du système | Import réussi de 5 fichiers Excel variés sans crash | Semaine X (A discuter avec Mr Louis) |

### Méthodologie

**Approche générale :** Développement itératif avec cycles courts d'une semaine, suivant une méthodologie agile adaptée au travail en binôme.

**Phases du projet :**

1. **Semaines 1-2 : Analyse et conception**
   - Étude des solutions existantes
   - Définition des besoins fonctionnels et non-fonctionnels
   - Choix de la stack technique après prototypage rapide

2. **Semaines 3-4 : Parsing et extraction**
   - Développement du module de lecture Excel
   - Détection automatique de la structure
   - Tests sur fichiers variés

3. **Semaines 5-6 : Validation guidée**
   - Implémentation de l'assistant d'importation
   - Interface de mapping colonnes
   - Validation des types avec correction

4. **Semaines 7-8 : Persistance et transformation**
   - Génération dynamique du schéma de base de données
   - Transformation et normalisation des données
   - Transaction atomique avec rollback

5. **Semaines 9-10 : Interface CRUD**
   - Développement des opérations Create, Read, Update, Delete
   - Recherche et pagination
   - Interface utilisateur responsive

6. **Semaines 11-12 : Tests et documentation**
   - Tests d'intégration
   - Correction des bugs
   - Rédaction du rapport final

### Validation et Évaluation

**Critères de validation du MVP :**

1. **Import réussi** : Le système parse et importe correctement 5 fichiers Excel test de structures différentes sans erreur
2. **Intégrité des données** : Aucune perte ni corruption de données entre le fichier source et la base de données
3. **Validation guidée** : L'utilisateur peut corriger les mappings et types détectés avant confirmation
4. **CRUD fonctionnel** : Toutes les opérations sont opérationnelles et testées
5. **Robustesse** : Le système gère proprement les cas limites (cellules vides, types mixtes, données invalides)

**Méthodes de validation :**

- **Tests fonctionnels** : Scénarios utilisateur couvrant l'ensemble du pipeline (import → validation → stockage → CRUD)
- **Tests de données** : Dataset de 10 fichiers Excel variés (simples, complexes, multi-feuilles, avec erreurs)
- **Validation manuelle** : Vérification visuelle de la cohérence entre fichier Excel source et données en base
- **Tests de charge** : Import de fichiers jusqu'à 1000 lignes pour évaluer les performances

**Indicateurs de succès :**

- Taux de réussite d'import : > 95% sur les fichiers test
- Temps de traitement : < x secondes(a discuter ave le prof egalement) pour un fichier de x lignes
- Taux de détection correcte des types : > 90%


## Équipe

- Anas Mrani Alaoui
- Farah Romdhane

## Échéancier

!!! info
    Le suivi complet est disponible dans la page [Suivi de projet](suivi.md).

| Activités                      | Début   |   Fin   | Livrable                            | Statut      |
|--------------------------------|---------|---------|-------------------------------------|-------------|
| Ouverture de projet            | 4 mai   | 15 mai  | Proposition de projet               | ✅ Terminé  |
| Études préliminaires           | 4 mai   | 22 mai  | Document d'analyse                  | 🔄 En cours |
| Présentation + Rapport         | 7 aout  | 14 aout | Présentation + Rapport              | ⏳ À venir  |
