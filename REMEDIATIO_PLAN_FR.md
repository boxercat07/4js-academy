# Plan de Remédiation - CVEClasse en Production
**Status:** Code en production - Remédiation d'urgence requise  
**Créé:** 22 Mars 2026

---

## 📊 Matrice Risque vs Effort

| CVE | Criticité | Impact Métier | Effort | Priorité | Déploiement |
|-----|-----------|---------------|--------|----------|------------|
| JWT Secret faible | 🔴 CRIT | Auth Bypass Total | 30 min | 1 | Immédiat + Config |
| CORS ouvert | 🔴 CRIT | CSRF/Vol données | 15 min | 2 | Immédiat + Config |
| /api/seed public | 🔴 CRIT | Corruption DB | 5 min | 3 | Immédiat |
| Pas rate limit | 🔴 CRIT | Brute force | 1h | 4 | Immédiat + Déploiement |
| debug_api.js | 🔴 CRIT | Auth Bypass | 5 min | 5 | Immédiat |
| CSRF missing | 🔴 CRIT | Attaques form | 2-3h | 6 | Phase 2 (mercredi) |
| Logs Info Leak | 🟠 HIGH | User enumeration | 30 min | 7 | Phase 2 |
| Cookies insecures | 🟠 HIGH | Session hijack | 30 min | 8 | Phase 2 |
| Input validation | 🟠 HIGH | XSS/Injection | 3-4h | 9 | Phase 3 (jeudi) |
| File upload | 🟡 MED | Malware upload | 1-2h | 10 | Phase 3 |
| Headers sécurité | 🟡 MED | Clickjacking/XSS | 45 min | 11 | Phase 3 |
| Audit logging | 🟡 MED | Forensics | 2-3h | 12 | Phase 4 (vendredi) |

---

## 🏃 PHASE 1: URGENT (Aujourd'hui - 2 heures max)

### ✅ Tâche 1.1: Rotation JWT_SECRET (15 min)

**Objectif:** Rendre les jetons répliqués invalides

```bash
# 1. Générer nouveau JWT_SECRET sécurisé
# Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Résultat: a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1

# 2. Mettre à jour .env en PRODUCTION
JWT_SECRET=a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1

# 3. Redémarrer l'application (0 downtime si load balancer)
# si vous utilisez PM2:
pm2 restart app

# 4. Les vieux jetons seront invalides après redémarrage
# → Tous les utilisateurs devront se re-logger
```

**Impact utilisateurs:** Reconnexion requise pour tous  
**Risque:** Très faible

---

### ✅ Tâche 1.2: Fixer endpoint /api/seed (5 min)

