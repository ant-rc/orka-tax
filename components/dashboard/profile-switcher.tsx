'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useFiscalProfile } from '@/components/dashboard/fiscal-profile-context';

export default function ProfileSwitcher() {
  const { profiles, activeProfile, setActiveProfile, loading } = useFiscalProfile();
  const [open, setOpen] = useState(false);

  if (loading || profiles.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-[225px] items-center justify-between gap-2 rounded-lg border border-ui-border-accented py-2 pl-1.5 pr-2 transition-colors ${open ? 'bg-vert-50' : 'bg-white'}`}
        aria-label="Changer de profil fiscal"
        aria-expanded={open}
        title={activeProfile ? `${activeProfile.label} · ${activeProfile.commune}` : undefined}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <img src="/assets/lots.webp" alt="" className="size-7 shrink-0 rounded-lg" />
          <span className="truncate text-xs font-medium text-vert-900">
            {activeProfile ? `n°${activeProfile.numeroFiscal}` : 'Profil fiscal'}
          </span>
        </span>
        {open
          ? <ChevronUp size={20} className="shrink-0 text-vert-900" />
          : <ChevronDown size={20} className="shrink-0 text-vert-900" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full z-20 mt-1.5 flex w-[225px] flex-col gap-[7px] rounded-xl bg-white p-2 shadow-md">
            {profiles.map((p) => {
              const isActive = p.id === activeProfile?.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { setActiveProfile(p.id); setOpen(false); }}
                  className={`flex items-center justify-between gap-2 rounded-lg p-2 transition-colors ${isActive ? 'border border-vert-500' : 'border border-transparent hover:bg-ui-bg-elevated'}`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <img src="/assets/lots.webp" alt="" className="size-7 shrink-0 rounded-lg" />
                    <span className="truncate text-xs font-medium text-vert-900">n°{p.numeroFiscal}</span>
                  </span>
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full ${isActive ? 'bg-vert-900' : 'border border-ui-border-accented'}`}>
                    {isActive && <Check size={12} className="text-white" />}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
