'use client';

interface StatsbarAnomaliesProps {
  count: number;
  rate: number;
  montant: number;
}

export default function StatsbarAnomalies({
  count,
  rate,
  montant,
}: StatsbarAnomaliesProps) {
  return (
    <div className="stats-bar-anomalies grid grid-cols-3 flex items-center flex-wrap gap-6 border-ui-border">
      <div className="flex justify-between flex items-center flex-1 overflow-auto bg-white border border-ui-border rounded-lg px-5 py-3">
        <div className="flex items-center gap-2">
          <img src="/assets/warning.svg" className=""/>
          <span className="ms-2">Anomalies à qualifier</span>
        </div>
        <span className="ms-2 warning-text">{count}</span>
      </div>

      <div className="flex justify-between flex items-center flex-1 overflow-auto bg-white border border-ui-border rounded-lg px-5 py-3">
        <div className="flex items-center gap-2">
          <img src="/assets/chart.svg" className=""/>
          <span className="ms-2">Taux de qualification</span>
        </div>
        <span>
          <span className="ms-2 me-1">{rate.toFixed(0)}</span>
          <span>%</span>
        </span>
      </div>

      <div className="flex justify-between flex items-center flex-1 overflow-auto bg-white border border-ui-border rounded-lg px-5 py-3">
        <div className="flex items-center gap-2">
          <img src="/assets/argent.webp" className=""/>
          <span className="ms-2">Montant récupérable restant</span>
        </div>
        <span className="success-text">
          <span className="ms-2 me-1">{montant.toFixed(2)}</span>
          <span>€</span>
        </span>
      </div>
    </div>
  );
}
