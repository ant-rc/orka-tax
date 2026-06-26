'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X, Hash, Ruler, Building2, MapPin, Info } from 'lucide-react';
import { fetchBienComparison, type BienComparison } from '@/lib/supabase/queries';
import { type ComparisonRow } from '@/lib/comparison/compare';
import { BIEN_TYPE_ICON } from '@/lib/domain/property';

const NUMERIC_FIELDS = new Set(['surface_m2', 'nb_pieces', 'nb_wc', 'nb_baignoires', 'nb_douches', 'nb_bidets', 'nb_eviers']);
const EQUIPMENT_FIELDS = new Set(['ascenseur', 'eau_courante', 'gaz', 'electricite']);

function formatValue(field: string, v: number | boolean | null): string {
  if (v === null) return '—';
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  return field === 'surface_m2' ? `${v} m²` : String(v);
}

function ComparisonRowView({ row }: { row: ComparisonRow }) {
  return (
    <tr className="border-b border-ui-border text-sm">
      <td className="px-4 py-3 text-vert-900">{row.label}</td>
      <td className="px-4 py-3 font-medium text-vert-900">{formatValue(row.field, row.working)}</td>
      <td className="px-4 py-3 text-ui-text">{formatValue(row.field, row.fisc)}</td>
      <td className="px-2 py-3 w-10">
        {row.match ? (
          <span className="flex items-center justify-center size-6 rounded-full bg-success/15 text-success-txt">
            <Check size={14} />
          </span>
        ) : (
          <span className="flex items-center justify-center size-6 rounded-full bg-error/15 text-error">
            <X size={14} />
          </span>
        )}
      </td>
    </tr>
  );
}

export default function BienComparisonPage({
  params,
}: {
  params: Promise<{ lotId: string; bienId: string }>;
}) {
  const { lotId, bienId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<BienComparison | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchBienComparison(bienId)
      .then((d) => { if (active) setData(d); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bienId]);

  const numericRows = data?.rows.filter((r) => NUMERIC_FIELDS.has(r.field)) ?? [];
  const equipmentRows = data?.rows.filter((r) => EQUIPMENT_FIELDS.has(r.field)) ?? [];
  const hasMismatch = data?.rows.some((r) => !r.match) ?? false;

  return (
    <div className="m-6 flex flex-col gap-4">
      <Link
        href={`/lot/${lotId}/vos-biens`}
        className="inline-flex items-center gap-1.5 text-sm text-ui-text-muted hover:text-ui-text transition-colors"
      >
        <ArrowLeft size={16} /> Retour
      </Link>

      <h1 className="text-lg font-semibold text-ui-text-highlighted">Comparaison de vos données</h1>

      {loading ? (
        <p className="text-sm text-ui-text-muted">Chargement…</p>
      ) : !data ? (
        <p className="text-sm text-ui-text-muted">Bien introuvable.</p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main: comparison table */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {hasMismatch && (
              <div className="flex items-center gap-2 bg-error/10 border-l-4 border-error rounded-md px-4 py-3 text-sm text-error">
                <Info size={16} className="shrink-0" />
                Des écarts ont été détectés avec les données du cadastre.
              </div>
            )}

            <div className="bg-white border border-ui-border rounded-lg overflow-hidden">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-cyprus-900 text-white text-sm">
                    <th className="text-left px-4 py-3 font-medium">Critères</th>
                    <th className="text-left px-4 py-3 font-medium">Vos données</th>
                    <th className="text-left px-4 py-3 font-medium">Données du fisc (cadastre)</th>
                    <th className="px-2 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {numericRows.map((r) => <ComparisonRowView key={r.field} row={r} />)}
                  <tr>
                    <td colSpan={4} className="px-4 pt-4 pb-2 text-xs font-medium tracking-wide text-ui-text-muted uppercase">
                      Équipements
                    </td>
                  </tr>
                  {equipmentRows.map((r) => <ComparisonRowView key={r.field} row={r} />)}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={() => router.push(`/lot/${lotId}/vos-biens`)}
                className="border border-ui-border rounded-md px-4 py-2 text-sm text-ui-text hover:bg-ui-bg-elevated transition-colors"
              >
                Modifier ma vérification
              </button>
              <button
                onClick={() => router.push('/manage-anomalies')}
                className="bg-vert-400 text-vert-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-vert-300 transition-colors"
              >
                Configurer mon dossier de réclamation
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
            <div className="bg-white border border-ui-border rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <img src={BIEN_TYPE_ICON[data.type]} alt="" className="size-8 shrink-0" />
                <span className="text-base font-medium text-vert-900">{data.type}</span>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-vert-900">
                <li className="flex items-center gap-2"><Hash size={16} className="text-ui-text-muted" /> ID : {data.reference}</li>
                <li className="flex items-center gap-2"><Ruler size={16} className="text-ui-text-muted" /> {data.surface}</li>
                <li className="flex items-center gap-2"><Building2 size={16} className="text-ui-text-muted" /> Étage : {data.etage}</li>
                {data.address && <li className="flex items-center gap-2"><MapPin size={16} className="text-ui-text-muted" /> {data.address}</li>}
              </ul>
            </div>

            <div className="bg-white border border-ui-border rounded-lg p-4 flex flex-col gap-3">
              <span className="text-base font-medium text-vert-900">Impact financier estimé</span>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ui-text-muted">Taxe payée (FISC)</span>
                <span className="bg-error/10 text-error rounded-full px-2.5 py-0.5 font-medium">{data.taxePayee.toFixed(0)} €</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ui-text-muted">Taxe attendue</span>
                <span className="bg-info/10 text-info rounded-full px-2.5 py-0.5 font-medium">{data.taxeAttendue.toFixed(0)} €</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-ui-border pt-3">
                <span className="font-medium text-vert-900">Dégrèvement estimé</span>
                <span className={data.degrevement >= 0 ? 'text-success-txt font-semibold' : 'text-error font-semibold'}>
                  {data.degrevement >= 0 ? '+' : ''}{data.degrevement.toFixed(2)} €
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
