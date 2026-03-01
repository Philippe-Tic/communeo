# Communeo — Analyse des coûts et rentabilité

> Dernière mise à jour : 28 février 2026

## 1. Architecture technique

Communeo repose sur 3 briques :

| Brique | Techno | Hébergement |
|--------|--------|-------------|
| Backend API | Strapi v5 + PostgreSQL | VPS (Docker Compose) |
| Dashboard admin | React 19 (SPA statique) | Même VPS (Nginx) |
| Sites publics mairies | Astro (HTML statique) | Netlify (1 site par mairie) |

Les déploiements des sites municipaux sont des uploads ZIP vers Netlify (pas de CI Netlify consommé). Les builds se font sur le VPS.

---

## 2. Coûts d'infrastructure mensuels

| Service | Détail | Coût/mois |
|---------|--------|-----------|
| VPS | Hetzner CX21 (2 vCPU, 4 GB RAM) ou équivalent | €8 |
| PostgreSQL | Auto-hébergé sur le VPS | €0 |
| Stockage médias | Volume Docker local | €0 |
| SSL backend | Let's Encrypt (Certbot) | €0 |
| Email transactionnel | Brevo gratuit (300 emails/jour) | €0 |
| Nom de domaine | ~€12/an | €1 |
| Netlify (sites publics) | Starter gratuit (100 GB bande passante) | €0 |

**Total infrastructure : ~€9/mois**

### Montée en charge (infra uniquement)

| Nombre de clients | VPS recommandé | Netlify | Total infra |
|-------------------|---------------|---------|-------------|
| 1-5 | 2 vCPU / 4 GB (~€8) | Free | ~€9 |
| 5-20 | 4 vCPU / 8 GB (~€20) | Free | ~€21 |
| 20-50 | 8 vCPU / 16 GB (~€35) | Pro ($19) | ~€55 |
| 50-100+ | Dédié ou multi-VPS (~€60) | Pro ($19) + S3 (~€5) | ~€85 |

---

## 3. Coûts administratifs fixes (micro-entreprise)

| Poste | Coût/mois |
|-------|-----------|
| Cotisations URSSAF (BIC services) | 21.1% du CA |
| Versement libératoire IR | 1.7% du CA |
| **Total charges sur CA** | **22.8% du CA** |
| CFE (cotisation foncière entreprise) | ~€20 |
| Assurance RC Pro | ~€20 |

> Chaque euro facturé ne rapporte que **€0.77 net** après charges sociales et fiscales.

---

## 4. Prix minimum par palier de clients

Formule :

```
Prix minimum/client = (Coûts infra + Coûts admin fixes) ÷ (Nombre clients × 0.77)
```

| Clients | Infra | Admin fixes | Total coûts | CA nécessaire (÷0.77) | Prix min/client |
|---------|-------|-------------|-------------|----------------------|-----------------|
| **1** | €9 | €40 | **€49** | €64 | **€64/mois** |
| 3 | €9 | €40 | €49 | €64 | €21/mois |
| 5 | €9 | €40 | €49 | €64 | €13/mois |
| 10 | €15 | €40 | €55 | €71 | €7/mois |
| 20 | €21 | €40 | €61 | €79 | €4/mois |
| 50 | €55 | €40 | €95 | €123 | €2.5/mois |

**Avec 1 seul client, il faut facturer au minimum €64/mois pour couvrir tous les frais.**

---

## 5. Grille tarifaire et projections de CA annuel

### Hypothèse : prix unique à €19/mois

| Clients | CA mensuel | CA annuel | Coûts mensuels | Résultat net mensuel | Résultat net annuel |
|---------|-----------|-----------|---------------|---------------------|-------------------|
| 1 | €19 | €228 | €49 + €4 charges | -**€34** | -€408 |
| 3 | €57 | €684 | €49 + €13 charges | -€5 | -€60 |
| **4** | **€76** | **€912** | **€49 + €17 charges** | **+€10** | **+€120** |
| 5 | €95 | €1 140 | €49 + €22 charges | +€24 | €288 |
| 10 | €190 | €2 280 | €55 + €43 charges | +€92 | €1 104 |
| 20 | €380 | €4 560 | €61 + €87 charges | +€232 | €2 784 |
| 50 | €950 | €11 400 | €95 + €217 charges | +€638 | €7 656 |

