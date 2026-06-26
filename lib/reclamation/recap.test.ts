import { describe, it, expect } from 'vitest';
import { aggregateReclamationRecap, type ReclamationRecapRow } from './recap';

const rows: ReclamationRecapRow[] = [
  { lotId: 'A', lotName: 'Lot A', type: 'Appartement', amount: 2.51 },
  { lotId: 'A', lotName: 'Lot A', type: 'Appartement', amount: 2.51 },
  { lotId: 'A', lotName: 'Lot A', type: 'Parking', amount: 4 },
  { lotId: 'B', lotName: 'Lot B', type: 'Cave', amount: 10 },
];

describe('aggregateReclamationRecap', () => {
  it('sums the overall total', () => {
    expect(aggregateReclamationRecap(rows).total).toBe(19.02);
  });

  it('groups by lot', () => {
    const { byLot } = aggregateReclamationRecap(rows);
    expect(byLot).toContainEqual({ lotId: 'A', lotName: 'Lot A', total: 9.02 });
    expect(byLot).toContainEqual({ lotId: 'B', lotName: 'Lot B', total: 10 });
  });

  it('groups by type with counts', () => {
    const { byType } = aggregateReclamationRecap(rows);
    expect(byType).toContainEqual({ type: 'Appartement', count: 2, total: 5.02 });
    expect(byType).toContainEqual({ type: 'Parking', count: 1, total: 4 });
    expect(byType).toContainEqual({ type: 'Cave', count: 1, total: 10 });
  });

  it('handles an empty input', () => {
    expect(aggregateReclamationRecap([])).toEqual({ total: 0, byLot: [], byType: [] });
  });

  it('keeps signed (negative) dégrèvements', () => {
    const res = aggregateReclamationRecap([
      { lotId: 'A', lotName: 'Lot A', type: 'Appartement', amount: -3 },
      { lotId: 'A', lotName: 'Lot A', type: 'Appartement', amount: 5 },
    ]);
    expect(res.total).toBe(2);
    expect(res.byType[0]).toEqual({ type: 'Appartement', count: 2, total: 2 });
  });
});
