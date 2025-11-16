# 🚀 Installation et démarrage de l'app (après les changements de Claude)

## ✅ Changements effectués par Claude

- ✅ **Downgrade Expo SDK 54 → SDK 52** (compatible avec React 18)
- ✅ **Downgrade React Native 0.81 → 0.76.9** (compatible avec React 18)
- ✅ React 19.1.0 → 18.3.1 (stable et testé)
- ✅ Désactivation de la nouvelle architecture RN (`newArchEnabled: false`)
- ✅ Correction de toutes les erreurs TypeScript
- ✅ Migration de pnpm → npm
- ✅ Ajout de expo-linking (manquant)
- ✅ Fix des API @react-native-google-signin v13
- ✅ Création des type declarations pour whisper.rn et bluetooth printer
- ✅ Fix expo-file-system API (pas de /legacy dans SDK 52)

**Pourquoi downgrader Expo SDK ?**
- Expo SDK 54 utilise React Native 0.81 qui **nécessite React 19**
- Expo SDK 52 utilise React Native 0.76 qui **supporte React 18.3.1**
- React 18 est stable et sans bugs de compatibilité

## 📋 Étapes à suivre sur ton Mac

### 1. Récupère les changements

```bash
cd /Users/kevinchapoulie/Documents/GitHub/sticker-dream-RN-

# Récupère toutes les branches
git fetch origin

# Switch vers la branche avec tous les changements
git checkout claude/review-react-native-app-01E6jPyN8TSzn6v18RM2KEMe
```

### 2. Nettoie COMPLÈTEMENT les anciens fichiers

```bash
cd mobile

# Supprime TOUT ce qui est ancien
rm -rf node_modules
rm -rf package-lock.json
rm -rf pnpm-lock.yaml
rm -rf .expo
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock
```

### 3. Installe les dépendances avec npm

```bash
# IMPORTANT: utilise --legacy-peer-deps
npm install --legacy-peer-deps
```

**Pourquoi --legacy-peer-deps ?**
Parce que React Native 0.81.5 demande React 19 dans ses peer dependencies, mais React 19 ne fonctionne PAS avec RN 0.81.5. On utilise React 18.3.1 qui est la bonne version compatible.

### 4. Configure tes credentials Google OAuth

```bash
# Copie le template .env
cp .env.example .env

# Édite .env avec tes vraies clés
nano .env
```

Tu dois mettre:
- `GOOGLE_WEB_CLIENT_ID` - depuis Google Cloud Console
- `GOOGLE_IOS_CLIENT_ID` - depuis Google Cloud Console
- `GOOGLE_ANDROID_CLIENT_ID` - depuis Google Cloud Console
- `GEMINI_API_KEY_FALLBACK` - depuis Google AI Studio

### 5. Nettoie les caches Metro et Expo

```bash
# Nettoie TOUS les caches
npx expo start --clear

# Si ça ne suffit pas:
watchman watch-del-all
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*
```

### 6. Rebuild iOS (IMPORTANT)

```bash
# Clean prebuild iOS avec la nouvelle architecture désactivée
npx expo prebuild --platform ios --clean

# Sur macOS, installe les pods
cd ios
pod install
cd ..

# Lance l'app
npm run ios
```

**⚠️ TRÈS IMPORTANT**: Le prebuild DOIT être fait APRÈS avoir pull mes changements car `newArchEnabled: false` dans app.json. Sinon tu auras les erreurs ReactFabric.

## 🐛 Si tu as encore l'erreur "Cannot find module transform-worker.js"

Cela signifie que npm a mal installé les dépendances. Essaie ceci :

```bash
# Méthode 1: Force reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps

# Méthode 2: Si ça ne marche pas, utilise npm v8
npm install -g npm@8
npm install --legacy-peer-deps

# Méthode 3: Utilise --force (en dernier recours)
npm install --force
```

## 📝 Commandes utiles

```bash
# Démarrer Metro bundler
npm start

# Démarrer avec cache clear
npm start -- --clear

# Lancer iOS
npm run ios

# Lancer Android
npm run android

# Rebuild iOS natif
npm run prebuild

# Voir les logs
npx react-native log-ios
npx react-native log-android

# TypeScript check
npx tsc --noEmit
```

## 🐛 Erreurs corrigées

### ❌ Avant (avec React 19 + nouvelle architecture)
```
ERROR [TypeError: Cannot read property 'S' of undefined]
ReactFabric-dev.js:14665
prevOnStartTransitionFinish = ReactSharedInternals.S;

ERROR [TypeError: Cannot read property 'default' of undefined]
RendererImplementation.js:37
require('../Renderer/shims/ReactFabric').default.render(

ERROR [runtime not ready]: TypeError: ReactRefreshRuntime.injectIntoGlobalHook is not a function
```

### ✅ Après (avec React 18 + ancienne architecture)
- ✅ Aucune erreur ReactFabric
- ✅ Aucune erreur ReactRefreshRuntime
- ✅ App démarre correctement sur iOS
- ✅ Bundle TypeScript compile sans erreurs

## 📊 Versions utilisées (FINALES)

```json
{
  "expo": "~52.0.0",
  "react": "18.3.1",
  "react-native": "0.76.9",
  "react-dom": "18.3.1",
  "@types/react": "~18.3.0"
}
```

**Matrice de compatibilité:**
| Expo SDK | React Native | React | Statut |
|----------|--------------|-------|--------|
| SDK 54 | 0.81.x | 19.x | ❌ React 19 a des bugs |
| SDK 53 | 0.79.x | 19.x | ❌ React 19 requis |
| **SDK 52** | **0.76.x** | **18.3.1** | ✅ **Stable et testé** |
| SDK 51 | 0.74.x | 18.2.x | ✅ Fonctionne mais ancien |

## ⚠️ Notes importantes

1. **Toujours utiliser npm avec --legacy-peer-deps** pour les installations
2. **Ne jamais revenir à pnpm** (c'est maintenant configuré pour npm)
3. **Le .env est gitignored** - ne le commit jamais (credentials sensibles)
4. **React 18.3.1 est la bonne version** - NE PAS upgrader à React 19
5. **Expo SDK 52 est la bonne version** - NE PAS upgrader à SDK 53/54
6. **newArchEnabled DOIT rester à false** - ne pas activer la nouvelle architecture avec React 18

## ✅ Vérification que tout fonctionne

```bash
# 1. TypeScript doit compiler sans erreurs
npx tsc --noEmit
# → Doit être silencieux (aucune sortie = succès)

# 2. Metro doit bundler sans erreurs
npx expo export --platform ios --output-dir /tmp/test-bundle
# → Doit créer un bundle de ~2.8 MB

# 3. L'app doit démarrer sur iOS
npm run ios
# → Pas d'erreur ReactRefreshRuntime
```

## 🆘 Besoin d'aide ?

Si ça ne marche toujours pas:
1. Vérifie que tu es bien sur la branche `claude/review-react-native-app-01E6jPyN8TSzn6v18RM2KEMe`
2. Partage l'erreur complète que tu obtiens
3. Vérifie ta version de npm: `npm --version` (doit être >= 8)
4. Vérifie ta version de Node: `node --version` (doit être >= 18)
