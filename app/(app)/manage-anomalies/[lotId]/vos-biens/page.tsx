import BiensPanel from '@/components/dashboard/biens-panel';

export default async function VosBiensPage({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const { lotId } = await params;
  return (
    <div className="p-6">
      <BiensPanel lotId={lotId} />
    </div>
  );
}
