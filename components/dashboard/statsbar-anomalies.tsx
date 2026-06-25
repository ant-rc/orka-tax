'use client';

interface StatsbarAnomaliesProps {
}

export default function StatsbarAnomalies({
}: StatsbarAnomaliesProps) {
  return (
    <div className="stats-bar-anomalies grid grid-cols-3 flex items-center flex-wrap gap-6 px-5 py-3 border-b border-ui-border">
      <div className="flex justify-between flex items-center">
        <div className="flex items-center gap-2">
          <img src="/assets/warning.svg" className=""/>
          <span className="ms-2">Anomalies à qualifier</span>
        </div>
        <span className="ms-2 warning-text">...</span>
      </div>

      <div className="flex justify-between flex items-center">
        <div className="flex items-center gap-2">
          <img src="/assets/chart.svg" className=""/>
          <span className="ms-2">Taux de qualification</span>
        </div>
        <span className="ms-2">...</span>
      </div>
      
      <div className="flex justify-between flex items-center">
        <div className="flex items-center gap-2">
          <img src="/assets/argent.webp" className=""/>
          <span className="ms-2">Montant récupérable restant</span>
        </div>
        <span className="ms-2 success-text">...</span>
      </div>

    </div>


  );
}
