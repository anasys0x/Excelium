# Excelium

> Projet en cours de développement — IFT3150 Été 2026

Application web pour transformer des fichiers Excel en base de données avec interface CRUD complète.

## Description

Excelium permet d'importer un fichier Excel (.xlsx), d'en extraire automatiquement la structure, et de générer une application web de gestion de données avec validation guidée et opérations CRUD.

## Documentation

La documentation complète du projet est disponible sur le site de suivi :

**[https://anasys0x.github.io/Excelium/](https://anasys0x.github.io/Excelium/)**

## Équipe

- Anas Mrani Alaoui
- Farah Romdhane

**Superviseur :** Louis-Edouard Lafontant  
**Session :** Été 2026  
**Cours :** IFT3150 — Projet informatique

## Statut actuel

- ✅ Semaine 1 : Documentation et analyse préliminaire.
- ✅ Semaine 2 : Choix de la stack technique, comparaison des solutions existantes, modélisation des données.
- ✅ Semaine 3 : Révision de la modélisation, retravail du diagramme de classe et clarification de certaines ambiguïtés.
- ✅ Semaine 4 : Finalisation du diagramme de classe et réalisation d’une première itération du MVP.

## Première itération MVP

La première itération du MVP permet actuellement de :

- lire un fichier Excel local avec `openpyxl`;
- extraire les colonnes et les lignes de la feuille active;
- nettoyer les noms de colonnes;
- détecter les types Python des colonnes;
- convertir ces types vers des types SQL simples;
- générer une requête `CREATE TABLE`;
- exécuter cette requête dans une base SQLite locale.

Cette version reste volontairement simple et sert de base pour les prochaines itérations du projet.


---

*Dernière mise à jour : 02 Juin 2026*