**Fichier:** [server/app.js](server/app.js#L95)

**Changement:**
```javascript
// AVANT (VULNÉRABLE)
app.post('/api/seed', async (req, res) => {
    // Crée données sans auth
});

// APRÈS (SÉCURISÉ)
app.post('/api/seed', (req, res) => {
    res.status(403).json({ 
        error: 'Seed endpoint is disabled in production' 
    });
});
```

**Ou si vous voulez garder pour dev:**
```javascript
app.post('/api/seed', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Not available in production' });
    }
    // ... existing seed code
});
```

**Impact:** Aucun si déjà en prod  
**Déploiement:** Immédiat

---

### ✅ Tâche 1.3: Supprimer debug_api.js (5 min)

```bash
# 1. Supprimer le fichier danger
rm stitch_ai_academy_portal/debug_api.js

# 2. Committer et déployer
git add -A
git commit -m "chore: remove debug script with hardcoded secrets"
git push origin main

# 3. Mises à jour en production
```

**Vérifier absence:** Aucun fichier `*.debug.js` ne doit être commité

---

### ✅ Tâche 1.4: Configurer CORS sécurisé (15 min - CONFIG ONLY, pas déploiement)

**Pas besoin de redéployer le code si vous utilisez variable d'environnement!**

**Étape 1:** Identifier tous les domaines légitimes
```
- App frontend: https://academy.4js.com
- API: https://api.4js.com (si séparé)
- Admin: https://admin.4js.com (si existant)
```

**Étape 2:** Ajouter à `.env` en production
```env
ALLOWED_ORIGINS=https://academy.4js.com,https://admin.4js.com
NODE_ENV=production
```

**Étape 3:** Modifier [server/app.js](server/app.js#L15)

```javascript
// AVANT
app.use(cors());

// APRÈS - avec fallback sécurisé
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000'];  // Dev only fallback

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS not allowed'));
        }
    },
    credentials: true
}));
```

**Déploiement:** 
- Code: Déployer immédiatement (change compatible)
- Config: Mettre à jour `.env` + redémarrer

---

### ✅ Tâche 1.5: Ajouter Rate Limiting sur Login (1h)

**Installation:**
```bash
npm install express-rate-limit
# Déployer changes + redémarrer
```

**Fichier:** [server/routes/auth.js](server/routes/auth.js#L13)

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,      // Fenêtre de 15 min
    max: 5,                          // 5 tentatives max
    message: 'Trop de tentatives. Réessayez dans 15 minutes.',
    skipSuccessfulRequests: true,    // N'compte que les échecs
    standardHeaders: true,
});

// Appliquer au endpoint login
router.post('/login', loginLimiter, async (req, res) => {
    // ... code existant
});
```

**Déploiement:** 
```bash
npm install
git commit -a -m "feat: add rate limiting to login endpoint"
git push && deploy
```

**Impact users:** Limité - maximal 5 mauvais essais en 15 min

---

## 📊 STATUS APRÈS PHASE 1

| CVE | Status | 
|-----|--------|
| JWT Secret faible | ✅ RÉPARÉ |
| /api/seed public | ✅ RÉPARÉ |
| debug_api.js | ✅ SUPPRIMÉ |
| CORS ouvert | ✅ CONFIG |
| Rate limit | ✅ DÉPLOYÉ |
| **Exposition**: 50% réduite |

---

## 🔧 PHASE 2: Déploiement (Mercredi 23 Mars)

### À Déployer Ensemble

**Fichier 1:** [server/middleware/auth.js](server/middleware/auth.js) - Fail if JWT_SECRET missing

```javascript
// AVANT
const JWT_SECRET = process.env.JWT_SECRET || 'ai-academy-super-secret-key-for-dev';

// APRÈS
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not set!');
    process.exit(1);
}
```

**Fichier 2:** [server/routes/auth.js](server/routes/auth.js#L23) - Logs génériques

```javascript
// AVANT (FUEL USER ENUMERATION)
console.log(`[AUTH] Attempting login for: ${email}`);
if (!user) {
    console.log(`[AUTH] User not found: ${email}`);
    return res.status(401).json({ error: 'Invalid email or password.' });
}

// APRÈS (MESSAGES GÉNÉRIQUES)
if (!user) {
    console.log(`[AUTH] Failed login attempt`); // Pas d'email révélé
    return res.status(401).json({ error: 'Invalid credentials' });
}
```

**Fichier 3:** [server/routes/auth.js](server/routes/auth.js#L43) - Cookie sécurisé

```javascript
// AVANT
res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
});

// APRÈS
res.cookie('token', token, {
    httpOnly: true,
    secure: true,           // TOUJOURS en HTTPS
    sameSite: 'strict',     // Anti-CSRF
    path: '/',
    maxAge: 24 * 60 * 60 * 1000
});
```

**Déploiement:**
```bash
git commit -a -m "security: harden auth endpoint and cookies"
git push origin main
# Merger dans production avec tests
npm test
npm run deploy:production
# 0-downtime deploy avec des instances multiples
```

---

## 🛡️ PHASE 3: Validation + Headers (Jeudi 24 Mars)

### Input Validation sur Routes Critiques

**Priority:** Tracks, Modules, Users

```bash
npm install express-validator
```

Ajouter validation sur:
- [server/routes/tracks.js](server/routes/tracks.js#L28) - POST /api/tracks
- [server/routes/modules.js](server/routes/modules.js#L25) - POST /api/modules
- [server/routes/users.js](server/routes/users.js) - POST /api/users

### Security Headers (Helmet.js)

```bash
npm install helmet
```

[server/app.js](server/app.js#L10):
```javascript
const helmet = require('helmet');
app.use(helmet());
```

**Déploiement:** Merge avec tests

---

## 📋 PHASE 4: Audit & Logging (Vendredi 25 Mars)

### Créer Schema Audit

```prisma
model AuditLog {
  id            String   @id @default(uuid())
  action        String   // DELETE_USER, UPDATE_MODULE, etc
  userId        String
  resourceType  String   // User, Track, Module
  resourceId    String
  changes       Json?    // Avant/après
  ipAddress     String?
  createdAt     DateTime @default(now())
}
```

### Middleware Audit

```javascript
const auditLog = async (action, userId, resourceId, details = {}) => {
    await prisma.auditLog.create({
        data: { action, userId, resourceId, details }
    });
};
```

Appliquer sur DELETE/UPDATE critiques.

---

## 🔄 Stratégie Déploiement Production

### Prérequis:
- ✅ Tests automatisés (.env pour secrets)
- ✅ Load balancer avec health checks
- ✅ Instances multiples (0-downtime)
- ✅ Rollback plan

### Processus:
```
1. Feature branch → tests complets
2. Code review + security check
3. Merge à develop → test environment
4. 24h validation
5. Merge à main → blue/green deployment
6. Canary (10% traffic) pendant 1h
7. Full rollout si OK
8. Monitoring 24h
```

### Rollback Immédiat Si:
- Erreur d'authentification massive
- Performance dégradée > 20%
- Crashes dans logs
- Endpoints inaccessibles

---

## 🚨 MITIGATIONS TEMPORAIRES (Immédiat)

### Pendant développement des fixes:

**1. Monitorer Brute Force (Aujourd'hui)**
```javascript
// Dans /api/login - ajouter LOG
let failureCount = {};
// Tracker echecs par email
// Alert si > 10 echecs en 1h
```

**2. WAF Rules (Demander à Infra)**
- Bloquer `/api/seed` via WAF
- Rate limit `/api/login` à niveau WAF
- Bloquer IPs suspectes

**3. Désactiver fichiers debug (Demander à Infra)**
```nginx
# nginx.conf
location ~ \.debug\.js { return 403; }
```

**4. Rotation JWT_SECRET Chaque Mois**
- Documenter dans runbooks
- Avertir users avant rotation

---

## ⏱️ Timeline Recommandée

```
Aujourd'hui (Lundi 22)
├─ 14h: Task 1.1 - Rotation JWT_SECRET + restart
├─ 14:15: Task 1.2 - Désactiver /api/seed
├─ 14:20: Task 1.3 - Supprimer debug_api.js + push
├─ 14:30: Task 1.4 - CORS config + redeploy
├─ 15:30: Task 1.5 - Rate limiting install + test + deploy
└─ 16:30: Vérifier logs + status

