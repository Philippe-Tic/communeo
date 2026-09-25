# Communeo — Coûts, marché et grille tarifaire

> Mise à jour : 25 septembre 2026 (V2 : inscription en libre-service, essai de 30 jours, devis en ligne).
> Tarifs **d'exemple**, à confirmer (#315). La grille vit dans `packages/core/src/site/pricing.ts`.

## 1. Architecture et coûts d'infrastructure (V2)

| Brique | Rôle | Hébergement |
|--------|------|-------------|
| Strapi 5 + PostgreSQL | API, contenus, file des builds (pg-boss) | VPS (Scaleway ou OVH) |
| Worker de build | Construit chaque site (Astro + Pagefind) et le publie | Même VPS |
| Serveur d'aperçu | Aperçu des brouillons | Même VPS |
| Admin React | Interface des communes et de l'équipe | Même VPS (statique) |
| Sites publics | HTML statique, `<commune>.communeo.fr` ou domaine de la commune | Netlify (DNS communeo.fr compris) |
| E-mails | Invitations, rappels d'essai, devis | Resend |

| Poste | Hypothèse | Coût mensuel |
|-------|-----------|--------------|
| VPS | 4 à 8 vCPU / 8 à 16 Go (builds Astro, Postgres, Strapi) | 20 à 40 € |
| Stockage des sauvegardes | Object storage S3 (à mettre en place) | ~5 € |
| Netlify | Gratuit jusqu'à 100 Go de bande passante, puis Pro (~19 $/membre) | 0 à 20 € |
| Resend | Gratuit jusqu'à 3 000 e-mails/mois, puis ~20 $ | 0 à 20 € |
| Domaine communeo.fr | | ~1 € |
| **Infrastructure** | | **~25 € (début) à ~85 € (100 communes)** |

Coût marginal d'une commune : **1 à 2 € par mois** d'infrastructure. Le vrai coût est ailleurs :
**l'accompagnement** (prise en main, questions, Chorus Pro), estimé à 2 h la première année et 1 h
les suivantes.

## 2. Charges (micro-entreprise, prestations de services)

