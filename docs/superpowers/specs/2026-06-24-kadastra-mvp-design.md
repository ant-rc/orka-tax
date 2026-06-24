# Spec — KADASTRA MVP (ORKA.TAX B2B)

> Plateforme B2B de vérification de la taxe foncière à l'échelle d'un portefeuille.
> Date : 2026-06-24 · Cible : B2B (asset managers / gestionnaires de patrimoine) · Réalisation : solo, quelques semaines · Stack : Next.js (Vercel) + Supabase.

---

## 1. Objectif & périmètre

### Problème
Le parcours actuel d'ORKA.TAX fonctionne pour 1 à 5 biens en saisie unitaire. Un bailleur social ou une foncière gère 100 à plusieurs milliers de lots : la saisie bien par bien est une impasse. Kadastra **industrialise l'entrée des données** (import de masse) et la simulation du dégrèvement.

### Périmètre MVP (verrouillé)
1. **Auth + organisation** B2B (multi-tenant léger).
2. **Lot (dossier)** : créer / modifier / lister un regroupement de biens (1 lot → N biens).
3. **Pipeline d'import** d'un fichier CSV/Excel de biens dans un lot : **Upload → Mapping → Validation → Restitution** (cœur technique).
4. **Bien** : consultation, édition des champs/pièces, indicateur de complétude.
5. **Simulation du dégrèvement** recalculée selon les pièces du bien (module pur, barème paramétrable).

### Hors périmètre MVP (exclus explicitement)
- Page 2 « Gestion des anomalies » (qualification, priorisation, actions en lot) → phase ultérieure.
- Rapprochement ERP ↔ données fiscales (matching cadastral réel) → phase ultérieure.
- Système de crédits / paiement, OCR / IA, génération PDF avancée, notifications, traitement asynchrone.
- Connexion directe ERP (Yardi, Altaix, Sapheer).

> Ces éléments figurent dans le brief mais ne font pas partie du MVP. Le pipeline d'import est conçu pour qu'ils s'y greffent sans réécriture.

---

## 2. Stack technique

| Couche | Choix | Justification |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Déploiement natif Vercel, Server Actions / Route Handlers |
| Styling | **Tailwind CSS** (mobile-first) | Colle à la maquette, rapide |
| Composants | **shadcn/ui** + **TanStack Table v8** | Table tri/filtre/pagination (cœur des vues), Dialog, formulaires |
| Validation | **Zod** | Forms + validation des lignes d'import |
| Backend | **Supabase** : Postgres + Auth + Storage + RLS | Pas de serveur à maintenir en solo |
| Parsing | **`xlsx` (SheetJS)** pour Excel, **`csv-parse`** pour CSV | Imposés/suggérés par le brief |
| Matching colonnes | normalisation + table de synonymes + **Levenshtein normalisé** | Cœur du mapping (cf. §6) |
| Tests | **Vitest** | Tests unitaires mapping + dégrèvement |
| Qualité | ESLint, Prettier, Husky + commitlint (conventional commits) | Conformité conventions projet |

**Principe d'architecture** : la logique métier (mapping, validation, dégrèvement) vit dans des **modules purs `lib/`**, testables sans Next ni Supabase. Les Server Actions / Route Handlers orchestrent ; l'UI ne contient pas de logique métier.

---

## 3. Modèle de données

Toutes les tables portent `org_id` et sont protégées par RLS (un utilisateur n'accède qu'aux données des organisations dont il est membre).

```
organizations        id, name, created_at
memberships          org_id, user_id (auth.users), role            -- multi-tenant
profiles             user_id (auth.users), full_name, default_org_id

lots                 id, org_id, name, reference, source_erp,
                     status, biens_count (denormalisé), created_at, updated_at

biens                id, lot_id, org_id, status, completeness (0-100, calculée),
                     -- champs canoniques internes (cf. dictionnaire §5) :
                     invariant_cadastral, rue, depcom, ville, nom_immeuble,
                     nature, ponderation_nature, etage, categorie, surface_m2,
                     coeff_entretien, coeff_situation_particuliere, coeff_situation_generale,
                     ascenseur, eau_courante, gaz, electricite,
                     nb_baignoires, nb_douches, nb_bidets, nb_wc, nb_eviers,
                     egout, nb_pieces, nb_vide_ordures,
                     -- simulation :
                     degrevement_estime numeric, estimation_params jsonb, estimation_computed_at,
                     created_at, updated_at

import_batches       id, lot_id, org_id, filename, file_type (csv|xlsx),
                     status (uploaded|mapped|validated|imported|failed),
                     rows_total, rows_ok, rows_ko, mapping jsonb,
                     errors jsonb, created_at

column_mappings      id, org_id, source_signature (hash des en-têtes),
                     mapping jsonb, created_at        -- persistance/mémoire du mapping (bonus 2A)
```

