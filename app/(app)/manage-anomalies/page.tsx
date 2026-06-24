export default function ManageAnomaliesPage() {
  return (
    <div className="bg-white rounded-lg border border-ui-border p-6 m-6">
      <div className="flex items-center gap-3 mb-3">
        <h1 className="text-lg font-semibold text-ui-text-highlighted">
          Gestion des anomalies
        </h1>
        <span className="border border-ui-border rounded-full px-2.5 py-0.5 text-xs text-ui-text-muted">
          À venir
        </span>
      </div>
      <p className="text-sm text-ui-text-muted">
        Qualification et priorisation des écarts détectés, par enjeu financier — écran à venir.
      </p>
    </div>
  );
}
