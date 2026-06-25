'use client';

import { useEffect, useState } from 'react';
import { Hash, Home, Building2 } from 'lucide-react';
import { createClient, getActiveOrgId } from '@/lib/supabase/client';

interface OrgSummary {
  name: string;
  companyId: string | null;
  lots: number;
  biens: number;
}

export default function DeclarationCard() {
  const [data, setData] = useState<OrgSummary | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const orgId = getActiveOrgId();
      const [orgRes, lotsRes, biensRes] = await Promise.all([
        supabase.from('organizations').select('name, company_id').eq('id', orgId).single(),
        supabase.from('lots').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('biens').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      ]);
      if (!active) return;
      setData({
        name: orgRes.data?.name ?? 'Mon entreprise',
        companyId: orgRes.data?.company_id ?? null,
        lots: lotsRes.count ?? 0,
        biens: biensRes.count ?? 0,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-white rounded-lg border border-ui-border p-5">
      <div className="flex items-center gap-3 mb-4">
        <img src="/assets/lots.webp" alt="" className="size-10" />
        <h2 className="text-lg font-semibold text-ui-text-highlighted">Votre déclarations</h2>
      </div>
      <div className="border-t border-ui-border pt-4 flex flex-col gap-3 text-sm text-ui-text-muted">
        <div className="flex items-center gap-3">
          <Building2 size={16} className="text-ui-text-muted shrink-0" />
          <span className="truncate" title={data?.name ?? undefined}>
            {data ? data.name : '…'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Hash size={16} className="text-ui-text-muted shrink-0" />
          <span>{data?.companyId ? `N° ${data.companyId}` : 'N° non renseigné'}</span>
        </div>
        <div className="flex items-center gap-3">
          <Home size={16} className="text-ui-text-muted shrink-0" />
          <span>{data ? `${data.lots} lots` : '… lots'}</span>
        </div>
        <div className="flex items-center gap-3">
          <Home size={16} className="text-ui-text-muted shrink-0" />
          <span>{data ? `${data.biens} biens` : '… biens'}</span>
        </div>
      </div>
    </div>
  );
}