> Seuil de rentabilité à €19/mois : **4 clients**

### Hypothèse : prix unique à €29/mois

| Clients | CA mensuel | CA annuel | Coûts mensuels | Résultat net mensuel | Résultat net annuel |
|---------|-----------|-----------|---------------|---------------------|-------------------|
| 1 | €29 | €348 | €49 + €7 charges | -€27 | -€324 |
| **3** | **€87** | **€1 044** | **€49 + €20 charges** | **+€18** | **+€216** |
| 5 | €145 | €1 740 | €49 + €33 charges | +€63 | €756 |
| 10 | €290 | €3 480 | €55 + €66 charges | +€169 | €2 028 |
| 20 | €580 | €6 960 | €61 + €132 charges | +€387 | €4 644 |
| 50 | €1 450 | €17 400 | €95 + €331 charges | +€1 024 | €12 288 |

> Seuil de rentabilité à €29/mois : **3 clients**

### Hypothèse : prix unique à €49/mois

| Clients | CA mensuel | CA annuel | Coûts mensuels | Résultat net mensuel | Résultat net annuel |
|---------|-----------|-----------|---------------|---------------------|-------------------|
| 1 | €49 | €588 | €49 + €11 charges | -€11 | -€132 |
| **2** | **€98** | **€1 176** | **€49 + €22 charges** | **+€27** | **+€324** |
| 5 | €245 | €2 940 | €49 + €56 charges | +€140 | €1 680 |
| 10 | €490 | €5 880 | €55 + €112 charges | +€323 | €3 876 |
| 20 | €980 | €11 760 | €61 + €223 charges | +€696 | €8 352 |
| 50 | €2 450 | €29 400 | €95 + €559 charges | +€1 796 | €21 552 |

> Seuil de rentabilité à €49/mois : **2 clients**

### Hypothèse : prix unique à €79/mois

| Clients | CA mensuel | CA annuel | Coûts mensuels | Résultat net mensuel | Résultat net annuel |
|---------|-----------|-----------|---------------|---------------------|-------------------|
| **1** | **€79** | **€948** | **€49 + €18 charges** | **+€12** | **+€144** |
| 5 | €395 | €4 740 | €49 + €90 charges | +€256 | €3 072 |
| 10 | €790 | €9 480 | €55 + €180 charges | +€555 | €6 660 |
| 20 | €1 580 | €18 960 | €61 + €360 charges | +€1 159 | €13 908 |
| 50 | €3 950 | €47 400 | €95 + €901 charges | +€2 954 | €35 448 |

> Seuil de rentabilité à €79/mois : **1 client** (rentable dès le premier)

---

## 6. Synthèse : seuils de rentabilité

| Prix/mois | Clients pour être rentable | CA annuel à ce seuil |
|-----------|---------------------------|---------------------|
| €19 | 4 clients | €912 |
| €29 | 3 clients | €1 044 |
| €49 | 2 clients | €1 176 |
| €79 | 1 client | €948 |

---

## 7. Risques et points d'attention

- **Builds concurrents** : chaque déploiement consomme CPU/RAM sur le VPS. Au-delà de ~20 mairies, prévoir un upgrade serveur.
- **Stockage uploads** : les médias sont sur le disque du VPS. Prévoir migration Cloudinary ou S3 si volume important.
- **Bande passante Netlify** : 100 GB gratuits. Surveiller si sites avec beaucoup de photos/PDFs.
- **Brevo** : 300 emails/jour gratuits. Suffisant pour un bon moment.
- **CFE** : exonérée la 1ère année de création d'entreprise. Les chiffres ci-dessus incluent la CFE.

---

*Ce document ne constitue pas un conseil fiscal. Vérifier les taux URSSAF en vigueur au moment de la création.*
