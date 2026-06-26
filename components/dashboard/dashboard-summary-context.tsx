'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useFiscalProfile } from '@/components/dashboard/fiscal-profile-context';
import { fetchDashboardSummary, type DashboardSummary } from '@/lib/supabase/queries';

interface DashboardSummaryContextValue {
  summary: DashboardSummary | null;
  refresh: () => void;
}

const DashboardSummaryContext = createContext<DashboardSummaryContextValue | null>(null);

/** Fetches the dashboard aggregates once per profile and shares them with the
 *  declaration / estimation cards and the lots panel (one round-trip instead of
 *  three separate queries). `refresh()` re-fetches after a report or reset. */
export function DashboardSummaryProvider({ children }: { children: React.ReactNode }) {
  const { activeProfileId } = useFiscalProfile();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!activeProfileId) { setSummary(null); return; }
    let active = true;
    setSummary(null);
    fetchDashboardSummary(activeProfileId)
      .then((s) => { if (active) setSummary(s); })
      .catch(() => { if (active) setSummary({ lots: 0, biens: 0, untreated: 0, degrevement: 0 }); });
    return () => { active = false; };
  }, [activeProfileId, refreshKey]);

  return (
    <DashboardSummaryContext.Provider value={{ summary, refresh }}>
      {children}
    </DashboardSummaryContext.Provider>
  );
}

export function useDashboardSummary(): DashboardSummaryContextValue {
  return useContext(DashboardSummaryContext) ?? { summary: null, refresh: () => {} };
}
