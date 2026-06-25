'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { FiscalProfile } from '@/lib/domain/property';
import { fetchFiscalProfiles } from '@/lib/supabase/queries';
import {
  getActiveOrgId,
  getActiveFiscalProfileId,
  setActiveFiscalProfileId,
} from '@/lib/supabase/client';
import { resolveActiveProfileId } from '@/lib/fiscal/active-profile';

interface FiscalProfileContextValue {
  profiles: FiscalProfile[];
  activeProfileId: string | null;
  activeProfile: FiscalProfile | null;
  setActiveProfile: (id: string) => void;
  loading: boolean;
}

const FiscalProfileContext = createContext<FiscalProfileContextValue | null>(null);

export function FiscalProfileProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [profiles, setProfiles] = useState<FiscalProfile[]>([]);
  const [activeProfileId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchFiscalProfiles(getActiveOrgId())
      .then((rows) => {
        if (!active) return;
        setProfiles(rows);
        const resolved = resolveActiveProfileId(getActiveFiscalProfileId(), rows.map((p) => p.id));
        setActiveId(resolved);
        if (resolved) setActiveFiscalProfileId(resolved);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const setActiveProfile = useCallback((id: string) => {
    setActiveFiscalProfileId(id);
    setActiveId(id);
  }, []);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  const value = useMemo(
    () => ({ profiles, activeProfileId, activeProfile, setActiveProfile, loading }),
    [profiles, activeProfileId, activeProfile, setActiveProfile, loading],
  );

  return <FiscalProfileContext.Provider value={value}>{children}</FiscalProfileContext.Provider>;
}

export function useFiscalProfile(): FiscalProfileContextValue {
  const ctx = useContext(FiscalProfileContext);
  if (!ctx) {
    return { profiles: [], activeProfileId: null, activeProfile: null, setActiveProfile: () => {}, loading: false };
  }
  return ctx;
}
