import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import BiensPanel from '@/components/dashboard/biens-panel';

export default async function VosBiensPage({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const { lotId } = await params;
  return (
    <div className="p-6 flex flex-col gap-4">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1 text-sm text-ui-text-muted hover:text-ui-text transition-colors"
      >
        <ChevronLeft size={16} />
        Retour
      </Link>
      <BiensPanel lotId={lotId} />
    </div>
  );
}
