import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import {
  type Lot,
  type Bien,
  type BienType,
  type BienStatut,
  type FiscalProfile,
  BIEN_TYPES,
} from '@/lib/domain/property';
import { simulateStatut } from '@/lib/tunnel/advance';

type LotRow = Database['public']['Tables']['lots']['Row'];
type BienRow = Database['public']['Tables']['biens']['Row'];
type FiscalProfileRow = Database['public']['Tables']['fiscal_profiles']['Row'];
type BienSelectRow = Pick<BienRow, 'id' | 'lot_id' | 'nature' | 'invariant_cadastral' | 'surface_m2' | 'etage' | 'statut' | 'has_anomaly'>;

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
    degrevement: 'en_attente',
    statut: (row.statut ?? 'importe') as BienStatut,
    hasAnomaly: row.has_anomaly ?? false,
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

const BIEN_SELECT = 'id, lot_id, nature, invariant_cadastral, surface_m2, etage, statut, has_anomaly';

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

const FULL_BIEN_SELECT = [
  'id', 'lot_id', 'invariant_cadastral', 'nature', 'rue', 'depcom', 'ville',
  'nom_immeuble', 'ponderation_nature', 'etage', 'categorie', 'surface_m2',
  'coeff_entretien', 'coeff_situation_particuliere', 'coeff_situation_generale',
  'ascenseur', 'eau_courante', 'gaz', 'electricite',
  'nb_baignoires', 'nb_douches', 'nb_bidets', 'nb_wc', 'nb_eviers', 'egout',
  'nb_pieces', 'nb_vide_ordures',
].join(', ');

export async function fetchFullBiensByProfile(
  fiscalProfileId: string,
): Promise<Record<string, unknown>[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('biens')
    .select(`${FULL_BIEN_SELECT}, lots!inner(fiscal_profile_id)`)
    .eq('lots.fiscal_profile_id', fiscalProfileId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as unknown as Record<string, unknown>[];
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
