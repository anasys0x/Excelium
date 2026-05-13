---
title: Études préliminaires
---

<style>
    @media screen and (min-width: 76em) {
        .md-sidebar--primary {
            display: none !important;
        }
    }
</style>

# Études préliminaires

> :bulb: Cette page sert à documenter les recherches, analyses et explorations réalisées avant ou durant le projet
> Elle ne remplace pas le rapport final, mais permet de conserver une trace de votre démarche et des réflexions ayant guidé le projet.    

## Structure suggérée

> La structure suivante est donnée à titre indicatif.  
> Vous pouvez l'adapter selon la nature de votre projet.

### Compréhension du problème

Dans plusieurs organisations, les données sont encore gérées principalement dans des fichiers Excel. Ces fichiers sont simples à créer et à modifier, mais ils deviennent rapidement difficiles à maintenir lorsque le volume de données augmente ou lorsque plusieurs utilisateurs doivent consulter, corriger ou mettre à jour les informations.

Un fichier Excel peut contenir plusieurs feuilles, colonnes, lignes, cellules et formules. Cependant, ces données restent souvent isolées dans un fichier statique. Il devient donc difficile d'assurer leur cohérence, de suivre les modifications, de valider les formats, de centraliser les informations et de les exploiter dans une application web.

De plus, lorsqu'une organisation souhaite passer d'un fichier Excel vers une solution plus structurée, la transformation manuelle des données vers une base de données peut être longue, répétitive et sujette aux erreurs. Il faut lire le fichier, identifier les feuilles, comprendre les colonnes, extraire les lignes, traiter les formules et convertir le tout en données exploitables.

**Problématique centrale** : Comment transformer un fichier Excel statique en une application web dynamique et interactive, capable d'assurer la persistance, la structuration et la gestion complète des données qu'il contient ?

### Analyse des solutions ou approches existantes

#### Airtable

Airtable est une plateforme cloud américaine lancée en 2012 qui combine la simplicité visuelle d'un tableur avec la puissance d'une base de données. Son interface intuitive permet à des utilisateurs non techniques de créer et gérer des bases de données en ligne, d'organiser des données sous plusieurs vues (grille, kanban, calendrier, galerie) et de collaborer en temps réel.

**Forces** :
- Import natif de fichiers Excel et CSV
- Gestion des types de champs
- API REST automatiquement générée
- Interface intuitive accessible aux non-techniciens
- Collaboration en temps réel
- Vues multiples (grille, kanban, calendrier, galerie)

**Limites** :
- Outil SaaS hébergé sur les serveurs d'Airtable
- Aucun contrôle sur l'infrastructure ni sur le code source
- Modèle de tarification par utilisateur coûteux à grande échelle
- Possibilités de personnalisation limitées aux options proposées par la plateforme

**Technologies** : Plateforme SaaS propriétaire

#### NocoDB

NocoDB est une alternative open source à Airtable, née en 2021, qui se distingue par sa capacité à se connecter directement à des bases de données relationnelles existantes telles que PostgreSQL, MySQL ou SQLite, et à les transformer en interface de type tableur.

**Forces** :
- Peut être auto-hébergé sur ses propres serveurs
- Contrôle total sur les données et l'infrastructure
- Support de l'import de fichiers Excel et CSV
- Gestion CRUD via une interface web
- Génération automatique d'APIs REST et GraphQL pour chaque table
- Code open source

**Limites** :
- S'adresse davantage à un profil technique
- Configuration et déploiement nécessitent des connaissances en administration de serveurs et en bases de données
- Pas de processus de validation guidé lors de l'importation
- Les corrections de structure se font généralement après l'import

**Technologies** : Open source, connexion directe aux bases de données relationnelles (PostgreSQL, MySQL, SQLite)

#### Baserow

Baserow est une plateforme open source de gestion de données lancée en 2020, positionnée comme une alternative à Airtable accessible aussi bien aux utilisateurs techniques que non techniques.

**Forces** :
- Interface de type tableur pour créer et gérer des bases de données
- Support de l'import Excel et CSV
- Détection automatique des types de colonnes
- Collaboration en temps réel entre plusieurs utilisateurs
- Peut être utilisé en mode SaaS via sa version hébergée
- Peut être auto-hébergé sur ses propres serveurs grâce à son code open source
- Expose une API REST pour chaque table

**Limites** :
- Importation de manière directe et automatique
- Pas d'étapes interactives de validation avant la persistance des données en base
- Corrections et ajustements se font après l'import

**Technologies** : Open source, mode SaaS ou auto-hébergé

### Contraintes et besoins

#### Besoins fonctionnels

