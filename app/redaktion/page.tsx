import type { Metadata } from 'next';
import Link from 'next/link';

import Layout from '@/components/exchangetime/layout';

export const metadata: Metadata = { title: 'Editorial & AI policy · Exchange Time' };
export default function EditorialPolicy() {
  return (
    <Layout>
      <article
        lang="en"
        className="blog-container max-w-3xl mx-auto prose prose-lg dark:prose-invert"
      >
        <h1>Editorial &amp; AI policy</h1>
        <h2>Traceable sources</h2>
        <p>
          Weekly reviews link factual claims and market figures to their sources. Publication time
          and the reporting period are stated separately. Missing information is not silently
          replaced by estimates. Structural validation is not a substitute for checking the original
          source.
        </p>
        <h2>AI transparency</h2>
        <p>
          Automated weekly reviews are researched and written with AI assistance, disclosed at the
          beginning of the article. We do not claim human editorial approval unless it has actually
          occurred. AI-generated pictures are labelled as symbolic illustrations and do not document
          actual events.
        </p>
        <h2>Images and usage rights</h2>
        <p>
          New reviews use locally stored, purpose-generated illustrations or images with verified
          usage rights and origin/licence information. Finding an image online does not make it free
          to use. Credits and source references must remain traceable when corrections are made.
        </p>
        <h2>Financial information and interests</h2>
        <p>
          Market commentary is not advice tailored to personal circumstances. Specific investment
          recommendations, compensation, sponsorship or material conflicts of interest require
          separate assessment and appropriate disclosure alongside the affected content. A general
          disclaimer does not replace these obligations.
        </p>
        <h2>Corrections</h2>
        <p>
          Report errors using the contact in our <Link href="/impressum">legal notice</Link>.
          Material corrections must be dated and identified in the affected article; published
          weekly reviews must not be silently overwritten.
        </p>
      </article>
    </Layout>
  );
}
