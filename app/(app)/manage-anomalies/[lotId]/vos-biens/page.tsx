import AnomaliesPanel from '@/components/dashboard/anomalies-panel';

export default async function VosBiensPage({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const { lotId } = await params;
  return (
    <div className="p-6">
      <AnomaliesPanel lotId={lotId} />
    </div>
  );
}