| Besoin | Description | Justification |
|--------|-------------|---------------|
| Importation d'un fichier Excel | L'utilisateur dépose un fichier .xlsx via l'interface. Le système vérifie automatiquement son format et sa structure dès la réception. | C'est le point d'entrée central du système. Sans importation, aucune donnée ne peut être traitée ou gérée. |
| Sélection de la feuille | Le système liste les feuilles disponibles du fichier et permet à l'utilisateur d'en sélectionner une, avec un aperçu du nombre de lignes et colonnes. | Un fichier Excel peut contenir plusieurs feuilles aux structures différentes. Laisser l'utilisateur choisir évite toute importation incorrecte. |
| Mise en correspondance des colonnes | Le système détecte les colonnes et propose une correspondance avec les champs de la base de données. L'utilisateur peut confirmer ou corriger chaque correspondance. | Les noms de colonnes dans un fichier Excel sont rarement identiques aux noms de champs attendus en base. La correspondance manuelle garantit un mapping précis et contrôlé. |
| Validation des types de données | Le système propose un type pour chaque colonne (texte, entier, décimal, date, booléen). L'utilisateur valide ou corrige. Toute incohérence est signalée. | Des types incorrects entraînent des erreurs d'insertion ou des données corrompues en base. La validation préventive protège l'intégrité des données. |
| Confirmation et importation | L'utilisateur confirme explicitement avant l'insertion. L'opération s'effectue dans une transaction atomique avec rollback en cas d'échec. | Évite toute insertion accidentelle et garantit qu'aucune donnée partielle ne subsiste en base en cas d'erreur durant le processus. |
| Consultation des données | Les enregistrements sont affichés dans un tableau paginé permettant de naviguer entre les pages et de visualiser toutes les valeurs. | La consultation est l'opération la plus fréquente du CRUD. Un affichage structuré et paginé est indispensable pour des données volumineuses. |
| Recherche et filtrage | L'utilisateur peut rechercher des enregistrements par mot-clé sur l'ensemble des colonnes. Les résultats s'affichent dynamiquement. | Facilite la navigation dans les données et permet de retrouver rapidement un enregistrement précis sans parcourir l'intégralité du tableau. |
| Ajout d'un enregistrement | Un formulaire permet de créer manuellement un nouvel enregistrement avec validation des champs selon les types définis. | L'application doit permettre l'enrichissement des données au-delà du fichier Excel initial, rendant la base de données dynamique et évolutive. |
| Modification d'un enregistrement | Un formulaire pré-rempli permet de modifier les valeurs d'un enregistrement existant avec les mêmes règles de validation que lors de la création. | Les données peuvent évoluer après importation. La modification permet de corriger des erreurs ou mettre à jour des informations sans réimporter tout le fichier. |
| Suppression d'un enregistrement | L'utilisateur peut supprimer un enregistrement après confirmation explicite pour éviter toute suppression accidentelle. | La suppression est une opération irréversible. Une confirmation préalable est nécessaire pour protéger l'intégrité et éviter la perte involontaire de données. |

#### Besoins non fonctionnels

| Besoin | Description | Justification |
|--------|-------------|---------------|
| Sécurité | Le système doit accepter seulement les fichiers autorisés, par exemple .xlsx, et protéger les données enregistrées. | Les fichiers Excel peuvent contenir des données sensibles comme des informations sur des employés, clients ou produits. |
| Simplicité d'utilisation | L'interface doit être claire et facile à utiliser, même pour un utilisateur non technique. | L'objectif est de permettre à l'utilisateur de gérer ses données sans avoir à manipuler directement une base de données. |
| Fiabilité | Le système doit éviter la perte ou la mauvaise transformation des données pendant l'importation. | Les données importées doivent rester cohérentes entre le fichier Excel, la base de données et l'interface web. |
| Performance | L'importation et l'affichage des données doivent rester rapides pour des fichiers de taille raisonnable. | Un fichier Excel peut contenir plusieurs centaines ou milliers de lignes, donc le système doit éviter les ralentissements importants. |
| Maintenabilité | Le code doit être organisé en modules séparés : importation, transformation, API, base de données et interface. | Cela facilite la correction des erreurs et l'ajout de nouvelles fonctionnalités plus tard. |
| Compatibilité | Le système doit supporter au minimum les fichiers Excel au format .xlsx. | Ce format est courant et compatible avec les bibliothèques modernes de lecture Excel. |
| Traçabilité | Le système doit garder une trace minimale des importations, par exemple la date, le nom du fichier et le nombre de lignes importées. | Cela permet de mieux suivre les données insérées dans le système. |

### Explorations techniques ou conceptuelles

La solution proposée est une application web full-stack articulée autour d'un pipeline en cinq étapes :

**1. Importation** : L'utilisateur dépose son fichier Excel via une interface d'upload. Le système parse le fichier côté serveur et détecte automatiquement sa structure (feuilles disponibles, colonnes, types de données).

**2. Processus de validation guidé** : Avant toute persistance des données, l'utilisateur est accompagné à travers un assistant d'importation en plusieurs étapes : sélection de la feuille à importer, confirmation et correction du mapping des colonnes, validation des types de données par colonne, puis prévisualisation de l'ensemble des données dans un tableau de révision. Ce processus garantit que seules des données valides et conformes sont enregistrées.

**3. Transformation** : Une fois la validation confirmée, les données sont normalisées selon le mapping défini et préparées pour l'insertion en base de données.

**4. Stockage** : Les données transformées sont persistées dans une base de données relationnelle, rendant l'information durable, requêtable et indépendante du fichier source.

**5. Gestion via interface web** : Une interface claire permet à l'utilisateur de parcourir les données, d'effectuer des recherches, et d'exécuter les opérations CRUD : création, lecture, mise à jour et suppression d'enregistrements.

### Choix retenus

Les choix techniques définitifs seront effectués lors de la semaine 2 après prototypage rapide des différentes options. Les décisions seront documentées ici une fois finalisées.

### Références

Les références techniques et ressources utilisées seront ajoutées au fur et à mesure de l'avancement du projet.

- [FastAPI, Flask or Django - Which Should You Use? - 
Tech With Tim
](https://www.youtube.com/watch?v=cNlJCQHSmbE)

- [ How to Read Excel Files with Python (Pandas Tutorial) - Dave Ebbelaar](https://www.youtube.com/watch?v=P6HCyxSyFpY)