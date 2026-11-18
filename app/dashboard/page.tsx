import AssetDiscovery from '@/components/exchangetime/asset-discovery';
import Dashboard from '@/components/exchangetime/dashboard';
import { workspaces } from '@/components/exchangetime/product-model';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const title = (workspaces.find(item => item.key === view)?.label ?? 'Market overview') + ' · Exchange Time';
  const description = 'Explore global stock markets, currency pairs and bitcoin. Check market hours, research assets and track your portfolio with Exchange Time.';
  return {title, description, alternates: {canonical: '/dashboard'},
    openGraph: {title, description, url: '/dashboard', type: 'website'},
    robots: {index: !view || view === 'MarketOverview', follow: true}};
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  return <Dashboard view={(await searchParams).view}><AssetDiscovery /></Dashboard>;
}
