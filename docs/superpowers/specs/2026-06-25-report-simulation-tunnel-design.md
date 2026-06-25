# Simulation « Générer mon rapport » + tunnel & anomalies — Design

**But :** Le bouton « Générer mon rapport » lance une simulation (loader animé), à l'issue de laquelle les biens sélectionnés avancent dans le tunnel de statut : ceux porteurs d'une discordance avec le FISC passent en `anomalie` (et apparaissent sur l'écran anomalies), les autres en `resolu`.

**Contexte :** Pas de pipeline FISC réel. La discordance est représentée par un flag `has_anomaly` semé sur un lot de biens existants (valeurs pièces volontairement modifiées). La progression du loader est une animation simulée (~3 s).

## Modèle de données

- Migration `0010` : `alter table public.biens add column if not exists has_anomaly boolean not null default false;`
- Seed (idempotent, valeurs absolues) : 12 biens du lot `94077-VOLTA` (`11111111-0000-0000-0000-000000940770`) reçoivent `has_anomaly = true` et des valeurs pièces modifiées (`nb_douches = 2`, `nb_baignoires = 1`, `nb_pieces = 4`) — la discordance à corriger. Le `statut` reste `importe` (rien de simulé).
- `Bien` (domaine) gagne `hasAnomaly: boolean` ; `BIEN_SELECT` inclut `has_anomaly` ; `mapBien` mappe `hasAnomaly: row.has_anomaly ?? false`.

## Logique tunnel (`lib/tunnel/advance.ts`, pure + Vitest)

- `TUNNEL_ORDER: BienStatut[] = ['importe','rapprochement','resolu','analyse','anomalie','reclamation','remboursement']`.
- `simulateStatut(hasAnomaly: boolean): BienStatut` → `hasAnomaly ? 'anomalie' : 'resolu'`.
- `nextStatut(s: BienStatut): BienStatut` → étape suivante dans `TUNNEL_ORDER`, plafonné au dernier (`remboursement`). (Pour avancement manuel ultérieur.)
- Tests : `simulateStatut(true)='anomalie'`, `simulateStatut(false)='resolu'` ; `nextStatut('importe')='rapprochement'`, `nextStatut('remboursement')='remboursement'`.

## Requêtes (`lib/supabase/queries.ts`)

- `simulateBiens(bienIds: string[]): Promise<void>` — lit `id, has_anomaly` des biens, calcule `simulateStatut`, fait deux updates groupés (`statut='anomalie'` / `statut='resolu'`) par liste d'ids. No-op si liste vide.
- `fetchBienIdsByLots(lotIds: string[]): Promise<string[]>` — ids des biens des lots sélectionnés (sélection de lots).
- `fetchAnomalyBiensByProfile(fiscalProfileId: string): Promise<Bien[]>` — biens du profil avec `statut in ('anomalie','reclamation','remboursement')` (jointure `lots!inner`). Utilisée par l'écran anomalies.

## Loader (`components/dashboard/report-loader.tsx`, présentationnel)

Fidèle à l'image : overlay `fixed inset-0 bg-black/40 z-50 flex items-center justify-center`, carte arrondie sombre (`bg-cyprus-950`), **anneau de progression circulaire SVG** (cercle de fond + arc `stroke-dashoffset` piloté par `progress`), pourcentage entier au centre (blanc), libellé « Veuillez patienter… ». Props `{ open: boolean; progress: number }` (0–100). Aucune logique.

## Câblage sélection (`components/dashboard/selection-context.tsx`)

Étendre la `SelectionProvider` (sans churn de rendu, via `ref`) :
- `registerGenerate(fn: (() => Promise<void>) | null): void` — le panneau actif enregistre son action de simulation (stockée dans un `ref`).
- `runGenerate(): Promise<void>` — exécute l'action enregistrée (ou no-op).
- `selectedCount` / `setSelectedCount` inchangés.

Chaque panneau enregistre, via `useEffect([handleGenerate])`, un `handleGenerate` (useCallback capturant la sélection courante) ; cleanup `registerGenerate(null)` au démontage.

## BottomBar (`components/dashboard/bottom-bar.tsx`)

- État `loaderOpen`, `progress`. Clic « Générer mon rapport » (actif si `selectedCount > 0`) → `setLoaderOpen(true)`, `progress=0`.
- Effet d'animation : tant que `loaderOpen` et `progress < 100`, incrémente `progress` (~+2 toutes les 60 ms → ~3 s). À `progress >= 100` (une seule fois) : `await runGenerate()`, `setLoaderOpen(false)`, toast « Rapport généré », `progress=0`.
- Rend `<ReportLoader open={loaderOpen} progress={progress} />`.

## Actions par panneau

- **biens-panel** : `handleGenerate` = `simulateBiens([...selected])` puis re-fetch des biens du lot + vide la sélection (`setSelected(new Set())`, `setSelectedCount(0)`). Les statuts mis à jour s'affichent.
- **lots-panel** : `handleGenerate` = `fetchBienIdsByLots([...selected])` → `simulateBiens(ids)` puis vide la sélection. (La carte « Votre déclaration » et l'écran anomalies refléteront les nouveaux statuts.)

## Écran anomalies

`anomalies-panel` charge via `fetchAnomalyBiensByProfile(activeProfileId)` (au lieu de tous les biens). Vide tant qu'aucune simulation n'a tourné, puis affiche les biens VOLTA discordants passés en `anomalie`. Reste réactif au switch de profil.

## Démo type

Profil **Villeneuve-le-Roi** → écran biens VOLTA → tout cocher → « Générer mon rapport » → loader 0→100 % → ~12 biens passent en `anomalie`, les autres en `resolu` → écran **anomalies** affiche les 12 biens discordants.

## Hors-scope

Comparaison FISC réelle, calcul de dégrèvement par anomalie, avancement réclamation→remboursement depuis l'UI, persistance du rapport.
