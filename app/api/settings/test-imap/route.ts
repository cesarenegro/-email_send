import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenant, tenantErrorResponse } from '@/lib/konta/session';
import { loadSenderSettings } from '@/lib/email/transporter';
import { createOrganizationImapClient, resolveOrganizationImapConfig } from '@/lib/email/imap-bounce-client';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const tenant = await requireTenant();
    if (!tenant.canManageSettings) {
      return NextResponse.json(
        {
          success: false,
          error: 'Solo Titolare o Amministratore possono testare la casella IMAP.',
          code: 'PERMISSION_DENIED',
        },
        { status: 403 }
      );
    }

    let client: ReturnType<typeof createOrganizationImapClient> | null = null;

    try {
      const settings = await loadSenderSettings(tenant.organizationId, createAdminClient());
      const imapConfig = await resolveOrganizationImapConfig(settings);
      client = createOrganizationImapClient(imapConfig, 10000);

      await client.connect();
      const lock = await client.getMailboxLock('INBOX', { readOnly: true });
      let messageCount = 0;
      try {
        const status = await client.status('INBOX', { messages: true });
        if (status && typeof status === 'object' && typeof status.messages === 'number') {
          messageCount = status.messages;
        }
      } finally {
        lock.release();
      }
      await client.logout();

      return NextResponse.json({
        success: true,
        message: `Connessione IMAP verificata con successo! Casella connessa (${messageCount} messaggi presenti).`,
      });
    } catch (error) {
      console.error('IMAP test error:', error instanceof Error ? error.message : error);
      const message = error instanceof Error ? error.message : '';
      return NextResponse.json(
        {
          success: false,
          error: message || 'Impossibile connettersi al server IMAP',
        },
        { status: 400 }
      );
    } finally {
      try {
        if (client?.usable) {
          await client.logout();
        }
      } catch {
        // Ignora errori di chiusura socket se già disconnesso
      }
    }
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
