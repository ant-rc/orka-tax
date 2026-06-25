'use client';

interface DuplicatesCountAnomaliesProps {
}

export default function DuplicatesCountAnomalies({

}: DuplicatesCountAnomaliesProps) {
  return (
    <div className="px-5 py-3 flex items-center gap-2 flex-wrap text-sm border-b border-ui-border duplicates-count-bar">
      <img src="/assets/warning-badge.svg" className=""/>
      <span className="ms-2 warning-text">...</span>
      <span className="text-xs font-semibold text-ui-text-highlighted me-2 warning-text">doublons potentiels détectés</span>
      <span className="underline text-xs warning-text">Voir et résoudre</span>
    </div>

  );
}
