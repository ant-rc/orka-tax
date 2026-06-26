import { createClient } from '@/lib/supabase/client';
import type { Database, Json } from '@/lib/supabase/types';
import {
  type Bien,
  type BienType,
  type BienStatut,
  type FiscalProfile,
  BIEN_TYPES,
} from '@/lib/domain/property';
import { natureToType } from '@/lib/biens/display';
import { simulateStatut } from '@/lib/tunnel/advance';
import { evaluateBien } from '@/lib/comparison/evaluate';
import { type FieldAnomaly, type ComparisonRow, buildComparisonRows } from '@/lib/comparison/compare';
import { aggregateReclamationRecap, type ReclamationRecap } from '@/lib/reclamation/recap';
import { type ComparableValues } from '@/lib/domain/comparable';
import { computeVlc, type VlcInput } from '@/lib/degrevement/compute';
import { DEFAULT_BAREME } from '@/lib/degrevement/bareme';
import { resolveTaux } from '@/lib/tax/taux';

type BienRow = Database['public']['Tables']['biens']['Row'];
type FiscalProfileRow = Database['public']['Tables']['fiscal_profiles']['Row'];
type BienSelectRow = Pick<BienRow, 'id' | 'lot_id' | 'nature' | 'invariant_cadastral' | 'surface_m2' | 'etage' | 'statut' | 'has_anomaly' | 'anomalies' | 'degrevement_estime'>;

// ---------------------------------------------------------------------------
// Mappers — Supabase rows → domain models
// ---------------------------------------------------------------------------

function toBienType(nature: string | null): BienType {
  return BIEN_TYPES.includes(nature as BienType) ? (nature as BienType) : 'Appartement';
}

