#!/bin/bash

# Script de déploiement production pour TargetDesk Frontend
# Résout le problème des chunks manquants en production

echo "🚀 Déploiement Production TargetDesk Frontend"
echo "=============================================="

# Fonctions utilitaires
get_current_version() {
    grep -o "version: '[^']*'" src/environments/environment.prod.ts | cut -d"'" -f2
}

increment_version() {
    local version=$1
    local IFS='.'
    local version_parts=($version)
    local patch=$((version_parts[2] + 1))
    echo "${version_parts[0]}.${version_parts[1]}.$patch"
}

update_version() {
    local new_version=$1
    local timestamp=$(date +%s)

    # Mettre à jour environment.prod.ts
    sed -i.bak "s/version: '[^']*'/version: '$new_version'/g" src/environments/environment.prod.ts
    sed -i.bak "s/buildTimestamp: [0-9][0-9]*/buildTimestamp: $timestamp/g" src/environments/environment.prod.ts

    # Nettoyer le fichier backup
    rm src/environments/environment.prod.ts.bak

    echo "✅ Version mise à jour: $new_version (build: $timestamp)"
}

# 1. Vérifications préalables
echo "📋 Vérifications préalables..."

if [ ! -f "angular.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet Angular"
    exit 1
fi

if ! command -v ng &> /dev/null; then
    echo "❌ Erreur: Angular CLI n'est pas installé"
    exit 1
fi

# 2. Gestion automatique des versions
echo "🔢 Gestion des versions..."

current_version=$(get_current_version)
echo "📦 Version actuelle: $current_version"

new_version=$(increment_version "$current_version")
echo "📦 Nouvelle version: $new_version"

# Demander confirmation
read -p "🤔 Continuer avec la version $new_version ? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Déploiement annulé"
    exit 1
fi

# 3. Mise à jour de la version
update_version "$new_version"

# 4. Nettoyage du cache
echo "🧹 Nettoyage du cache..."
ng cache clean
rm -rf dist/
rm -rf node_modules/.cache/

# 5. Installation des dépendances
echo "📦 Installation des dépendances..."
npm ci

# 6. Build de production
echo "🔨 Build de production..."
ng build --configuration=production

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build"
    exit 1
fi

# 7. Vérifications post-build
echo "🔍 Vérifications post-build..."

DIST_DIR="dist/targetdesk-frontend"

if [ ! -d "$DIST_DIR" ]; then
    echo "❌ Erreur: Répertoire de build introuvable"
    exit 1
fi

# Vérifier la présence du .htaccess
if [ ! -f "$DIST_DIR/.htaccess" ]; then
    echo "⚠️  Avertissement: Fichier .htaccess manquant"
else
    echo "✅ Fichier .htaccess présent"
fi

# Vérifier la taille des chunks
echo "📊 Taille des chunks principaux:"
du -h "$DIST_DIR"/*.js | head -5

# 8. Instructions de déploiement
echo ""
echo "🎉 Build de production terminé avec succès!"
echo "=============================================="
echo "📂 Répertoire de build: $DIST_DIR"
echo "📦 Version déployée: $new_version"
echo ""
echo "📋 Instructions de déploiement:"
echo "1. Sauvegardez l'ancienne version sur le serveur"
echo "2. Uploadez tout le contenu de '$DIST_DIR' vers le serveur web"
echo "3. Vérifiez que le fichier .htaccess est bien présent"
echo "4. Testez l'application en navigation privée"
echo "5. Si des utilisateurs voient encore l'ancienne version:"
echo "   - Ils verront un rechargement automatique de la page"
echo "   - Ou ils peuvent faire Ctrl+F5 pour forcer le refresh"
echo ""
echo "🔧 Fonctionnalités incluses:"
echo "✅ Gestion automatique des erreurs de chunks"
echo "✅ Rechargement automatique en cas de chunk manquant"
echo "✅ Cache optimisé avec .htaccess"
echo "✅ Versioning automatique"
echo ""

# 9. Optionnel: Créer une archive
read -p "📦 Créer une archive de déploiement ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ARCHIVE_NAME="targetdesk-frontend-v$new_version-$(date +%Y%m%d-%H%M%S).tar.gz"
    cd "$DIST_DIR"
    tar -czf "../../$ARCHIVE_NAME" .
    cd ../..
    echo "✅ Archive créée: $ARCHIVE_NAME"
fi

echo ""
echo "🚀 Déploiement prêt !"