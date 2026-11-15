import Dashboard from '@/components/exchangetime/dashboard';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  return <Dashboard view={(await searchParams).view} />;
}
