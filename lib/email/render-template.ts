/**
 * Utility function to resolve placeholders in subjects and HTML emails.
 * Fully case-insensitive and tolerant to whitespace, underscores, and hyphens.
 *
 * Supported company name placeholders:
 * - {{NOME_AZIENDA}}, {{nome_azienda}}, {{nome azienda}}, {{nomeazienda}}
 * - {{azienda}}, {{AZIENDA}}
 * - {{companyName}}, {{company_name}}, {{COMPANY_NAME}}, {{company}}
 * - {{ragione_sociale}}, {{ragionesociale}}
 *
 * Supported email placeholders:
 * - {{email}}, {{EMAIL}}, {{mail}}, {{MAIL}}
 * - {{indirizzo_email}}, {{recipient_email}}
 */
export function renderTemplate(
  template: string,
  lead: {
    company_name?: string | null;
    email: string;
  }
): string {
  if (!template) return '';
  const company = lead.company_name ?? '';
  const email = lead.email ?? '';

  const COMPANY_TAGS = new Set([
    'azienda',
    'nomeazienda',
    'nomeimpresa',
    'ragionesociale',
    'company',
    'companyname',
    'businessname',
  ]);

  const EMAIL_TAGS = new Set([
    'email',
    'mail',
    'indirizzoemail',
    'indirizzomail',
    'recipientemail',
  ]);

  return template.replace(/{{\s*([^}]+?)\s*}}/g, (match, rawKey) => {
    // Normalize key: lowercase, strip all spaces, underscores, and hyphens
    const normalizedKey = rawKey.trim().toLowerCase().replace(/[\s_-]+/g, '');

    if (COMPANY_TAGS.has(normalizedKey)) {
      return company;
    }

    if (EMAIL_TAGS.has(normalizedKey)) {
      return email;
    }

    // If tag is not recognized, leave it untouched
    return match;
  });
}

