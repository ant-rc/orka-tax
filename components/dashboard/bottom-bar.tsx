'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { useSelection } from '@/components/dashboard/selection-context';
import ReportLoader from '@/components/dashboard/report-loader';

const LAST_MODIFIED_PLACEHOLDER = '09/12/2026';

export default function BottomBar() {
  const toast = useToast();
  const router = useRouter();
  const { generateReady, runGenerate, anomalieCount } = useSelection();
  const canGenerate = generateReady || anomalieCount > 0;

  const [loaderOpen, setLoaderOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!loaderOpen || progress >= 100) return;
    const timer = setTimeout(() => setProgress((prev) => Math.min(prev + 2, 100)), 60);
    return () => clearTimeout(timer);
  }, [loaderOpen, progress]);

  useEffect(() => {
    if (!loaderOpen || progress < 100 || completedRef.current) return;
    completedRef.current = true;
    void (async () => {
      await runGenerate();
      setLoaderOpen(false);
      setProgress(0);
      completedRef.current = false;
      toast('Rapport généré', 'success');
    })();
  }, [loaderOpen, progress, runGenerate, toast]);

  const handleGenerate = () => {
    if (anomalieCount > 0) {
      sessionStorage.setItem('filter_anomalie', '1');
      router.push('/manage-anomalies');
      return;
    }
    if (!generateReady) return;
    completedRef.current = false;
    setProgress(0);
    setLoaderOpen(true);
  };

  return (
    <>
      <ReportLoader open={loaderOpen} progress={progress} />
      <footer className="bg-white border-t border-ui-border px-8 py-4 flex items-center justify-between shrink-0">
        <span className="text-sm text-ui-text-muted">
          Dernière modification : {LAST_MODIFIED_PLACEHOLDER}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            title={canGenerate ? undefined : 'Tous les biens du lot doivent être traités'}
            className="bg-vert-400 text-vert-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-vert-300 transition-colors disabled:bg-ui-border disabled:text-ui-text-dimmed disabled:cursor-not-allowed disabled:hover:bg-ui-border"
            aria-label="Générer mon rapport"
          >
            {anomalieCount > 0 ? `Voir les anomalies (${anomalieCount})` : 'Générer mon rapport'}
          </button>
        </div>
      </footer>
    </>
  );
}
