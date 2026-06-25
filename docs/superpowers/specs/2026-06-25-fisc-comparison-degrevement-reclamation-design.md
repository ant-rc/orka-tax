# Comparaison FISC · dégrèvement · réclamation — Design

**But :** Les `biens` en base sont les valeurs **FISC**. L'utilisateur apporte ses **corrections** (manuellement, par **bulk-edit groupé**, ou par **import Excel**). Le système compare correction vs FISC par invariant, marque chaque bien `resolu` ou `anomalie`, calcule le **dégrèvement signé** (gagné/perdu), l'affiche sur l'écran anomalies, et permet de **générer une réclamation par lot**.

## Principe données : BDD = FISC + valeurs de travail

- Les colonnes canoniques des `biens` = valeurs **FISC d'origine**, figées une fois dans un **snapshot**.
- Migration : ajouter `fisc_snapshot jsonb` aux `biens` et le remplir, pour les biens existants, avec les ~11 champs comparables courants. Toute correction modifie les colonnes de travail ; `fisc_snapshot` ne bouge plus.
- Pour un nouvel import « FISC » (futur), `fisc_snapshot` = valeurs importées (travail = FISC au départ).

## Les 11 champs comparés (« susceptibles de changement »)
`surface_m2`, `nb_pieces`, `nb_wc`, `nb_baignoires`, `nb_douches`, `nb_bidets`, `nb_eviers`, `ascenseur`, `eau_courante`, `gaz`, `electricite`.
Constante partagée `COMPARABLE_FIELDS` (pour la comparaison, le bulk-edit et l'import).

## Comparaison (par invariant)

Module pur `lib/comparison/compare.ts` (+ tests Vitest) :
- `compareBien(fisc, travail): { anomalies: { field, fiscValue, newValue }[] }` — diff champ-à-champ sur `COMPARABLE_FIELDS`, tolérant aux types (réutilise `bienValueEqual`).
- 0 anomalie → statut `resolu`, dégrèvement 0.
- ≥1 anomalie → statut `anomalie`, dégrèvement signé (ci-dessous), `has_anomaly = true`, détail des anomalies persisté (`anomalies jsonb`).
- Matching par `invariant_cadastral` normalisé (`normalizeInvariant`).

## Taux d'imposition (réel, par ville × étage)

- **Réel par commune** : table/constante `TAUX_PAR_COMMUNE` (clé `depcom` ou `ville`) avec les taux réels des villes présentes en base (Paris, Lyon, Marseille, La Rochelle, Biarritz, Villeneuve-le-Roi, …).
- **Modulé par l'étage** : le taux est aussi fonction de l'`etage` → coefficient par étage (`ETAGE_COEFFICIENT`).
- Résolveur pur `resolveTaux(commune, etage): number = TAUX_PAR_COMMUNE[commune] × ETAGE_COEFFICIENT(etage)`.
- *(Valeurs réelles des taux par ville et des coefficients d'étage à renseigner ; structure prête.)*

## Dégrèvement signé (gagné / perdu)

- `VLC_fisc = computeDegrevement(fisc_snapshot, bareme).vlcRecalculee`
- `VLC_corrige = computeDegrevement(valeurs de travail, bareme).vlcRecalculee`
- **`degrevement = (VLC_fisc − VLC_corrige) × resolveTaux(commune, etage)`** — positif (gagné) ou négatif (perdu).
- Étendre `lib/degrevement/compute.ts` pour exposer l'écart **signé** (retirer le `max(0,…)` dans ce chemin).
- Barème : valeurs réelles à brancher (placeholder paramétrable existant).

## Apport des corrections (3 voies, même effet)

1. **Manuel unitaire** : édition d'un bien.
2. **Bulk-edit groupé** (cf. ci-dessous).
3. **Import Excel** : lignes du fichier = valeurs corrigées, matchées par invariant ; met à jour les colonnes de travail des biens correspondants.

Après chaque apport → recompute comparaison + dégrèvement sur les biens touchés.

## Bulk-edit groupé (modal)

- Bouton **« Édition »** sur l'écran biens → **modal à checkboxes**.
- **Regroupement par valeurs identiques** : les biens modifiables ensemble sont ceux qui partagent **exactement les mêmes valeurs sur les 11 champs comparables** (invariants différents). On calcule une **signature** par bien = tuple des 11 champs (`bienSignature`) ; les biens de même signature dans le lot forment un groupe.
- Sélection : cases individuelles **+** raccourci « appliquer aux N biens identiques (même signature) du lot ». Les filtres existants aident à isoler le groupe.
- Choix d'une ou plusieurs **caractéristiques** (parmi `COMPARABLE_FIELDS`) + nouvelle valeur.
- **Appliquer** → met à jour les valeurs de travail des biens cochés (Supabase) → recompute → ceux qui diffèrent du FISC passent en `anomalie` + dégrèvement.
- Exemple : 12 appartements 28 m² strictement identiques, une douche en moins → cocher les 11 autres → `nb_douches` → Appliquer.

## Écran anomalies

- Liste les biens en anomalie (déjà scopé profil). **Par bien** : afficher la/les anomalie(s) détectée(s) (champ : FISC → corrigé) + **dégrèvement ±**.
- Statsbar branchée : « Anomalies à qualifier » = count, « Taux de qualification » = anomalies/total, « Montant récupérable » = Σ dégrèvements positifs.

## Réclamation (par lot)

- Table `reclamations` : `id, org_id, fiscal_profile_id, lot_id, total_degrevement, statut, created_at`, + lignes par bien (vue ou `reclamation_lignes`).
- Bouton **« Générer ma réclamation »** (par lot) → agrège le **dégrèvement ± de tous les biens du lot**, crée la réclamation, fait avancer les biens (`anomalie → reclamation`).

## Architecture

```
lib/comparison/compare.ts     (pur, testé)  diff FISC vs travail → anomalies[]
lib/degrevement/compute.ts    (étendu)       écart signé
lib/tax/taux.ts               (pur, testé)   resolveTaux(commune, etage)
lib/domain/comparable.ts                     COMPARABLE_FIELDS + bienSignature() (regroupement bulk-edit)
biens: + fisc_snapshot jsonb, + anomalies jsonb, statut/has_anomaly/degrevement_estime (signé)
reclamations (+ lignes)
UI: bouton Édition (modal bulk-edit) · import (existant) · anomalies-panel (± par bien) · "Générer ma réclamation"
```
Logique métier en modules `lib/` purs, orchestrée côté action — conforme au cadrage.

## Phasage
- **P1 — Données** : migration `fisc_snapshot` (+ `anomalies`) + snapshot des biens existants ; `COMPARABLE_FIELDS`.
- **P2 — Moteur** : `lib/comparison` + `lib/tax/taux` + dégrèvement signé (purs + tests) ; application aux biens (statut, anomalies, montant).
- **P3 — Écran anomalies** : anomalie par bien + montant ±, statsbar branchée.
- **P4 — Bulk-edit & réclamation** : modal d'édition groupée ; import recalcule ; table `reclamations` + « Générer ma réclamation ».

## Hors-scope (pour l'instant)
Génération PDF de la réclamation, auth réelle/RLS par profil, valeurs définitives du barème et des taux (structure prête, valeurs à renseigner).

## Décisions / à renseigner
- Valeurs réelles `TAUX_PAR_COMMUNE` (par ville de la base) et `ETAGE_COEFFICIENT` (par étage).
- Barème réel (`tarifParCategorie`, équivalences).
- Réclamation à dégrèvement **négatif** : générée quand même ? (par défaut oui, montant affiché en « perdu »).
