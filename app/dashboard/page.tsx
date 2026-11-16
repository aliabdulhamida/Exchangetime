import Dashboard from '@/components/exchangetime/dashboard';
import { workspaces } from '@/components/exchangetime/product-model';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return { title: (workspaces.find(item => item.key === view)?.label ?? 'Market overview') + ' · Exchange Time' };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  return <Dashboard view={(await searchParams).view} />;
}
