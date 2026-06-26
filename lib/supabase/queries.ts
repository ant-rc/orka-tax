import { createClient } from '@/lib/supabase/client';
import type { Database, Json } from '@/lib/supabase/types';
import {
  type Lot,
  type Bien,
  type BienType,
  type BienStatut,
  type FiscalProfile,
  BIEN_TYPES,
} from '@/lib/domain/property';
import { natureToType } from '@/lib/biens/display';
import { simulateStatut } from '@/lib/tunnel/advance';
import { evaluateBien } from '@/lib/comparison/evaluate';
import { type FieldAnomaly } from '@/lib/comparison/compare';
import type { ComparableValues } from '@/lib/domain/comparable';

type LotRow = Database['public']['Tables']['lots']['Row'];
type BienRow = Database['public']['Tables']['biens']['Row'];
type FiscalProfileRow = Database['public']['Tables']['fiscal_profiles']['Row'];
type BienSelectRow = Pick<BienRow, 'id' | 'lot_id' | 'nature' | 'invariant_cadastral' | 'surface_m2' | 'etage' | 'statut' | 'has_anomaly' | 'anomalies' | 'degrevement_estime'>;

// ---------------------------------------------------------------------------
// Mappers — Supabase rows → domain models
// ---------------------------------------------------------------------------

function mapLot(row: Pick<LotRow, 'id' | 'name' | 'address' | 'city'>): Lot {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    city: row.city ?? '',
    status: 'en_attente',
  };
}

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

/** Parse a surface input like "28m2" into a numeric value (or null). */
function parseSurface(value: string): number | null {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
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
// Lots
// ---------------------------------------------------------------------------

export async function fetchLots(fiscalProfileId: string): Promise<Lot[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lots')
    .select('id, name, address, city')
    .eq('fiscal_profile_id', fiscalProfileId)
    .order('name');
  if (error) throw error;
  return (data ?? []).map(mapLot);
}

export async function createLot(
  orgId: string,
  fiscalProfileId: string,
  input: { name: string; address: string },
): Promise<Lot> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lots')
    .insert({
      org_id: orgId,
      fiscal_profile_id: fiscalProfileId,
      name: input.name,
      address: input.address,
      city: '',
    })
    .select('id, name, address, city')
    .single();
  if (error) throw error;
  return mapLot(data);
}

// ---------------------------------------------------------------------------
// Biens
// ---------------------------------------------------------------------------

const BIEN_SELECT = 'id, lot_id, nature, invariant_cadastral, surface_m2, etage, statut, has_anomaly, anomalies, degrevement_estime';

export async function fetchBiens(lotId: string): Promise<Bien[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('biens')
    .select(BIEN_SELECT)
    .eq('lot_id', lotId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(mapBien);
}

export async function fetchBienById(bienId: string): Promise<Bien | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('biens')
    .select(BIEN_SELECT)
    .eq('id', bienId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapBien(data) : null;
}

export async function fetchBiensByProfile(fiscalProfileId: string): Promise<Bien[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('biens')
    .select(`${BIEN_SELECT}, lots!inner(fiscal_profile_id)`)
    .eq('lots.fiscal_profile_id', fiscalProfileId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((r) => mapBien(r));
}

export async function createBien(
  orgId: string,
  lotId: string,
  input: { type: BienType; reference: string; surface: string; etage: string },
): Promise<Bien> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('biens')
    .insert({
      org_id: orgId,
      lot_id: lotId,
      nature: input.type,
      invariant_cadastral: input.reference,
      surface_m2: parseSurface(input.surface),
      etage: input.etage,
      statut: 'importe',
    })
    .select(BIEN_SELECT)
    .single();
  if (error) throw error;
  return mapBien(data);
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

export async function fetchAnomalyBiensByProfile(fiscalProfileId: string): Promise<Bien[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('biens')
    .select(`${BIEN_SELECT}, lots!inner(fiscal_profile_id)`)
    .eq('lots.fiscal_profile_id', fiscalProfileId)
    .in('statut', ['anomalie', 'reclamation', 'remboursement'])
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((r) => mapBien(r));
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

/** Generate the réclamation for every lot of the profile that still has biens in
 *  anomalie. Returns the aggregated total and the number of lots concerned. */
export async function createReclamationForProfile(
  fiscalProfileId: string,
): Promise<{ total: number; lots: number }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('biens')
    .select('lot_id, lots!inner(fiscal_profile_id)')
    .eq('lots.fiscal_profile_id', fiscalProfileId)
    .eq('statut', 'anomalie');
  if (error) throw error;
  const lotIds = [...new Set((data ?? []).map((b) => b.lot_id))];
  let total = 0;
  for (const lotId of lotIds) {
    const { total: t } = await createReclamation(lotId);
    total += t;
  }
  return { total: Math.round(total * 100) / 100, lots: lotIds.length };
}

export interface ReclamationRecap {
  total: number;
  byLot: { lotId: string; lotName: string; total: number }[];
  byType: { type: BienType; count: number; total: number }[];
}

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

  const lotMap = new Map<string, { lotName: string; total: number }>();
  const typeMap = new Map<BienType, { count: number; total: number }>();
  let total = 0;

  for (const row of data ?? []) {
    const amount = Number(row.degrevement_estime ?? 0);
    total += amount;
    const lotName = (row.lots as unknown as { name: string }).name;
    const lot = lotMap.get(row.lot_id) ?? { lotName, total: 0 };
    lot.total += amount;
    lotMap.set(row.lot_id, lot);
    const type = natureToType(row.nature);
    const t = typeMap.get(type) ?? { count: 0, total: 0 };
    t.count += 1;
    t.total += amount;
    typeMap.set(type, t);
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    total: round(total),
    byLot: [...lotMap.entries()].map(([lotId, v]) => ({ lotId, lotName: v.lotName, total: round(v.total) })),
    byType: [...typeMap.entries()].map(([type, v]) => ({ type, count: v.count, total: round(v.total) })),
  };
}
