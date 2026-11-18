import Link from 'next/link';

import { seoAssets } from '@/lib/seo-assets';

export default function AssetDiscovery({exclude}: {exclude?: string}) {
  return <section className="asset-discovery" aria-labelledby="asset-discovery-title">
    <h2 id="asset-discovery-title">Explore markets</h2>
    <nav aria-label="Asset guides">
      {seoAssets.filter(asset => asset.slug !== exclude).map(asset => <Link key={asset.slug} href={'/dashboard/' + asset.slug}>
        <strong>{asset.name}<span aria-hidden="true">↗</span></strong><span>{asset.kind}</span>
      </Link>)}
    </nav>
  </section>;
}