**Statuts d'un bien** (sous-ensemble MVP du tunnel) : `importe → incomplet → complet → simule`.
**Statuts d'un lot** : `brouillon → en_import → pret` (verrou « Générer mon rapport » = tous biens `complet`/`simule`).

RLS (modèle) : `USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()))` sur chaque table.

---

## 4. Vues & parcours

### 4.1 App shell
Sidebar (cf. maquette) + header. Garde de route : redirige vers login si non authentifié.

### 4.2 Liste des lots
- Table TanStack : nom, référence, nb biens, statut, date.
- Recherche, filtres, pagination.
- Action **« Créer un lot »** (Dialog : nom + référence).

### 4.3 Détail d'un lot
- En-tête : nom, statut, compteur biens (ex. 10/150).
- Bouton **« Importer des biens »** → ouvre le tunnel d'import (§4.4).
- Table des biens du lot : invariant, adresse, ville, complétude, dégrèvement estimé, statut.
- Bouton **« Générer mon rapport »** — désactivé tant que le rapprochement/complétude n'est pas total (verrou matérialisé).

### 4.4 Tunnel d'import (cœur)
Wizard 4 étapes, chacune fonctionnelle :
1. **Upload** : drag & drop CSV/Excel → extraction des en-têtes + aperçu des 5 premières lignes.
2. **Mapping** : proposition automatique colonne fichier → champ canonique, avec score de confiance et aperçu d'échantillon par colonne ; l'utilisateur corrige/confirme.
3. **Validation** : contrôle colonnes obligatoires, types, conventions hétérogènes ; remontée des erreurs ligne par ligne **sans crash serveur**.
4. **Restitution** : tableau des biens importés, champs remplis vs manquants distingués visuellement ; confirmation → persistance dans le lot.

### 4.5 Fiche bien
- Consultation + édition des champs/pièces (groupés : identité, surface/catégorie, équipements, coefficients).
- Indicateur de complétude.
- **Dégrèvement estimé** mis en valeur (« l'euro d'abord ») ; recalculé à chaque mise à jour des pièces.

---

## 5. Dictionnaire des champs canoniques & synonymes

Source de vérité : la matrice de test (`Matrice (1).xlsx`, ~60 biens, 25 colonnes, prévue 1000 lignes). Les en-têtes sources **ne correspondent pas** aux champs internes — c'est le défi de mapping.

| Champ canonique | Type | Obligatoire | Exemples de synonymes sources |
|---|---|---|---|
| `invariant_cadastral` | string | oui | « Invariant », « Code immeuble », « Ref lot » |
| `rue` | string | oui | « Rue », « Adresse » |
| `depcom` | string | non | « DEPCOM » |
| `ville` | string | oui | « Ville » |
| `nom_immeuble` | string | non | « Nom de l'immeuble » |
| `nature` | string | oui | « Nature du bien » |
| `ponderation_nature` | number | non | « Pondération en fonction de la nature » |
| `etage` | string | non | « Étage » |
| `categorie` | string | oui | « Catégorie » |
| `surface_m2` | number | oui | « Surface (mur à mur) m² », « SHON », « surface » |
| `coeff_entretien` | number? | non | « Coefficient d'entretien » |
| `coeff_situation_particuliere` | number? | non | « Coefficient de situation particulière » |
| `coeff_situation_generale` | number? | non | « Coefficient de situation générale » |
| `ascenseur` | bool | non | « Ascenseur (Oui/Non) » |
| `eau_courante` | bool | non | « Eau courante (1/0) » |
| `gaz` | bool | non | « Raccordement au gaz (1/0) » |
| `electricite` | bool | non | « Raccordement à l'électricité (1/0) » |
| `nb_baignoires` … `nb_vide_ordures` | int ≥0 | non | « Nombre de … » |
| `egout` | bool | non | « Raccordement à l'égout (1/0) » |

**Conventions à absorber sans crash** (cas limites de validation) :
- Booléens hétérogènes : `1/0` **et** `Oui/Non` → normalisés vers `boolean`.
- Compteurs `Nombre de …` : entiers ≥ 0 ; vide → 0.
- `ponderation_nature` : `1` (logement) · `0,6` (parking) · `0,2` (cave) ; décimale française (virgule).
- Coefficients potentiellement vides → `null` (pas une erreur).
- Nombres au format français (virgule décimale) → parser tolérant.

---

## 6. Module de mapping (`lib/import/mapping.ts`)

Fonction pure : `autoMap(headers: string[]): MappingProposal[]`.

1. **Normalisation** : minuscules, suppression accents/ponctuation/unités (`m²`, `(1/0)`…), trim, espaces collapsés.
2. **Table de synonymes statique** (≥ 8 entrées métier) : ex. `shon → surface_m2`, `code immeuble → invariant_cadastral`, `ref lot → invariant_cadastral`.
3. **Distance de Levenshtein normalisée** entre en-tête normalisé et champ/synonyme candidat ; **seuil documenté** (ex. ≥ 0.8 = auto, 0.5–0.8 = suggestion à confirmer, < 0.5 = non mappé).
4. Sortie : `{ sourceColumn, suggestedField, confidence, status: auto|suggest|unmapped }`.

