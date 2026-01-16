# Architecture Frontend - TargetDesk

## Vue d'ensemble

Cette application Angular suit une architecture modulaire et scalable organisée par fonctionnalités et responsabilités.

## Structure des dossiers

```
src/app/
├── components/              # Composants génériques réutilisables
├── core/                   # Services et configuration système
│   ├── auth/              # Gestion de l'authentification
│   ├── api/               # Services API et configuration HTTP
│   └── config/            # Configuration globale de l'application
├── features/              # Modules fonctionnels métier
│   ├── dashboard/         # Module tableau de bord
│   ├── tickets/           # Module gestion des tickets
│   ├── users/             # Module gestion des utilisateurs
│   └── settings/          # Module paramètres
├── guards/                # Guards de routage (authentification, permissions)
├── interceptors/          # Intercepteurs HTTP (auth, erreurs, loading)
├── layouts/               # Composants de mise en page
│   ├── main-layout/       # Layout principal de l'application
│   └── auth-layout/       # Layout pour les pages d'authentification
├── models/                # Interfaces TypeScript et types
├── services/              # Services métier partagés
└── shared/                # Éléments partagés entre modules
    ├── components/        # Composants UI réutilisables
    ├── directives/        # Directives Angular personnalisées
    ├── pipes/             # Pipes de transformation de données
    └── utils/             # Fonctions utilitaires
```

## Principes d'architecture

### 1. Séparation des responsabilités
- **Core** : Services fondamentaux (auth, API, config)
- **Shared** : Éléments réutilisables dans toute l'application
- **Features** : Logique métier organisée par domaine fonctionnel
- **Layouts** : Structure et mise en page des pages

### 2. Lazy Loading
- Chaque module fonctionnel peut être chargé à la demande
- Amélioration des performances de démarrage

### 3. Modularité
- Chaque feature est un module autonome
- Faible couplage entre les modules
- Facilite la maintenance et les tests

### 4. Réutilisabilité
- Composants partagés dans le dossier `shared/`
- Services métier centralisés
- Patterns cohérents dans toute l'application

## Conventions de nommage

- **Fichiers** : kebab-case (`user-profile.component.ts`)
- **Classes** : PascalCase (`UserProfileComponent`)
- **Variables/Méthodes** : camelCase (`getUserProfile()`)
- **Constantes** : UPPER_SNAKE_CASE (`API_BASE_URL`)

## Organisation des features

Chaque module fonctionnel suit la structure :
```
feature-name/
├── components/     # Composants spécifiques au module
├── services/       # Services métier du module
├── models/         # Types/interfaces du module
├── guards/         # Guards spécifiques (si nécessaire)
└── feature-routing.module.ts
```

## Guidelines de développement

1. **Un composant = Une responsabilité**
2. **Services injectables** pour la logique métier
3. **Interfaces TypeScript** pour tous les modèles de données
4. **Lazy loading** pour les modules fonctionnels
5. **Guards** pour la protection des routes
6. **Intercepteurs** pour la gestion centralisée des requêtes HTTP

## Technologies et outils

- **Angular** (v21+)
- **TypeScript**
- **SCSS** pour les styles
- **Routing** avec lazy loading
- **Standalone components** (nouvelle approche Angular)

Cette architecture permet une évolutivité optimale et facilite la collaboration en équipe.