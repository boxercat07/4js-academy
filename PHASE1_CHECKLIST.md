# ⚡ CHECKLIST PHASE 1 - À FAIRE AUJOURD'HUI

**Durée:** ~2-3 heures  
**Impact:** Réduit 50% des vulnérabilités CRITICAL  
**Downtime:** ~5 minutes total (ou 0 si load balancer)

---

## 1️⃣ JWT_SECRET - Rotation Immédiate (15 min)

### Étape 1: Générez nouveau secret
```bash
# Copier-coller dans terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Résultat ressemblera à:
# a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1
```

### Étape 2: Mettez à jour `.env` en production
```bash
# Production server
SSH prod-server
nano /var/app/.env

# Remplacez la ligne:
JWT_SECRET=a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1
```

### Étape 3: Redémarrez (avec 0-downtime si possible)
```bash
# Avec PM2
pm2 restart app

# Ou avec Docker
docker-compose restart app

# Ou Render/Heroku
heroku config:set JWT_SECRET=a1f2e3d4c5...
```

### ✅ Vérification
```bash
# Les vieux jetons seront rejetés
curl -H "Cookie: token=OLD_TOKEN" http://prod/api/me
# Doit retourner: 403 Invalid or expired token
```

---

## 2️⃣ Supprimer debug_api.js (5 min)

```bash
# Local
rm stitch_ai_academy_portal/debug_api.js

# Vérifier pas d'autres fichiers debug
find . -name "*.debug.js" -o -name "*debug*.js" | grep -v node_modules

# Committer
git add -A
git commit -m "security: remove hardcoded debug scripts"
git push origin main
```

### ✅ Vérification
```bash
# Ne doit rien trouver
git log --all --full-history -S "stitch-secret-2026"
```

---

## 3️⃣ Désactiver /api/seed (5 min)

**Fichier:** `server/app.js` ligne 95

### Changement:
```javascript
// REMPLACEZ CECI:
app.post('/api/seed', async (req, res) => {
    try {
        // Creates database entries

// PAR CECI:
app.post('/api/seed', (req, res) => {
    return res.status(403).json({ 
        error: 'Seed endpoint is disabled' 
    });
});
```

### ✅ Vérification
```bash
curl -X POST http://localhost:3000/api/seed
# Doit retourner: 403
```

---

## 4️⃣ Rate Limiting sur Login (1 heure)

### Étape 1: Installation
```bash
npm install express-rate-limit
```

### Étape 2: Ajouter à [server/routes/auth.js](server/routes/auth.js)

**Au début du fichier, après les imports:**
```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');  // ← AJOUTER
const bcrypt = require('bcrypt');
// ... autres imports

const loginLimiter = rateLimit({              // ← AJOUTER
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Trop de tentatives. Réessayez dans 15 minutes.',
    skipSuccessfulRequests: true
});
```

**Sur la route login:**
```javascript
// REMPLACEZ:
router.post('/login', async (req, res) => {

// PAR:
router.post('/login', loginLimiter, async (req, res) => {
```

### Étape 3: Test local
```bash
npm test
npm start

# Dans autre terminal:
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@4js.com","password":"wrong"}'
done
# 6ème tentative doit être bloquée
```

### Étape 4: Déployer
```bash
git add -A
git commit -m "security: add rate limiting to auth endpoint"
git push origin main
# Puis pull en production et redémarrer
```

### ✅ Vérification
```bash
# Tester en production après déploiement
for i in {1..6}; do
  curl -X POST https://prod/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@4js.com","password":"wrong"}'
done
```

---

## 5️⃣ CORS Configuration (15 min - CONFIG ONLY)

**Pas besoin de redéployer le code!**

### Étape 1: Identifiez vos domaines
```
Production:
- https://academy.4js.com (frontend)
- https://api.4js.com (si API séparée)

Admin:
- https://admin.4js.com
```

### Étape 2: Mettez à jour .env
```bash
# Current .env:
ALLOWED_ORIGINS=https://academy.4js.com,https://admin.4js.com

# Redémarrer l'app
pm2 restart app
```

### Étape 3: Vérifier code [server/app.js](server/app.js) support .env

Vérifiez que cette ligne existe (elle est en production):
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000'];
```

**Si NOT présent**, faire ce changement:

```javascript
// AVANT (ligne 15):
app.use(cors());

// APRÈS:
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
```

Puis déployer.

### ✅ Vérification
```bash
# Doit être bloqué
curl -H "Origin: https://evil.com" https://academy.4js.com/api/me
# Erreur CORS

# Doit passer
curl -H "Origin: https://academy.4js.com" https://academy.4js.com/api/me
# OK (après auth)
```

---

## 📋 Checklist Finale

```
[ ] Généré nouveau JWT_SECRET (crypto.randomBytes)
[ ] Mis à jour .env en production
[ ] Redémarré l'app
[ ] Supprimé debug_api.js + git push
[ ] Désactivé /api/seed (code edit)
[ ] Installé express-rate-limit
[ ] Ajouté loginLimiter au route login
[ ] Testé rate limit localement
[ ] Déployé en production
[ ] Vérifié /api/seed = 403
[ ] Vérifié 6e tentative login bloquée
[ ] Configuré ALLOWED_ORIGINS .env
[ ] Redémarré après config CORS
[ ] Vérifié CORS bloque evil.com
```

---

## 🔍 Vérification Rapide Status

```bash
#!/bin/bash
echo "=== PHASE 1 VALIDATION ==="

echo -n "✓ JWT_SECRET set: "
[[ -n "$JWT_SECRET" ]] && echo "YES" || echo "MISSING!"

echo -n "✓ debug_api.js removed: "
[[ ! -f "debug_api.js" ]] && echo "YES" || echo "STILL EXISTS!"

echo -n "✓ rate-limit installed: "
npm list express-rate-limit 2>/dev/null | grep -q express-rate-limit && echo "YES" || echo "MISSING!"

echo -n "✓ /api/seed protected: "
curl -s -X POST http://localhost:3000/api/seed | grep -q "403\|disabled" && echo "YES" || echo "VULNERABLE!"

echo -n "✓ CORS configured: "
[[ -n "$ALLOWED_ORIGINS" ]] && echo "YES" || echo "NOT SET!"
```

---

## ⚠️ Si Quelque Chose Casse

### Rollback Immédiat
```bash
# Auth broken?
git revert HEAD
npm start

# État stable?
git push origin revert-branch
# + notify team
```

### Nécessite redémarrage?
```bash
# Avec 0-downtime (load balancer):
# 1. Arrêter instance A
# 2. Déployer sur A
# 3. Reboot A
# 4. Test l'instance A
# 5. Switch traffic de B vers A
# 6. Répéter pour B
```

---

## 📞 Support sur Incident

Si problème trouvé:
1. **Slack:** #security-incident
2. **Rollback** code si nécessaire
3. **Notifier:** DevOps + Product
4. **Analyser** les logs
5. **Fix** et re-déployer

---

**Estimé:** 2-3 heures  
**Deadline:** Aujourd'hui avant 17h  
**Reviewer:** CTO/Security lead  

✅ **Après Phase 1 = 50% des CVE CRITICAL sont fermées**
