# 📢 Communication Templates - Incident Sécurité

---

## 📧 Template 1: Notification Interne (Engineering)

**Subject:** [URGENT] Patches Sécurité - Remédiation en cours

**Body:**
```
À toute l'équipe,

Suite à un audit de sécurité, nous avons identifié 6 vulnérabilités 
CRITICAL qui nécessitent remédiation immédiate.

STATUT: En cours de correction (ne pas paniquer, pas de breach confirmé)

TIMELINE:
• Lundi 22 Mars (Aujourd'hui) - Phase 1:
  - Rotation JWT_SECRET (impact: users relogging)
  - Désactivation endpoint /api/seed
  - Rate limiting sur login
  - Configuration CORS restrictive
  
• Mardi 23+ - Phases 2-4

POUR VOUS:
• DevOps: Peut avoir besoin redémarres serveurs
• Frontend: Users verront "Please login again" messages
• Backend: Code review demandée mercredi
• QA: Tests sécurité à ajouter à suite de test

DOCUMENTATION: 
- Plan détaillé: REMEDIATION_PLAN_FR.md
- Checklist Phase 1: PHASE1_CHECKLIST.md
- Audit complet: SECURITY_AUDIT.md

QUESTIONS? Slack #security ou @cto

CTO
```

---

## 📧 Template 2: Notification Users (Customer Comms)

**Subject:** Maintenance de Sécurité - Accès Temporaire Possible

**Body:**
```
Chers utilisateurs,

Nous effectuons une maintenance de sécurité sur la plateforme AI Academy 
le:

📅 Lundi 22 Mars, 14h00-17h00 CET

DURANT CETTE PÉRIODE:
✓ La plateforme reste accessible
✓ Vous pourrez être demandé de vous re-connecter
✓ Aucune perte de données
✓ Vos avancées et certificats sont sauvegardés

ACTIONS REQUISES:
→ Si se déconnecté, connectez-vous normalement
→ Aucune nouvelle action de votre part nécessaire
→ Continuez vos cours normalement après maintenance

SUPPORT:
En cas de problème: support@academy.4js.com
Temps de réponse: < 15 minutes pendant maintenance

Merci pour votre compréhension.

Équipe AI Academy
```

---

## 📧 Template 3: Management/Stakeholders (Executive)

**Subject:** Security Incident Mitigation - Timeline & Impact

**Body:**
```
[EXECUTIVES ONLY - CONFIDENTIAL]

SITUATION:
Audit de sécurité identifie 6 CVE CRITICAL affectant authentification, 
autorisation, et intégrité données.

SCOPE:
- Vulnérabilités liées à configuration et secrets hardcodés
- Aucun breach de données confirmé pour le moment
- Exposition depuis plusieurs mois (depuis lancement)

RISQUE MÉTIER:
• AVANT mitigation: Attaquants peuvent accéder compte utilisateurs
• APRÈS Phase 1: 50% réduit aujourd'hui
• APRÈS Phase 4 (vendredi): 95% mitigé

TIMELINE & COST:
• Phase 1 (Today, 2-3h): Code changes + config
• Phase 2 (Mardi, 4h): Deployment + testing
• Phase 3-4 (Next 48h): Validation
• Total Effort: ~15 engineer hours
• Coût: Négligible (équipe interne)

IMPACT UTILISATEURS:
✓ Phase 1: Users relogged (5-10 min inconvenience)
✓ Phases 2-4: Transparent

USER COMMUNICATION:
→ Message aux utilisateurs (voir template ci-dessus)
→ Timing: Juste avant Phase 1
→ Support team alerte pour questions

NEXT STEPS:
1. Approbation security plan (aujourd'hui 14h)
2. Exécution Phase 1 (aujourd'hui 14h-17h)
3. Monitoring 24/7
4. Audit tiers (recommandé pour Q2)

QUESTIONS? Direct au CTO.

---
CTO
AI Academy Platform
```

---

## 📧 Template 4: Board/Audit Committee (Legal/Compliance)

**Subject:** Security Remediation Plan - Compliance & Risk Mitigation

