import type { SenderSettings, SenderSettingsPublic } from '@/types/database';

/** Proiezione sicura delle impostazioni mittente: i testi cifrati non lasciano mai il server. */
export function toPublicSenderSettings(
  organizationId: string,
  row: Partial<SenderSettings> | null
): SenderSettingsPublic {
  return {
    organization_id: organizationId,
    from_name: row?.from_name ?? '',
    from_email: row?.from_email ?? '',
    reply_to: row?.reply_to ?? '',
    preferred_timezone: row?.preferred_timezone ?? 'Europe/Rome',
    send_window_start: String(row?.send_window_start ?? '09:00').slice(0, 5),
    send_window_end: String(row?.send_window_end ?? '18:00').slice(0, 5),
    smtp_host: row?.smtp_host ?? '',
    smtp_port: Number(row?.smtp_port ?? 465),
    smtp_secure: row?.smtp_secure ?? true,
    smtp_user: row?.smtp_user ?? '',
    smtp_pass_set: Boolean(row?.smtp_pass_ciphertext),
    imap_host: row?.imap_host ?? '',
    imap_port: Number(row?.imap_port ?? 993),
    imap_user: row?.imap_user ?? '',
    imap_pass_set: Boolean(row?.imap_pass_ciphertext),
    is_verified: row?.is_verified ?? false,
    verified_at: row?.verified_at ?? null,
    updated_at: row?.updated_at ?? null,
  };
}