**Persistance (bonus 2A)** : après confirmation, le mapping est mémorisé par `source_signature` (hash trié des en-têtes) dans `column_mappings` et **pré-proposé** au prochain import du même format.

---

## 7. Module de validation (`lib/import/validation.ts`)

Fonction pure : `validateRows(rows, mapping) → { valid: BienInput[], errors: RowError[] }`.

- Schéma **Zod** par champ canonique (types + coercition tolérante : virgule décimale, `Oui/Non`/`1/0` → bool, vide → null/0).
- Vérifie la présence des **colonnes obligatoires** mappées.
- Chaque ligne invalide produit un `RowError { rowIndex, column, code, message }` — **jamais d'exception non gérée** (le serveur ne crashe pas).
- Codes d'erreur structurés (bonus 2A) exposés en `422` côté API ; `400` parsing, `500` serveur.

---

## 8. Module de simulation du dégrèvement (`lib/degrevement/compute.ts`)

Fonction pure : `computeDegrevement(bien, bareme): EstimationResult`.

Méthode (valeur locative cadastrale des locaux d'habitation) :
1. **Surface pondérée** = `surface_m2 × ponderation_nature` + équivalences superficielles des éléments de confort (équipements : eau, gaz, électricité, sanitaires, ascenseur…), selon le barème.
2. **VLC recalculée** = `surface_pondérée × tarif(categorie) × coeff_entretien × coeff_situation_particuliere × coeff_situation_generale`.
3. **Dégrèvement estimé** = `(VLC_référence − VLC_recalculée) × taux_imposition`, borné à ≥ 0.

> **Barème paramétrable** : tarifs par catégorie, équivalences superficielles des équipements et taux d'imposition vivent dans une config `lib/degrevement/bareme.ts` (ou table `bareme`). Les valeurs légales exactes sont fournies par le métier (« formule connue ») — le module ne les invente pas ; il les consomme. Cela permet d'ajuster sans toucher au code de calcul.

Recalcul déclenché à chaque mise à jour des pièces d'un bien ; résultat persisté dans `biens.degrevement_estime` + `estimation_params` (traçabilité).

---

## 9. Découpage en modules (isolation)

| Module | Rôle | Dépend de |
|---|---|---|
| `lib/import/parse.ts` | buffer CSV/Excel → `{ headers, rows }` | `xlsx`, `csv-parse` |
| `lib/import/mapping.ts` | en-têtes → champs canoniques | dictionnaire + synonymes (purs) |
| `lib/import/validation.ts` | lignes → biens valides + erreurs | Zod, dictionnaire |
| `lib/degrevement/compute.ts` | bien → estimation | barème (pur) |
| `app/(actions)` | Server Actions / Route Handlers | modules `lib/` + Supabase |
| `components/` | UI (table, wizard, forms) | shadcn/ui |

Chaque module `lib/` est testable en isolation, sans réseau ni base.

---

## 10. Sécurité & conformité
- RLS sur toutes les tables (isolation inter-organisations) — testée dès la mise en place du schéma.
- `.env*` gitignored ; aucune clé service-role exposée côté client (uniquement clé anon + RLS, service-role réservée serveur).
- Données personnelles (adresses, biens) → RGPD : accès restreint par org, pas de log de données sensibles.
- Validation/sanitization de tous les inputs (Zod), uploads limités en taille/type.

---

## 11. Tests (cibles)
- **Mapping** (≥ 5 cas, brief) : correspondance exacte, synonyme métier, colonne inconnue, obligatoire manquante, type incohérent.
- **Validation** : `1/0` vs `Oui/Non`, coefficient vide, décimale virgule, ligne vide.
- **Dégrèvement** : cas nominal logement, parking (pondération 0,6), équipements, VLC référence absente.
- Seed de démo basé sur la matrice fournie.

---

## 12. Risques & vigilance
1. **Le mapping est le pivot** (note Dev + cohérence UX↔API) — à soigner en priorité.
2. **Robustesse sans crash** — la validation absorbe les conventions hétérogènes de la matrice.
3. **Échelle** — rester lisible/performant à 1000 lignes (pagination, index DB, parsing en flux).
4. **Verrou « Générer mon rapport »** — matérialisé côté UX (désactivé) et côté logique (complétude).
5. **Barème légal** — exactitude juridique : valeurs fournies par le métier, isolées et versionnées.
6. **RLS multi-tenant** — fuite de données si mal posée : tester tôt.

---

## 13. Hors-MVP / suites
- Page 2 « Gestion des anomalies » (qualification, priorisation €, actions en lot).
- Rapprochement ERP ↔ fiscal réel (3 catégories : appariés / ERP seul / fisc seul).
- Traitement asynchrone des gros fichiers + polling, pagination API (bonus 2B).
- Génération PDF du rapport, paiement, suivi de réclamation.
