import { redirect } from 'next/navigation';

export default async function LotIndexPage({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const { lotId } = await params;
  redirect(`/lot/${lotId}/vos-biens`);
}
