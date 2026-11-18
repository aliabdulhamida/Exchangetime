import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import AdSlot from '@/components/advertising/ad-slot';
import AssetDiscovery from '@/components/exchangetime/asset-discovery';
import AssetHistory from '@/components/exchangetime/asset-history';
import Layout from '@/components/exchangetime/layout';
import { researchUrl } from '@/components/exchangetime/product-model';
import { findSeoAsset, seoAssets, serializeJsonLd, SITE_URL } from '@/lib/seo-assets';
import { getSeoAssetSnapshot } from '@/lib/server/seo-asset-data';

export const revalidate = 300;
export const dynamicParams = false;
type Props = {params: Promise<{'asset-slug': string}>};

export function generateStaticParams() { return seoAssets.map(asset => ({'asset-slug': asset.slug})); }

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const asset = findSeoAsset((await params)['asset-slug']);
  if (!asset) notFound();
  const title = asset.name + ' price, chart & market context · Exchange Time';
  return {title, description: asset.description, alternates: {canonical: '/dashboard/' + asset.slug},
    openGraph: {title, description: asset.description, url: '/dashboard/' + asset.slug, type: 'website'},
    twitter: {card: 'summary', title, description: asset.description}};
}

export default async function AssetPage({params}: Props) {
  const asset = findSeoAsset((await params)['asset-slug']);
  if (!asset) notFound();
  const snapshot = await getSeoAssetSnapshot(asset.slug);
  const quote = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('en-US', {maximumFractionDigits: asset.kind === 'Currency pair' ? 5 : 2});
  const change = snapshot?.changePercent;
  const changeText = change == null ? 'Daily change unavailable' : (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
  const faqs = [
    {question: asset.question, answer: asset.answer},
    {question: 'Are these prices real-time?', answer: 'No real-time guarantee is provided. Yahoo Finance supplies the reported data. This page is cached for five minutes, daily history can include an incomplete session, and venue-specific delays may apply. Check the observation timestamp before using a quote.'},
  ];
  const structured = {'@context': 'https://schema.org', '@graph': [
    {'@type': 'WebPage', '@id': SITE_URL + '/dashboard/' + asset.slug, name: asset.name + ' market guide', description: asset.description},
    {'@type': 'BreadcrumbList', itemListElement: [
      {'@type': 'ListItem', position: 1, name: 'Markets', item: SITE_URL + '/dashboard'},
      {'@type': 'ListItem', position: 2, name: asset.name, item: SITE_URL + '/dashboard/' + asset.slug}]},
    {'@type': 'FAQPage', mainEntity: faqs.map(faq => ({'@type': 'Question', name: faq.question,
      acceptedAnswer: {'@type': 'Answer', text: faq.answer}}))},
  ]};
  return <Layout><article className="asset-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: serializeJsonLd(structured)}} />
    <nav aria-label="Breadcrumb" className="asset-breadcrumb"><Link href="/dashboard">Markets</Link><span aria-hidden="true">/</span><span>{asset.name}</span></nav>
    <header className="asset-page-heading">
      <div><p className="terminal-note">{asset.kind} · {asset.symbol}</p><h1>{asset.name}</h1></div>
      <div><p className="asset-page-price">{quote(snapshot?.price)} <span>{asset.kind === 'Equity index' ? 'points' : snapshot?.currency ?? ''}</span></p>
        <p className={change == null ? 'terminal-note' : change >= 0 ? 'asset-gain' : 'asset-loss'}>{changeText}<span>{change == null ? '' : ' · Daily'}</span></p></div>
    </header>
    {snapshot ? <p className="asset-observation">Source: <a href={'https://finance.yahoo.com/quote/' + encodeURIComponent(asset.symbol) + '/'}>Yahoo Finance</a> · Observed {snapshot.observedAt ? new Date(snapshot.observedAt * 1000).toLocaleString('en-GB', {timeZone: 'UTC'}) + ' UTC' : 'time unavailable'} · Retrieved {new Date(snapshot.retrievedAt).toLocaleString('en-GB', {timeZone: 'UTC'})} UTC · May be delayed</p>
      : <p role="status" className="record-error">Market data is temporarily unavailable. No substitute prices are displayed. The asset guide remains available.</p>}
    <AssetHistory snapshot={snapshot} symbol={asset.symbol} />
    <AdSlot placement="assetContent" />
    <section className="asset-context" aria-labelledby="asset-context-title">
      <h2 id="asset-context-title">Understanding {asset.name}</h2>
      <p>{asset.overview}</p><p>{asset.drivers}</p>
      {snapshot?.price != null && <p>The latest reported {asset.name} {asset.kind === 'Equity index' ? 'index level' : 'price'} is {quote(snapshot.price)} {asset.kind === 'Equity index' ? 'points' : snapshot.currency ?? ''}.{change == null ? ' A daily comparison is not available.' : ' The reported daily change is ' + changeText + '.'} This describes price movement, not its cause.</p>}
      <dl className="asset-facts"><div><dt>52-week low</dt><dd>{quote(snapshot?.week52Low)}</dd></div><div><dt>52-week high</dt><dd>{quote(snapshot?.week52High)}</dd></div><div><dt>Quote unit</dt><dd>{asset.kind === 'Equity index' ? 'Index points' : snapshot?.currency ?? 'Unavailable'}</dd></div></dl>
      <p className="terminal-note">52-week bounds are shown only when supplied by the provider. Missing values are not estimated. Educational information, not investment advice.</p>
      <Link className="terminal-button" href={researchUrl(asset.symbol)}>Open research workspace ↗</Link>
    </section>
    <section className="asset-faq" aria-labelledby="asset-faq-title"><h2 id="asset-faq-title">Questions about {asset.name}</h2>
      {faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
    </section>
    <AssetDiscovery exclude={asset.slug} />
  </article></Layout>;
}