**Body:**
```
[BOARD & COMPLIANCE ONLY]

EXECUTIVE SUMMARY:
Following security assessment, AI Academy Platform identified 6 CRITICAL 
vulnerability exposing user authentication and data integrity. Remediation 
plan in progress.

REGULATORY IMPACT:
• GDPR: Potential data access vulnerability (notification may be required)
• SOC 2: Security control failure (if scope)
• Insurance: Notification required to cyber carrier if policy requires

RECOMMENDATION:
1. ✓ Immediate remediation (in progress)
2. ✓ Third-party audit within 30 days
3. ✓ Enhanced monitoring (ongoing)
4. ✓ Compliance notification (if required - assess with counsel)

REMEDIATION DETAIL:
See attachment: REMEDIATION_PLAN_FR.md

TIMELINE:
• Today: Execute Phase 1 (immediate risk reduction)
• Wed-Fri: Complete remaining phases
• Next week: Third-party audit engagement

INSURANCE NOTIFICATION:
Recommend informing cyber insurance carrier per policy requirements.
Legal to confirm notification threshold met.

Contact: [CTO Name]
Date: March 22, 2026
```

---

## 🚨 Template 5: If Breach Suspected

**Subject:** [CRITICAL] Potential Security Breach - Emergency Response

**Body:**
```
SITUATION: Potential unauthorized access detected

IMMEDIATE ACTIONS (executed immediately):
✓ Shutdown affected services
✓ Preserve logs for forensics
✓ Isolate compromised systems
✓ Notify law enforcement (if required)
✓ Activate incident response team

COMMUNICATIONS:
→ Internal: All staff notified
→ Users: Notification prepared, awaiting legal review
→ Regulators: Legal team notifying per GDPR/requirements
→ Insurance: Cyber carrier notified

TIMELINE:
• Hour 1: Incident confirmation, external legal engaged
• Hour 3: Forensic investigation begun
• Hour 6: Preliminary assessment available
• Day 1: Full incident report to management
• Day 2: User notification (if required)
• Day 3: Public communication (if required)

ESCALATION:
CEO, General Counsel, CFO, CTO, Board Chair

Contact incident commander: [On-call number]
```

---

## 📱 Slack Message Template (Engineering)

```
🚨 SECURITY ALERT

6 CVE CRITICAL found in audit. Remediating today.

DETAILS:
• JWT secret vulnerability
• CORS misconfiguration  
• Rate limiting missing
• Debug endpoints exposed

TIMELINE:
🔴 Phase 1 (NOW - 2h): Code fixes + config changes
🟠 Phase 2 (Tue): Full deployment
🟡 Phase 3-4 (Wed-Thu): Hardening

IMPACT:
Users: Will need to login again around 2-3 PM
Dev: Code review tomorrow
Ops: Potential restart needed

Docs:
→ Full plan: REMEDIATION_PLAN_FR.md
→ Today's tasks: PHASE1_CHECKLIST.md

Questions? @cto or #security

🔗 Let's gooo
```

---

## 📞 Escalation Contacts

**Emergency Security Incident Contacts:**

| Role | Contact | Hours |
|------|---------|-------|
| CTO | [+33-XXX-XXX-XXXX] | 24/7 |
| Security Lead | [name@4js.com] | 24/7 |
| DevOps On-Call | [+33-XXX-XXX-XXXX] | 24/7 |
| External Counsel | [law-firm] | B-hours + emergency |
| Cyber Insurance | [insurance-co.com] | B-hours + emergency |

---

## 📋 FAQ FOR CUSTOMER SUPPORT

**Q: Will my courses/progress be lost?**  
A: No. All your data is backed up. You may need to login again.

**Q: When is the maintenance?**  
A: Monday March 22, starting around 2 PM CET. Should be done by 5 PM.

**Q: Can I schedule courses during maintenance?**  
A: The platform will be available but may ask you to re-login. Best to wait until after 5 PM.

**Q: Is my account compromised?**  
A: We found no evidence of unauthorized access. This is a preventive security update.

**Q: What should I do if I see unusual activity?**  
A: Contact support@academy.4js.com immediately with details.

**Q: Do I need to change my password?**  
A: You might be logged out. Just login with your current credentials.

---

## ✅ Pre-Communication Checklist

Before sending any communications:

```
[ ] Legal review completed (template 3-5)
[ ] Leadership approval obtained
[ ] Support team briefed
[ ] Docs prepared (runbooks, FAQs)
[ ] Contact list verified
[ ] Timing coordinated (not during holidays/weekends)
[ ] Monitoring tools ready
[ ] Rollback plan reviewed
[ ] If needed: External counsel consulted
[ ] Translation reviewed (if needed)
```

---

**Last Updated:** March 22, 2026  
**Review Cycle:** Before each deployment