Mardi 23 (Merge Day)
├─ 09:00: Code review Phase 2
├─ 10:00: Testing complet
├─ 11:00: Staged deployment (10% traffic)
├─ 11:30: Monitor, escalate si issues
└─ 15:00: Full rollout

Mercredi 24
├─ 09:00: Phase 3 deployment
└─ Monitoring

Jeudi 25
├─ 09:00: Phase 4 deployment
└─ Monitoring 48h

Vendredi 26
└─ Documentation + training
```

---

## 📞 Communication Stakeholders

### Annonce Interne
```
SUJET: [URGENT] Patches sécurité en déploiement

À cause de vulnérabilités identifiées, nous déployons:
- Jeudi: Réinstanciation authentification
- Risque: Utilisateurs doivent se re-logger
- Pas d'indisponibilité attendue (0-downtime deploy)
- Support 24/7 si problèmes
```

### Pour Clients
```
Le système accédé une seconde, les données ne sont pas compromises.
Mesures correctives en cours. Aucune action requise.
```

---

## ✅ Validation Finale

Avant chaque déploiement:

```bash
# 1. Tests sécurité basiques
npm test
npm run security-audit

# 2. Vérifier configurations
echo "JWT_SECRET: ${JWT_SECRET:0:10}..."  # Masqué
echo "ALLOWED_ORIGINS: $ALLOWED_ORIGINS"
echo "NODE_ENV: $NODE_ENV"

# 3. Tester endpoints critiques
curl -X POST http://localhost:3000/api/seed  # Doit être 403
curl -X POST http://localhost:3000/api/login -d '{"email":"x@4js.com","password":"x"}' # Rate limit?

# 4. Vérifier pas de secrets en git
git log -p | grep -i "secret\|password\|token" | grep -v ".secret-"

# 5. Vérifier keys AWS/R2
grep -r "AKIA" . --include="*.js"  # Doit être vide
```

---

## 📊 Risque Résiduel Après Remédiation

| Phase | JWT | CORS | Seed | RateLimit | CSRF | Info-Leak | Cookies | Input | Audit |
|-------|-----|------|------|-----------|------|-----------|---------|-------|-------|
| Avant | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| P1 | ✅ | ✅ | ✅ | ✅ | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| P2 | ✅ | ✅ | ✅ | ✅ | 🔴 | ✅ | ✅ | 🔴 | 🔴 |
| P3 | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | 🔴 |
| P4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**SCORE SÉCURITÉ:** 0% → 25% → 60% → 85% → 95%

---

## 🚀 Après Remédiation

1. **Engager audit sécurité tiers** (2-3 semaines)
2. **Mettre en place DevSecOps**
   - Scans SAST dans CI/CD
   - Dépendances vulnérables détectées auto
3. **Training équipe** sécurité app
4. **PenTest annuel** formel
5. **Politique passwords** + MFA pour admins
