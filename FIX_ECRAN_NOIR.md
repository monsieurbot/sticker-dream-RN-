# 🐛 Fix écran noir sur iPhone physique

## ❌ Problème

```
ERROR: The Internet connection appears to be offline
Local network prohibited
Connection to Metro bundler failed (http://10.30.0.248:8081)
```

**Cause**: iOS bloque l'accès au réseau local → l'app ne peut pas charger le bundle JS depuis Metro.

## ✅ Solution

J'ai ajouté les permissions manquantes dans `app.json`:
- `NSLocalNetworkUsageDescription` - Permet l'accès réseau local
- `NSBonjourServices` - Permet la découverte du serveur Metro

### 📋 Étapes pour réparer

#### 1. Pull les changements

```bash
cd /Users/kevinchapoulie/Documents/GitHub/sticker-dream-RN-

git pull origin claude/review-react-native-app-01E6jPyN8TSzn6v18RM2KEMe
```

#### 2. Rebuild le projet iOS

```bash
cd mobile

# Nettoie et rebuild
rm -rf ios
npx expo prebuild --platform ios --clean

# Reinstalle les pods
cd ios
pod install
cd ..
```

#### 3. Lance Metro bundler

**Terminal 1** (garde-le ouvert):
```bash
cd mobile
npm start
```

Tu devrais voir:
```
Metro waiting on exp://192.168.x.x:8081
```

**Note l'adresse IP** affichée (ex: 192.168.1.10).

#### 4. Vérifie la connexion réseau

**IMPORTANT**: Ton Mac et ton iPhone doivent être sur le **même réseau WiFi**.

**Sur ton Mac:**
```bash
# Vérifie ton IP locale
ipconfig getifaddr en0
```

**Sur ton iPhone:**
- Réglages > WiFi > Vérifie que tu es sur le même réseau que ton Mac

#### 5. Recompile l'app dans Xcode

```bash
cd mobile/ios
open StickerDream.xcworkspace
```

Dans Xcode:
1. **Clean Build Folder**: Product > Clean Build Folder (⇧⌘K)
2. **Sélectionne ton iPhone** (pas le simulateur)
3. **Build & Run**: Appuie sur Play ▶️ (⌘R)

#### 6. Premier lancement - Autorise le réseau local

Quand l'app se lance sur ton iPhone, iOS va te demander:

```
"Sticker Dream" souhaite accéder aux appareils
de votre réseau local
```

**Appuie sur "Autoriser"** ✅

#### 7. L'app devrait se connecter à Metro

Dans les logs Xcode, tu devrais voir:
```
✅ Connected to Metro bundler
✅ Loading bundle...
```

## 🔧 Troubleshooting

### L'app reste noire après avoir autorisé

**1. Vérifie que Metro tourne**

Dans le terminal où tu as lancé `npm start`:
```
✔ Metro bundler is running
```

**2. Shake ton iPhone pour ouvrir le Dev Menu**

Secoue physiquement ton iPhone → Un menu apparaît

**3. Configure l'URL du bundler manuellement**

Dans le Dev Menu:
1. Appuie sur **"Configure Bundler"** ou **"Settings"**
2. Saisis l'IP de ton Mac manuellement: `192.168.x.x:8081`
3. Reload l'app: Secoue > **"Reload"**

**4. Vérifie que le Firewall ne bloque pas**

Sur ton Mac:
```bash
# Réglages > Réseau et Internet > Pare-feu

# Si le pare-feu est activé:
# 1. Ajoute une exception pour Metro/Node
# 2. Ou désactive temporairement le pare-feu pour tester
```

**5. Force Metro à écouter sur toutes les interfaces**

Modifie `package.json`:
```json
"scripts": {
  "start": "expo start --lan"
}
```

Puis:
```bash
npm start
```

### Vérifier la connexion manuellement

**Dans un navigateur sur ton iPhone**, ouvre:
```
http://[IP_DE_TON_MAC]:8081/status
```

Tu devrais voir:
```json
{"packager":"running"}
```

Si ça ne marche pas → Problème réseau/firewall.

### Logs utiles

**Dans Xcode**, ouvre la console (⇧⌘C) et filtre par:
```
Metro
RCTBridge
Connection
```

**Dans Metro**, tu devrais voir:
```
iOS Bundling complete, 123 modules
```

## 🎯 Checklist finale

- [ ] Git pull fait
- [ ] iOS rebuild avec `npx expo prebuild --platform ios --clean`
- [ ] `pod install` dans le dossier ios/
- [ ] Metro bundler tourne (`npm start`)
- [ ] Mac et iPhone sur le **même WiFi**
- [ ] Clean Build Folder dans Xcode
- [ ] App recompilée et installée sur iPhone
- [ ] Permission réseau local **autorisée** sur iPhone
- [ ] L'app charge le bundle JS depuis Metro ✅

## 🚀 Alternative: Build standalone (sans Metro)

Si tu veux tester l'app **sans Metro bundler** (comme en production):

```bash
cd mobile/ios
open StickerDream.xcworkspace
```

Dans Xcode:
1. Product > Scheme > Edit Scheme
2. Run > Build Configuration > **Release** (au lieu de Debug)
3. Build & Run

L'app sera compilée avec le bundle JS embarqué, **pas besoin de Metro**.

**Note**: Les modifications JS ne seront pas visibles sans rebuild complet.

## 📱 Vérifier que ça marche

Si tout est OK, tu devrais voir:
- ✅ Logs Xcode: "Connected to Metro"
- ✅ L'écran n'est plus noir
- ✅ L'app affiche l'UI (écran de sign-in)
- ✅ Metro logs: "iOS Bundling complete"

Si l'app affiche l'UI mais crash ensuite → nouveau problème (probablement Google OAuth ou Gemini API keys manquantes dans `.env`).
