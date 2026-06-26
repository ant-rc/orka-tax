import type { BienType } from '@/lib/domain/property';

/** One reclaimed bien feeding the recap. */
export interface ReclamationRecapRow {
  lotId: string;
  lotName: string;
  type: BienType;
  amount: number;
}

export interface ReclamationRecap {
  total: number;
  byLot: { lotId: string; lotName: string; total: number }[];
  byType: { type: BienType; count: number; total: number }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Aggregate reclaimed biens into per-lot, per-type and overall dégrèvement totals. */
export function aggregateReclamationRecap(rows: ReclamationRecapRow[]): ReclamationRecap {
  const lotMap = new Map<string, { lotName: string; total: number }>();
  const typeMap = new Map<BienType, { count: number; total: number }>();
  let total = 0;

  for (const row of rows) {
    total += row.amount;
    const lot = lotMap.get(row.lotId) ?? { lotName: row.lotName, total: 0 };
    lot.total += row.amount;
    lotMap.set(row.lotId, lot);
    const t = typeMap.get(row.type) ?? { count: 0, total: 0 };
    t.count += 1;
    t.total += row.amount;
    typeMap.set(row.type, t);
  }

  return {
    total: round2(total),
    byLot: [...lotMap.entries()].map(([lotId, v]) => ({ lotId, lotName: v.lotName, total: round2(v.total) })),
    byType: [...typeMap.entries()].map(([type, v]) => ({ type, count: v.count, total: round2(v.total) })),
  };
}
