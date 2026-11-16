export function siteOperator() {
  const operator = {
    name: process.env.SITE_OPERATOR_NAME?.trim() || 'Ali Abdul Hamid Hassan',
    address:
      process.env.SITE_OPERATOR_ADDRESS?.trim() ||
      'Frieda-Seidlitz-Straße 6\n13086 Berlin\nGermany',
    email: process.env.SITE_OPERATOR_EMAIL?.trim() || 'info@exchangetime.de',
    representative: process.env.SITE_OPERATOR_REPRESENTATIVE?.trim() ?? '',
    register: process.env.SITE_OPERATOR_REGISTER?.trim() ?? '',
    vatId: process.env.SITE_OPERATOR_VAT_ID?.trim() ?? '',
    editor: process.env.SITE_EDITOR_NAME?.trim() ?? '',
    editorAddress: process.env.SITE_EDITOR_ADDRESS?.trim() ?? '',
    hosting:
      process.env.SITE_HOSTING_DISCLOSURE?.trim() ||
      'The operator uses GitHub and Vercel for source hosting and deployment. Vercel Functions are configured to execute in Washington, D.C., United States (region iad1). Website requests handled by these functions may therefore involve processing personal data in the United States. Static content may be delivered through Vercel’s global content delivery network; the function region does not determine every processing location. Subprocessors, log retention periods and the applicable international transfer safeguards still need to be confirmed. No EU-only processing is claimed.',
    dispute: process.env.SITE_DISPUTE_DISCLOSURE?.trim() ?? '',
  };
  return {
    ...operator,
    complete: Boolean(
      operator.name &&
        operator.address &&
        operator.email &&
        operator.editor &&
        operator.editorAddress &&
        process.env.SITE_HOSTING_DISCLOSURE?.trim(),
    ),
  };
}
