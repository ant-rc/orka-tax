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

type LotRow = Database['public']['Tables']['lots']['Row'];
type BienRow = Database['public']['Tables']['biens']['Row'];
type FiscalProfileRow = Database['public']['Tables']['fiscal_profiles']['Row'];

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

function mapBien(
  row: Pick<BienRow, 'id' | 'nature' | 'invariant_cadastral' | 'surface_m2' | 'etage' | 'statut'>,
): Bien {
  return {
    id: row.id,
    type: toBienType(row.nature),
    reference: row.invariant_cadastral ?? '',
    surface: row.surface_m2 != null ? `${row.surface_m2}m2` : '',
    etage: row.etage ?? '',
    degrevement: 'en_attente',
    statut: (row.statut ?? 'importe') as BienStatut,
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

const BIEN_SELECT = 'id, nature, invariant_cadastral, surface_m2, etage, statut';

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
