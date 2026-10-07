/**
 * Utility function to resolve placeholders in subjects and HTML emails.
 * Supported placeholders:
 * - {{companyName}} -> lead company name
 * - {{azienda}}     -> lead company name
 * - {{email}}       -> lead recipient email
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

  return template
    .replaceAll('{{companyName}}', company)
    .replaceAll('{{azienda}}', company)
    .replaceAll('{{email}}', email);
}
