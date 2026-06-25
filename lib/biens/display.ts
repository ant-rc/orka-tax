import type { Bien, BienType, BienStatut } from '@/lib/domain/property';
import type { Database } from '@/lib/supabase/types';

/** Colonnes de `biens` nécessaires à l'affichage en liste / fiche. */
export type BienDisplayRow = Pick<
  Database['public']['Tables']['biens']['Row'],
  'id' | 'lot_id' | 'invariant_cadastral' | 'nature' | 'surface_m2' | 'etage' | 'status' | 'statut'
>;

export const BIEN_DISPLAY_COLUMNS = 'id, lot_id, invariant_cadastral, nature, surface_m2, etage, status, statut';

/** Déduit le type d'affichage à partir de la nature libre du bien. */
export function natureToType(nature: string | null): BienType {
  const n = (nature ?? '').toLowerCase();
  if (n.includes('parking') || n.includes('garage') || n.includes('stationnement')) return 'Parking';
  if (n.includes('cave')) return 'Cave';
  return 'Appartement';
}

const STATUS_TO_STATUT: Record<Database['public']['Enums']['bien_status'], BienStatut> = {
  draft: 'importe',
  validated: 'resolu',
  archived: 'importe',
};

/** Mappe une ligne `biens` de Supabase vers le modèle d'affichage. */
export function dbBienToBien(row: BienDisplayRow): Bien {
  return {
    id: row.id,
    lotId: row.lot_id,
    type: natureToType(row.nature),
    reference: row.invariant_cadastral ?? '',
    surface: row.surface_m2 != null ? `${row.surface_m2}m2` : '—',
    etage: row.etage ?? '0',
    degrevement: 'en_attente',
    hasAnomaly: false,
    statut: (row.statut as BienStatut | null) ?? STATUS_TO_STATUT[row.status] ?? 'importe',
  };
}
