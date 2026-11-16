export function siteOperator() {
  const operator = {
    name: process.env.SITE_OPERATOR_NAME?.trim() ?? '',
    address:
      process.env.SITE_OPERATOR_ADDRESS?.trim() || 'Schluchseestraße 65\n13469 Berlin\nDeutschland',
    email: process.env.SITE_OPERATOR_EMAIL?.trim() || 'info@exchangetime.de',
    representative: process.env.SITE_OPERATOR_REPRESENTATIVE?.trim() ?? '',
    register: process.env.SITE_OPERATOR_REGISTER?.trim() ?? '',
    vatId: process.env.SITE_OPERATOR_VAT_ID?.trim() ?? '',
    editor: process.env.SITE_EDITOR_NAME?.trim() ?? '',
    editorAddress: process.env.SITE_EDITOR_ADDRESS?.trim() ?? '',
    hosting: process.env.SITE_HOSTING_DISCLOSURE?.trim() ?? '',
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
        operator.hosting,
    ),
  };
}
