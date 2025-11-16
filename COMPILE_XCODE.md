# 🚀 Compiler l'app directement avec Xcode (sans Expo Go)

## ✅ Pourquoi cette méthode ?

- ✅ **Pas besoin d'Expo Go** - on compile l'app native directement
- ✅ **Pas de problème de version SDK** - zéro conflit avec Expo Go
- ✅ **Build natif complet** - comme une vraie app iOS
- ✅ **Debugging Xcode** - outils natifs Apple

## 📋 Étapes (une seule fois)

### 1. Pull les changements

```bash
cd /Users/kevinchapoulie/Documents/GitHub/sticker-dream-RN-

# Pull la branche avec tous les fixes
git fetch origin
git checkout claude/review-react-native-app-01E6jPyN8TSzn6v18RM2KEMe
```

### 2. Nettoie et installe

```bash
cd mobile

# Nettoie tout
rm -rf node_modules package-lock.json ios android .expo

# Installe les dépendances
npm install --legacy-peer-deps

# Génère le projet natif iOS
npx expo prebuild --platform ios --clean
```

### 3. Installe les CocoaPods (IMPORTANT sur macOS)

```bash
cd ios

# Installe les pods natifs
pod install

cd ..
```

## 🎯 Lancer l'app avec Xcode

### Option A: Via ligne de commande

```bash
cd mobile

# Compile et lance sur simulateur iOS
npx react-native run-ios

# Ou spécifie un simulateur précis
npx react-native run-ios --simulator="iPhone 15 Pro"
```

### Option B: Via Xcode (RECOMMANDÉ)

```bash
cd mobile/ios

# Ouvre le workspace dans Xcode
open StickerDream.xcworkspace
```

**Dans Xcode:**

1. **Sélectionne le simulateur** en haut (ex: iPhone 15 Pro)
2. **Appuie sur le bouton Play** ▶️ (ou Cmd+R)
3. L'app se compile et se lance automatiquement

**⚠️ IMPORTANT:** Ouvre **`StickerDream.xcworkspace`** (pas `.xcodeproj`) car on utilise CocoaPods.

## 🔧 Démarrer Metro Bundler (REQUIS)

**Dans un terminal séparé**, lance Metro:

```bash
cd mobile
npm start
```

Laisse ce terminal ouvert pendant le développement.

## 🐛 Troubleshooting

### Erreur: "No bundle URL present"

**Cause:** Metro bundler n'est pas lancé

**Solution:**
```bash
cd mobile
npm start
```

### Erreur: "Command PhaseScriptExecution failed"

**Cause:** Problème avec les pods ou les scripts

**Solution:**
```bash
cd mobile/ios
pod deintegrate
pod install
cd ..
```

### Erreur: "Developer account not configured"

**Cause:** Xcode a besoin d'un compte développeur

**Solution:**
1. Dans Xcode, va dans **Signing & Capabilities**
2. Change le **Team** vers ton compte Apple
3. Change le **Bundle Identifier** si nécessaire (ex: `com.tonnom.stickerdream`)

### L'app crash au démarrage

**Vérifications:**
```bash
# 1. Vérifie que TypeScript compile
npx tsc --noEmit

# 2. Vérifie le .env
cat .env
# Doit contenir tes vraies clés Google OAuth et Gemini

# 3. Regarde les logs Metro
# Dans le terminal où Metro tourne, tu verras les erreurs JS
```

### Nettoyer complètement le build

```bash
cd mobile

# Nettoie les caches Xcode
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData

# Nettoie Metro
rm -rf .expo
watchman watch-del-all

# Relance Metro
npm start
```

## 📱 Tester sur device physique

### 1. Configure le signing

Dans Xcode:
1. Sélectionne le projet **StickerDream** dans le navigateur
2. Sélectionne la target **StickerDream**
3. Onglet **Signing & Capabilities**
4. Coche **Automatically manage signing**
5. Sélectionne ton **Team**

### 2. Connecte ton iPhone

1. Branche ton iPhone en USB
2. Déverrouille-le
3. Fais confiance à l'ordinateur si demandé
4. Dans Xcode, sélectionne ton iPhone en haut
5. Appuie sur Play ▶️

**Note:** La première fois, iOS te demandera de faire confiance au développeur dans Réglages > Général > Gestion des appareils.

## 🚀 Workflow de développement

```bash
# Terminal 1: Metro bundler (toujours ouvert)
cd mobile
npm start

# Terminal 2: Xcode ou ligne de commande
cd mobile
npx react-native run-ios

# Ou ouvre Xcode et compile depuis l'IDE
open ios/StickerDream.xcworkspace
```

## ✅ Avantages de cette méthode

1. **Debugging natif**: Breakpoints Xcode, Instruments, Console
2. **Pas de SDK mismatch**: Pas besoin d'Expo Go avec la bonne version
3. **Build de production**: Même flow que pour publier sur l'App Store
4. **Performances natives**: Pas de surcouche Expo Go
5. **Tests complets**: Accès aux vraies permissions iOS

## 📊 Versions finales

```json
{
  "expo": "~52.0.0",
  "react": "18.3.1",
  "react-native": "0.76.9",
  "newArchEnabled": false
}
```

**Cette config est stable et testée ✅**

## 🆘 Besoin d'aide ?

1. **Vérifie les logs Metro** (terminal où `npm start` tourne)
2. **Vérifie les logs Xcode** (fenêtre Debug area en bas)
3. **Vérifie le simulateur iOS** (Menu Debug > Open System Log)
4. **Clean et rebuild**: Xcode > Product > Clean Build Folder (Cmd+Shift+K)
