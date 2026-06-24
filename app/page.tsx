'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function IdentificationPage() {
  const router = useRouter();

  const [numeroFiscal, setNumeroFiscal] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');

  const canSubmit = numeroFiscal.trim() !== '' && nom.trim() !== '' && prenom.trim() !== '';

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    router.push('/dashboard');
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
          Renseignez vos informations pour accéder à votre espace de suivi.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="numero-fiscal"
              className="text-sm font-medium text-ui-text-highlighted"
            >
              Numéro fiscal
            </label>
            <input
              id="numero-fiscal"
              type="text"
              value={numeroFiscal}
              onChange={(e) => setNumeroFiscal(e.target.value)}
              placeholder="Ex. 1234567890123"
              className="border border-ui-border rounded-md px-3 py-2 text-sm text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="nom"
              className="text-sm font-medium text-ui-text-highlighted"
            >
              Nom
            </label>
            <input
              id="nom"
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. Dupont"
              className="border border-ui-border rounded-md px-3 py-2 text-sm text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="prenom"
              className="text-sm font-medium text-ui-text-highlighted"
            >
              Prénom
            </label>
            <input
              id="prenom"
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Ex. Marie"
              className="border border-ui-border rounded-md px-3 py-2 text-sm text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-2 bg-vert-400 text-cyprus-900 rounded-md px-4 py-2.5 text-sm font-semibold hover:bg-vert-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Accéder à mon espace
          </button>
        </form>
      </div>
    </div>
  );
}
