import type { Metadata } from 'next';
import Link from 'next/link';

import Layout from '@/components/exchangetime/layout';
import { siteOperator } from '@/lib/site-operator';

export function generateMetadata(): Metadata {
  return {
    title: 'Legal notice / Impressum · Exchange Time',
    robots: { index: siteOperator().complete, follow: true },
  };
}
export default function Imprint() {
  const operator = siteOperator();
  return (
    <Layout>
      <article
        lang="en"
        className="blog-container max-w-3xl mx-auto prose prose-lg dark:prose-invert"
      >
        <h1>Legal notice / Impressum</h1>
        {!operator.complete && (
          <p role="alert" className="border border-amber-500 p-4 rounded-lg">
            Setup incomplete: operator identity, editorial responsibility or hosting information is
            missing. This draft is not a complete legal notice and must not be presented as proof of
            legal compliance.
          </p>
        )}
        <h2>Service provider</h2>
        <p>
          Provider information under section 5 of the German Digital Services Act (DDG), where
          applicable, and section 18 of the German Interstate Media Treaty (MStV).
        </p>
        <p className="whitespace-pre-line">
          {operator.name || 'Full legal name / company not yet provided'}
          {'\n'}
          {operator.address || 'Serviceable postal address not yet provided'}
        </p>
        {operator.representative && <p>Represented by: {operator.representative}</p>}
        <h2>Contact</h2>
        {operator.email ? (
          <p>
            <a href={'mailto:' + operator.email}>{operator.email}</a>
          </p>
        ) : (
          <p>Contact email not yet provided.</p>
        )}
        {operator.register && <p>Register and registration number: {operator.register}</p>}
        {operator.vatId && <p>VAT identification number: {operator.vatId}</p>}
        <h2>Responsible for editorial content</h2>
        <p>Person responsible for the Research Library under section 18(2) MStV:</p>
        <p className="whitespace-pre-line">
          {operator.editor || 'Responsible individual not yet appointed'}
          {'\n'}
          {operator.editorAddress || 'Postal address not yet provided'}
        </p>
        {operator.dispute && (
          <>
            <h2>Consumer dispute resolution</h2>
            <p>{operator.dispute}</p>
          </>
        )}
        <h2>Editorial content, AI and financial information</h2>
        <p>
          Automated weekly reviews are identified as AI-assisted. Sources and reporting dates appear
          in each article. Generated images are labelled as illustrations, not documentary
          photographs. Source checks do not guarantee accuracy.
        </p>
        <p>
          Content provides general information and does not consider your personal financial
          circumstances. A “not investment advice” disclaimer does not replace any applicable
          capital-markets disclosure or authorisation requirements.
        </p>
        <p>
          <Link href="/settings/privacy-policy">Privacy policy</Link> ·{' '}
          <Link href="/redaktion">Editorial &amp; AI policy</Link>
        </p>
      </article>
    </Layout>
  );
}
