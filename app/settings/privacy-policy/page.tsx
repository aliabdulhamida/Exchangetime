import type { Metadata } from 'next';
import Link from 'next/link';

import Layout from '@/components/exchangetime/layout';
import { siteOperator } from '@/lib/site-operator';

export const metadata: Metadata = {
  title: 'Privacy policy · Exchange Time',
  robots: { index: false, follow: true },
};
export default function PrivacyPolicyPage() {
  const operator = siteOperator();
  return (
    <Layout>
      <article
        lang="en"
        className="blog-container max-w-3xl mx-auto prose prose-lg dark:prose-invert"
      >
        <h1>Privacy policy</h1>
        <p className="terminal-note">
          Updated November 16, 2026 · reflects this version of the website
        </p>
        {!operator.complete && (
          <p role="alert" className="border border-amber-500 p-4 rounded-lg">
            This notice remains incomplete. Editorial responsibility, log retention and applicable
            international transfer safeguards still require confirmation. The operator has confirmed
            the contact details and the selected US function region; this is not a completed
            compliance review.
          </p>
        )}
        <h2>1. Controller and contact</h2>
        <p className="whitespace-pre-line">
          {operator.name || 'Full legal name of the controller not yet provided'}
          {'\n'}
          {operator.address}
        </p>
        <p>
          Privacy enquiries: <a href={'mailto:' + operator.email}>{operator.email}</a>. See our{' '}
          <Link href="/impressum">legal notice</Link> for further provider information.
        </p>
        <h2>2. Hosting and server logs</h2>
        <p>
          When you request a page, the hosting provider receives connection data needed to deliver
          it, including your IP address, time of access, requested URL and browser information. This
          supports secure operation and troubleshooting. Depending on the actual arrangements,
          processing may rely on Article 6(1)(f) GDPR: the legitimate interest in providing a secure
          website.
        </p>
        <p>
          {operator.hosting ||
            'Still to be confirmed: hosting provider, recipients and subprocessors, processing locations, log retention periods, and any international transfers and safeguards. These operational details cannot reliably be established from the source code alone.'}
        </p>
        <h2>3. Local settings and financial records</h2>
        <p>
          Relevant features store appearance preferences, watchlists, portfolio entries and planning
          records in your browser. They generally remain until deleted through the application or
          browser settings. Saving a local record does not automatically upload it to a server-side
          account database. When you request data, search terms, symbols or other parameters needed
          for that feature can nevertheless reach our server.
        </p>
        <p>
          Strictly necessary storage and explicitly requested functions must be assessed under
          section 25(2) TDDDG. This is not a blanket exemption for all optional browser storage. An
          installed offline version may also keep website files in the browser cache.
        </p>
        <h2>4. Market data and external content</h2>
        <p>
          Depending on the feature, price, company-data and news requests are forwarded to sources
          such as Yahoo Finance, Financial Modeling Prep, Nasdaq and other configured providers. For
          server-side requests, our server communicates with the provider. Directly loaded images
          and embedded content differ: their providers receive browser connection data when they
          load.
        </p>
        <p>
          Some older articles load images from images.unsplash.com. New weekly reviews use locally
          hosted illustrations without an external image request. Following an external link opens
          the linked website. Selecting a radio station loads TuneIn’s player; the provider’s
          privacy information then also applies. TradingView charts and news and OpenStreetMap maps
          are further external integrations in the relevant features. They may involve processing
          outside the EU. Each integration still requires assessment of its legal basis, consent
          requirements and transfer safeguards for the actual configuration.
        </p>
        <h2>5. Advertising and analytics</h2>
        <p>
          The previously global Google AdSense, Vercel Analytics and Speed Insights scripts are
          disabled in this version. Re-enabling them requires a separate assessment and, where
          required, prior consent, withdrawal controls and updated disclosures. Disabling these
          scripts alone does not establish compliance for other external integrations.
        </p>
        <h2>6. Contact enquiries</h2>
        <p>
          If you email us, we process your address, message and voluntary information to respond.
          Depending on the enquiry, the legal basis is Article 6(1)(b) or (f) GDPR. Data is deleted
          once the enquiry is resolved and further retention is unnecessary, unless statutory
          retention or evidence requirements apply. The operator must still confirm its email
          provider and specific retention arrangements.
        </p>
        <h2>7. Your rights</h2>
        <p>
          Subject to the GDPR’s conditions, you may request access, rectification, erasure,
          restriction and data portability under Articles 15–20. You may object to processing based
          on legitimate interests under Article 21. Consent may be withdrawn for future processing.
          Under Article 77, you may complain to a competent data protection supervisory authority.
        </p>
        <h2>8. Automated decisions</h2>
        <p>
          Calculators and AI-assisted market articles provide information. They do not decide
          whether you receive credit, enter a contract or face comparable legal consequences. A
          calculated score is not a personalised investment recommendation.
        </p>
      </article>
    </Layout>
  );
}
