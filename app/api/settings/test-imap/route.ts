import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';

export const dynamic = 'force-dynamic';

export async function POST() {
  const host = process.env.IMAP_HOST || 'imap.hostinger.com';
  const port = Number(process.env.IMAP_PORT || '993');
  const user = process.env.IMAP_USER || process.env.SMTP_USER;
  const pass = process.env.IMAP_PASS || process.env.SMTP_PASS;

  if (!user || !pass) {
    return NextResponse.json(
      { success: false, error: 'Credenziali casella postale mancanti (IMAP_USER / SMTP_USER)' },
      { status: 400 }
    );
  }

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });

  try {
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
  } catch (error: any) {
    console.error('IMAP test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Impossibile connettersi al server IMAP',
      },
      { status: 400 }
    );
  }
}
