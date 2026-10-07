/**
 * Basic RFC 5322 compliant regex for preliminary email sanity checking.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeCompanyName(companyName: string | null | undefined): string {
  return (companyName ?? '').trim();
}

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

export interface ValidatedLead {
  company_name: string;
  email: string;
}

export interface ValidationResult {
  valid: ValidatedLead[];
  duplicates: number;
  invalid: { row: number; email: string; reason: string }[];
}

export function validateAndDeduplicateLeads(
  rows: { company_name?: string; email?: string }[],
  existingEmails: Set<string> = new Set()
): ValidationResult {
  const valid: ValidatedLead[] = [];
  const seenInBatch = new Set<string>();
  const invalid: { row: number; email: string; reason: string }[] = [];
  let duplicates = 0;

  rows.forEach((row, index) => {
    const rawEmail = row.email ?? '';
    const email = normalizeEmail(rawEmail);
    const company = normalizeCompanyName(row.company_name);

    if (!email) {
      invalid.push({ row: index + 1, email: rawEmail, reason: 'Empty email address' });
      return;
    }

    if (!isValidEmail(email)) {
      invalid.push({ row: index + 1, email: rawEmail, reason: 'Invalid email format' });
      return;
    }

    if (existingEmails.has(email) || seenInBatch.has(email)) {
      duplicates += 1;
      return;
    }

    seenInBatch.add(email);
    valid.push({
      company_name: company,
      email,
    });
  });

  return {
    valid,
    duplicates,
    invalid,
  };
}