| Poste | Coût |
|-------|------|
| Cotisations sociales + versement libératoire | ~23 % du chiffre d'affaires |
| CFE (exonérée la 1ʳᵉ année) | ~20 €/mois |
| Assurance RC Pro | ~20 €/mois |
| Stripe Invoicing (#314) | ~0,4 % par facture, virement quasi gratuit |

TVA : en franchise en base (« TVA non applicable, art. 293 B du CGI ») tant que le chiffre d'affaires
reste sous le seuil ; `COMMUNEO_VAT_RATE=0.2` au-delà. Pour une commune, la franchise est un avantage :
elle ne récupère pas la TVA sur ce type de dépense (hors FCTVA), le prix HT est donc son coût réel.

**Charges fixes : ~65 € par mois** (infrastructure de départ, CFE, assurance).

## 3. Le marché (prix publics relevés en septembre 2026)

| Offre | Modèle | Prix |
|-------|--------|------|
| [Campagnol](https://campagnol.fr/offres/tarifs-formules/) (AMRF, associatif) | Abonnement | 120 € TTC/an (5 pages) · 220 € TTC/an (complet) |
| [LaPageLocale](https://lapagelocale.com/index2/pricing.php) | Abonnement | 199 € HT/an + 0,10 € HT par habitant (+ domaine 32 € HT/an) |
| [MaCommune « Prestige »](https://www.macommune.com/les-tarifs-formule-prestige.php) | Abonnement par population | 410 € HT (< 1 000 hab.) à 1 250 € HT/an (> 10 000), + 150 € de mise en service |
| [Ma Petite Mairie](https://www.mapetitemairie.fr/) | Abonnement 36 mois | 9,90 à 69,90 € TTC/mois |
| [Websee Mairie](https://www.websee-mairie.fr/tarifs-site-internet-administrable) | Création + abonnement | 1 290 à 3 990 € HT + 39 € HT/mois |
| [Web Mairie](https://www.web-mairie.fr/tarifs/) (WordPress) | Création + maintenance | 1 790 à 2 290 € HT + ~500 € HT/an |
| 123mairie | Sur devis | Non publié |
| MairieConnect | Abonnement | 399 €/mois (très au-dessus du marché) |

Lecture : les communes rurales ont une référence associative très basse (Campagnol) ; les offres SaaS
spécialisées se situent entre **250 et 1 250 € HT par an** selon la population, souvent avec des frais
de mise en service ; les agences facturent la création (1 300 à 4 000 € HT) puis ~500 € HT/an.

## 4. Grille proposée (exemple)

Abonnement annuel HT, **sans frais de mise en service**, selon la population municipale INSEE (lue
par le serveur au moment du devis : la commune ne peut pas la modifier).

| Population | Prix HT / an | Soit / mois | Repère |
|------------|--------------|-------------|--------|
| moins de 500 hab. | **290 €** | 24 € | au-dessus de Campagnol (associatif), sous MaCommune (560 € la 1ʳᵉ année) |
| 500 à 1 999 | **390 €** | 33 € | LaPageLocale ~250 à 400 € · MaCommune 450 à 510 € |
| 2 000 à 4 999 | **590 €** | 49 € | LaPageLocale ~400 à 700 € · MaCommune 550 à 810 € |
| 5 000 à 9 999 | **890 €** | 74 € | LaPageLocale ~700 à 1 200 € · MaCommune 1 050 € |
| 10 000 et plus | **1 290 €** | 108 € | MaCommune 1 250 € · LaPageLocale 1 200 € et plus |

Pourquoi ce niveau :

- **Compétitif sans casser le marché** : dans la fourchette des SaaS spécialisés, sans frais de mise en
  service, et nettement sous le coût d'une agence. Pas de guerre des prix avec Campagnol, soutenu par
  l'AMRF : Communeo ne vise pas le même besoin (thèmes, conformité RGAA, démarches, newsletter, alertes
  en direct).
- **Par tranches de population** : c'est la façon dont les communes raisonnent leur budget ; une petite
  commune ne paie pas pour une grande.
- **Couvre l'accompagnement** : même à 290 €, il reste ~220 € après charges pour ~2 h de support et
  une part d'infrastructure.
- **Sous les seuils** : quelques centaines d'euros par an, marché de faible montant sans mise en
  concurrence, validé en ligne par le maire ou une personne ayant délégation.

## 5. Rentabilité (prix moyen ~450 € HT/an, soit ~37 €/mois)

| Communes | CA annuel | Net après charges sociales | Charges fixes (an) | Résultat annuel |
|----------|-----------|----------------------------|--------------------|-----------------|
| 3 | 1 350 € | 1 040 € | ~780 € | ~260 € |
| 10 | 4 500 € | 3 465 € | ~900 € | ~2 565 € |
| 50 | 22 500 € | 17 325 € | ~1 400 € | ~15 900 € |
| 100 | 45 000 € | 34 650 € | ~1 850 € | ~32 800 € (TVA et régime à revoir) |

**Seuil de rentabilité : 2 à 3 communes.** Le temps d'accompagnement n'est pas compté dans ces
chiffres : c'est lui qu'il faut surveiller au-delà de quelques dizaines de communes.

## 6. Points d'attention

- **Sauvegardes** : à mettre en place avant la première commune cliente ; elles ne figurent pas dans
  l'offre tant qu'elles n'existent pas.
- **Hébergement** : les sites publics sont chez Netlify ; « hébergé en France » ne peut pas être promis
  tant que ce n'est pas le cas.
- **Bande passante Netlify** : surveiller au-delà de 100 Go/mois (communes avec beaucoup de PDF).
- **Seuil de franchise de TVA** : vérifier le seuil en vigueur ; au-delà, la TVA s'ajoute au prix HT.
- **Seuils de la commande publique** : à vérifier au moment de publier les CGV (#315).

*Ce document ne constitue pas un conseil fiscal ou juridique. Vérifier les taux et seuils en vigueur.*
