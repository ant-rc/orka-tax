'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, setActiveFiscalProfileId } from '@/lib/supabase/client';
import { fetchFiscalProfiles } from '@/lib/supabase/queries';

// Demo logins shown as hints — the actual match is resolved against Supabase.
const DEMO_ACCOUNTS = [
  { id: '552 081 317', name: 'Cabinet Démo Patrimoine' },
  { id: '843 119 204', name: 'Foncière Atlantique' },
];

// Compare company IDs loosely (ignore spaces / punctuation / case).
const normalizeId = (value: string) => value.replace(/[^a-z0-9]/gi, '').toLowerCase();

export default function IdentificationPage() {
  const router = useRouter();

  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = companyId.trim() !== '' && companyName.trim() !== '';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, company_id');

      const entered = normalizeId(companyId);
      const match = orgs?.find(
        (o) => o.company_id && normalizeId(o.company_id) === entered,
      );

      if (!match) {
        setError('Aucune entreprise ne correspond à ce numéro ID.');
        setSubmitting(false);
        return;
      }

      localStorage.setItem(
        'orka_org',
        JSON.stringify({ id: match.id, name: match.name, companyId: match.company_id }),
      );

      // Default the active fiscal profile to the account's first profile.
      const profiles = await fetchFiscalProfiles(match.id);
      if (profiles[0]) setActiveFiscalProfileId(profiles[0].id);

      router.push('/dashboard');
    } catch {
      setError('Connexion impossible. Réessayez.');
      setSubmitting(false);
    }
  }

  function prefill(account: { id: string; name: string }) {
    setCompanyId(account.id);
    setCompanyName(account.name);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-ui-bg-elevated flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-ui-border shadow-sm p-8 w-full max-w-md">
        {/* Wordmark */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-cyprus-900">
            OR<span className="text-vert-400">K</span>A
          </span>
        </div>

        <h1 className="text-xl font-semibold text-ui-text-highlighted mb-2 text-center">
          Mon avis de taxe foncière
        </h1>
        <p className="text-sm text-ui-text-muted text-center mb-8">
          Identifiez votre entreprise pour accéder à votre espace de suivi.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="company-id"
              className="text-sm font-medium text-ui-text-highlighted"
            >
              Numéro ID de la boîte
            </label>
            <input
              id="company-id"
              type="text"
              value={companyId}
              onChange={(e) => { setCompanyId(e.target.value); setError(null); }}
              placeholder="Ex. 552 081 317"
              className="border border-ui-border rounded-md px-3 py-2 text-sm text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="company-name"
              className="text-sm font-medium text-ui-text-highlighted"
            >
              Nom de l&apos;entreprise
            </label>
            <input
              id="company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex. Cabinet Patrimoine SAS"
              className="border border-ui-border rounded-md px-3 py-2 text-sm text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="mt-2 bg-vert-400 text-cyprus-900 rounded-md px-4 py-2.5 text-sm font-semibold hover:bg-vert-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Connexion…' : 'Accéder à mon espace'}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="mt-8 border-t border-ui-border pt-4">
          <p className="text-xs font-medium text-ui-text-muted mb-2">Comptes de démonstration</p>
          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => prefill(account)}
                className="flex items-center justify-between gap-3 rounded-md border border-ui-border px-3 py-2 text-left text-sm hover:bg-ui-bg-elevated transition-colors"
              >
                <span className="font-medium text-ui-text-highlighted">{account.name}</span>
                <span className="text-ui-text-muted">{account.id}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