function mapBien(row: BienSelectRow): Bien {
  return {
    id: row.id,
    lotId: row.lot_id,
    type: toBienType(row.nature),
    reference: row.invariant_cadastral ?? '',
    surface: row.surface_m2 != null ? `${row.surface_m2}m2` : '',
    etage: row.etage ?? '',
    statut: (row.statut ?? 'importe') as BienStatut,
    hasAnomaly: row.has_anomaly ?? false,
    anomalies: (row.anomalies as unknown as FieldAnomaly[]) ?? [],
    degrevement: Number(row.degrevement_estime ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Fiscal Profiles
// ---------------------------------------------------------------------------

function mapFiscalProfile(
  row: Pick<FiscalProfileRow, 'id' | 'numero_fiscal' | 'label' | 'depcom' | 'commune'>,
): FiscalProfile {
  return {
    id: row.id,
    numeroFiscal: row.numero_fiscal,
    label: row.label,
    depcom: row.depcom ?? '',
    commune: row.commune ?? '',
  };
}

export async function fetchFiscalProfiles(orgId: string): Promise<FiscalProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('fiscal_profiles')
    .select('id, numero_fiscal, label, depcom, commune')
    .eq('org_id', orgId)
    .order('label');
  if (error) throw error;
  return (data ?? []).map(mapFiscalProfile);
}

// ---------------------------------------------------------------------------
// Biens
// ---------------------------------------------------------------------------

const BIEN_SELECT = 'id, lot_id, nature, invariant_cadastral, surface_m2, etage, statut, has_anomaly, anomalies, degrevement_estime';

export interface BienComparison {
  id: string;
  type: BienType;
  reference: string;
  surface: string;
  etage: string;
  address: string;
  rows: ComparisonRow[];
  taxePayee: number;
  taxeAttendue: number;
  degrevement: number;
}

/** Full FISC-vs-working comparison for a single bien, plus the estimated tax
 *  impact. Powers the "Comparaison de vos données" screen. */
export async function fetchBienComparison(bienId: string): Promise<BienComparison | null> {
  const supabase = createClient();
  const { data: bien, error } = await supabase
    .from('biens')
    .select('id, nature, invariant_cadastral, surface_m2, etage, rue, depcom, categorie, ponderation_nature, coeff_entretien, coeff_situation_particuliere, coeff_situation_generale, nb_pieces, nb_wc, nb_baignoires, nb_douches, nb_bidets, nb_eviers, ascenseur, eau_courante, gaz, electricite')
    .eq('id', bienId)
    .maybeSingle();
  if (error) throw error;
  if (!bien) return null;

  const { data: fiscRow, error: fiscErr } = await supabase
    .from('biens_fisc')
    .select('surface_m2, nb_pieces, nb_wc, nb_baignoires, nb_douches, nb_bidets, nb_eviers, ascenseur, eau_courante, gaz, electricite')
    .eq('bien_id', bienId)
    .maybeSingle();
  if (fiscErr) throw fiscErr;

  const row = bien as Record<string, unknown>;
  const working = pickComparable(row);
  const fisc = fiscRow ? pickComparable(fiscRow as Record<string, unknown>) : working;
  const rows = buildComparisonRows(working, fisc);

  const base = {
    ponderation_nature: Number(row.ponderation_nature ?? 1),
    categorie: String(row.categorie ?? ''),
    coeff_entretien: row.coeff_entretien as number | null,
    coeff_situation_particuliere: row.coeff_situation_particuliere as number | null,
    coeff_situation_generale: row.coeff_situation_generale as number | null,
  };
  const toVlc = (c: ComparableValues): VlcInput => ({ ...c, ...base });
  const taux = resolveTaux((row.depcom as string | null) ?? null, (row.etage as string | null) ?? null);
  const round = (n: number) => Math.round(n * 100) / 100;
  const taxePayee = round(computeVlc(toVlc(fisc), DEFAULT_BAREME) * taux);
  const taxeAttendue = round(computeVlc(toVlc(working), DEFAULT_BAREME) * taux);

  const surfaceM2 = row.surface_m2 as number | null;
  return {
    id: String(row.id),
    type: natureToType(row.nature as string | null),
    reference: (row.invariant_cadastral as string | null) ?? '',
    surface: surfaceM2 != null ? `${surfaceM2}m2` : '—',
    etage: (row.etage as string | null) ?? '0',
    address: (row.rue as string | null) ?? '',
    rows,
    taxePayee,
    taxeAttendue,
    degrevement: round(taxePayee - taxeAttendue),
  };
}

export async function deleteBien(bienId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('biens').delete().eq('id', bienId);
  if (error) throw error;
}

export async function deleteLot(lotId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('lots').delete().eq('id', lotId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Declaration counts
// ---------------------------------------------------------------------------

export async function fetchDeclarationCounts(
  fiscalProfileId: string,
): Promise<{ lots: number; biens: number }> {
  const supabase = createClient();
  const [lotsRes, biensRes] = await Promise.all([
    supabase.from('lots').select('*', { count: 'exact', head: true })
      .eq('fiscal_profile_id', fiscalProfileId),
    supabase.from('biens').select('lot_id, lots!inner(fiscal_profile_id)', { count: 'exact', head: true })
      .eq('lots.fiscal_profile_id', fiscalProfileId),
  ]);
  if (lotsRes.error) throw lotsRes.error;
  if (biensRes.error) throw biensRes.error;
  return { lots: lotsRes.count ?? 0, biens: biensRes.count ?? 0 };
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export async function simulateBiens(bienIds: string[]): Promise<void> {
  if (bienIds.length === 0) return;
  const supabase = createClient();

  const { data, error: selectError } = await supabase
    .from('biens')
    .select('id, has_anomaly')
    .in('id', bienIds);
  if (selectError) throw selectError;

  const anomalieIds: string[] = [];
  const resoluIds: string[] = [];
  for (const row of data ?? []) {
    const statut = simulateStatut(row.has_anomaly ?? false);
    if (statut === 'anomalie') {
      anomalieIds.push(row.id);
    } else {
      resoluIds.push(row.id);
    }
  }

  if (anomalieIds.length > 0) {
    const { error } = await supabase
      .from('biens')
      .update({ statut: 'anomalie' })
      .in('id', anomalieIds);
    if (error) throw error;
  }

  if (resoluIds.length > 0) {
    const { error } = await supabase
      .from('biens')
      .update({ statut: 'resolu' })
      .in('id', resoluIds);
    if (error) throw error;
  }
}

/** Total estimated dégrèvement across all biens of a profile (signed gain/loss). */
export async function fetchProfileDegrevement(fiscalProfileId: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('biens')
    .select('degrevement_estime, lots!inner(fiscal_profile_id)')
    .eq('lots.fiscal_profile_id', fiscalProfileId);
  if (error) throw error;
  const total = (data ?? []).reduce((s, b) => s + Number(b.degrevement_estime ?? 0), 0);
  return Math.round(total * 100) / 100;
}

/** Tunnel progress for a profile: total biens and how many are still untreated
 *  ("importe"). Gates "Générer mon rapport" on the dashboard. */
export async function fetchTunnelProgress(
  fiscalProfileId: string,
): Promise<{ total: number; untreated: number }> {
  const supabase = createClient();
  const [totalRes, untreatedRes] = await Promise.all([
    supabase.from('biens').select('id, lots!inner(fiscal_profile_id)', { count: 'exact', head: true })
      .eq('lots.fiscal_profile_id', fiscalProfileId),
    supabase.from('biens').select('id, lots!inner(fiscal_profile_id)', { count: 'exact', head: true })
      .eq('lots.fiscal_profile_id', fiscalProfileId)
      .eq('statut', 'importe'),
  ]);
  if (totalRes.error) throw totalRes.error;
  if (untreatedRes.error) throw untreatedRes.error;
  return { total: totalRes.count ?? 0, untreated: untreatedRes.count ?? 0 };
}

/** Demo: reset every bien of the profile to its FISC reference + "importe", and
 *  clear its réclamations (replays the demo from scratch). */
export async function resetProfileToFisc(fiscalProfileId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('reset_profile_to_fisc', { p_profile: fiscalProfileId });
  if (error) throw error;
}

export async function fetchBienIdsByLots(lotIds: string[]): Promise<string[]> {
  if (lotIds.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('biens')
    .select('id')
    .in('lot_id', lotIds);
  if (error) throw error;
  return (data ?? []).map((r) => r.id);
}

export interface AnomalyBien extends Bien {
  lotName: string;
}

/** Biens still flagged as `anomalie` for a profile (reclaimed ones are excluded
 *  so they leave the screen once their réclamation is generated), with lot name. */
export async function fetchAnomalyBiensByProfile(fiscalProfileId: string): Promise<AnomalyBien[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('biens')
    .select(`${BIEN_SELECT}, lots!inner(name, fiscal_profile_id)`)
    .eq('lots.fiscal_profile_id', fiscalProfileId)
    .eq('statut', 'anomalie')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...mapBien(r),
    lotName: (r.lots as unknown as { name: string }).name,
  }));
}

// ---------------------------------------------------------------------------
// Evaluation / recompute
// ---------------------------------------------------------------------------

const COMPARABLE_KEYS = [
  'surface_m2', 'nb_pieces', 'nb_wc', 'nb_baignoires', 'nb_douches',
  'nb_bidets', 'nb_eviers', 'ascenseur', 'eau_courante', 'gaz', 'electricite',
] as const;

function pickComparable(row: Record<string, unknown>): ComparableValues {
  const out = {} as Record<string, unknown>;
  for (const k of COMPARABLE_KEYS) out[k] = row[k] ?? null;
  return out as unknown as ComparableValues;
}

export async function recomputeBiens(bienIds: string[]): Promise<{ anomalies: number }> {
  if (bienIds.length === 0) return { anomalies: 0 };
  const supabase = createClient();
  const [{ data, error }, { data: fiscData, error: fiscError }] = await Promise.all([
    supabase
      .from('biens')
      .select('id, ponderation_nature, categorie, coeff_entretien, coeff_situation_particuliere, coeff_situation_generale, depcom, etage, surface_m2, nb_pieces, nb_wc, nb_baignoires, nb_douches, nb_bidets, nb_eviers, ascenseur, eau_courante, gaz, electricite')
      .in('id', bienIds),
    supabase
      .from('biens_fisc')
      .select('bien_id, surface_m2, nb_pieces, nb_wc, nb_baignoires, nb_douches, nb_bidets, nb_eviers, ascenseur, eau_courante, gaz, electricite')
      .in('bien_id', bienIds),
  ]);
  if (error) throw error;
  if (fiscError) throw fiscError;
  const fiscById = new Map<string, ComparableValues>(
    (fiscData ?? []).map((r) => [r.bien_id, pickComparable(r as Record<string, unknown>)]),
  );
  const results = await Promise.all((data ?? []).map(async (row) => {
    const evalResult = evaluateBien({
      fisc: fiscById.get(row.id) ?? pickComparable(row),
      working: pickComparable(row),
      ponderation_nature: Number(row.ponderation_nature ?? 1),
      categorie: String(row.categorie ?? ''),
      coeff_entretien: row.coeff_entretien as number | null,
      coeff_situation_particuliere: row.coeff_situation_particuliere as number | null,
      coeff_situation_generale: row.coeff_situation_generale as number | null,
      depcom: (row.depcom as string | null) ?? null,
      etage: (row.etage as string | null) ?? null,
    });
    const isAnomaly = evalResult.anomalies.length > 0;
    const { error: upErr } = await supabase.from('biens').update({
      statut: evalResult.statut,
      has_anomaly: isAnomaly,
      anomalies: evalResult.anomalies as unknown as Json,
      degrevement_estime: evalResult.degrevement,
    }).eq('id', row.id);
    if (upErr) throw upErr;
    return isAnomaly;
  }));
  return { anomalies: results.filter(Boolean).length };
}

export async function bulkUpdateBiens(
  bienIds: string[],
  patch: Partial<ComparableValues>,
): Promise<{ anomalies: number }> {
  if (bienIds.length === 0) return { anomalies: 0 };
  const supabase = createClient();
  const { error } = await supabase.from('biens').update(patch).in('id', bienIds);
  if (error) throw error;
  return recomputeBiens(bienIds);
}

// ---------------------------------------------------------------------------
// Réclamation
// ---------------------------------------------------------------------------

export async function createReclamation(lotId: string): Promise<{ total: number }> {
  const supabase = createClient();
  const { data: lot, error: lotErr } = await supabase
    .from('lots').select('org_id, fiscal_profile_id').eq('id', lotId).single();
  if (lotErr) throw lotErr;
  const { data: biens, error: bErr } = await supabase
    .from('biens').select('degrevement_estime').eq('lot_id', lotId);
  if (bErr) throw bErr;
  const total = Math.round((biens ?? []).reduce((s, b) => s + Number(b.degrevement_estime ?? 0), 0) * 100) / 100;
  const { error: insErr } = await supabase.from('reclamations').insert({
    org_id: lot.org_id, fiscal_profile_id: lot.fiscal_profile_id, lot_id: lotId, total_degrevement: total,
  });
  if (insErr) throw insErr;
  const { error: upErr } = await supabase.from('biens')
    .update({ statut: 'reclamation' }).eq('lot_id', lotId).eq('statut', 'anomalie');
  if (upErr) throw upErr;
  return { total };
}

export type { ReclamationRecap } from '@/lib/reclamation/recap';

/** Recap of the réclamations carried for a profile: total dégrèvement grouped by
 *  lot, by bien type, and overall. Reads the biens already advanced to reclamation. */
export async function fetchReclamationRecap(fiscalProfileId: string): Promise<ReclamationRecap> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('biens')
    .select('lot_id, nature, degrevement_estime, lots!inner(name, fiscal_profile_id)')
    .eq('lots.fiscal_profile_id', fiscalProfileId)
    .in('statut', ['reclamation', 'remboursement']);
  if (error) throw error;

  return aggregateReclamationRecap((data ?? []).map((row) => ({
    lotId: row.lot_id,
    lotName: (row.lots as unknown as { name: string }).name,
    type: natureToType(row.nature),
    amount: Number(row.degrevement_estime ?? 0),
  })));
}
