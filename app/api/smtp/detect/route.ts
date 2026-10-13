import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';

interface KnownProvider {
  name: string;
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  requiresAppPassword: boolean;
  notes: string;
  appPasswordUrl?: string;
}

const KNOWN_DOMAINS: Record<string, KnownProvider> = {
  'gmail.com': {
    name: 'Gmail',
    provider: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    requiresAppPassword: true,
    notes: 'Google richiede una "Password per le app" a 16 caratteri (la password ordinaria del tuo account non funzionerà).',
    appPasswordUrl: 'https://myaccount.google.com/apppasswords',
  },
  'googlemail.com': {
    name: 'Gmail',
    provider: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    requiresAppPassword: true,
    notes: 'Google richiede una "Password per le app" a 16 caratteri.',
    appPasswordUrl: 'https://myaccount.google.com/apppasswords',
  },
  'outlook.com': {
    name: 'Outlook.com',
    provider: 'outlook',
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    requiresAppPassword: true,
    notes: 'Se hai abilitato la verifica a due fattori su Microsoft, genera e inserisci una password per le app.',
    appPasswordUrl: 'https://account.live.com/proofs/AppPassword',
  },
  'hotmail.com': {
    name: 'Hotmail',
    provider: 'outlook',
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    requiresAppPassword: true,
    notes: 'Per account Hotmail/Outlook con verifica in due passaggi, usa una password per le app.',
    appPasswordUrl: 'https://account.live.com/proofs/AppPassword',
  },
  'live.com': {
    name: 'Live Mail',
    provider: 'outlook',
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    requiresAppPassword: true,
    notes: 'Per account Microsoft con 2FA, usa una password per le app.',
  },
  'yahoo.com': {
    name: 'Yahoo Mail',
    provider: 'yahoo',
    host: 'smtp.mail.yahoo.com',
    port: 465,
    secure: true,
    requiresAppPassword: true,
    notes: 'Yahoo richiede obbligatoriamente una "Password per le app" generata nella Sicurezza account di Yahoo.',
    appPasswordUrl: 'https://login.yahoo.com/account/security',
  },
  'yahoo.it': {
    name: 'Yahoo Mail Italia',
    provider: 'yahoo',
    host: 'smtp.mail.yahoo.com',
    port: 465,
    secure: true,
    requiresAppPassword: true,
    notes: 'Yahoo richiede una password per le app generata nelle impostazioni di sicurezza di Yahoo.',
    appPasswordUrl: 'https://login.yahoo.com/account/security',
  },
  'icloud.com': {
    name: 'Apple iCloud',
    provider: 'icloud',
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    requiresAppPassword: true,
    notes: 'Apple richiede una "Password specifica per l\'app" generata su appleid.apple.com.',
    appPasswordUrl: 'https://appleid.apple.com/account/manage',
  },
  'me.com': {
    name: 'Apple iCloud',
    provider: 'icloud',
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    requiresAppPassword: true,
    notes: 'Apple richiede una "Password specifica per l\'app" generata su appleid.apple.com.',
    appPasswordUrl: 'https://appleid.apple.com/account/manage',
  },
  'aruba.it': {
    name: 'Aruba Mail',
    provider: 'aruba',
    host: 'smtps.aruba.it',
    port: 465,
    secure: true,
    requiresAppPassword: false,
    notes: 'Usa la normale password della tua casella email Aruba.',
  },
  'pec.it': {
    name: 'Aruba PEC',
    provider: 'aruba_pec',
    host: 'smtps.pec.aruba.it',
    port: 465,
    secure: true,
    requiresAppPassword: false,
    notes: 'Configurazione per casella PEC Aruba su connessione protetta SSL.',
  },
  'hostinger.com': {
    name: 'Hostinger Mail',
    provider: 'hostinger',
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    requiresAppPassword: false,
    notes: 'Usa la password della tua casella creata su hPanel.',
  },
  'libero.it': {
    name: 'Libero Mail',
    provider: 'libero',
    host: 'smtp.libero.it',
    port: 465,
    secure: true,
    requiresAppPassword: false,
    notes: 'Se hai attivo il Password Sicuro Libero, genera la password applicativa dedicata.',
  },
  'virgilio.it': {
    name: 'Virgilio Mail',
    provider: 'virgilio',
    host: 'smtp.virgilio.it',
    port: 465,
    secure: true,
    requiresAppPassword: false,
    notes: 'Usa la password della tua casella Virgilio.',
  },
  'fastwebnet.it': {
    name: 'Fastweb',
    provider: 'fastweb',
    host: 'smtp.fastwebnet.it',
    port: 587,
    secure: false,
    requiresAppPassword: false,
    notes: 'Usa le credenziali della tua casella Fastweb.',
  },
  'tin.it': {
    name: 'TIM / Tin.it',
    provider: 'tim',
    host: 'mail.tin.it',
    port: 587,
    secure: false,
    requiresAppPassword: false,
    notes: 'Usa le credenziali della tua casella TIM / Tin.it.',
  },
  'alice.it': {
    name: 'TIM Alice',
    provider: 'tim',
    host: 'out.alice.it',
    port: 587,
    secure: false,
    requiresAppPassword: false,
    notes: 'Usa le credenziali della tua casella Alice.',
  },
};

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = (body.email || body.domain || '').trim().toLowerCase();

    if (!rawEmail) {
      return NextResponse.json({ error: 'Email o dominio non specificato' }, { status: 400 });
    }

    // Extract domain
    const domain = rawEmail.includes('@') ? rawEmail.split('@')[1] : rawEmail;

    if (!domain || !domain.includes('.')) {
      return NextResponse.json({ error: 'Dominio email non valido' }, { status: 400 });
    }

    // 1. Direct match in known domains
    if (KNOWN_DOMAINS[domain]) {
      return NextResponse.json({
        detected: true,
        method: 'known_domain',
        domain,
        config: KNOWN_DOMAINS[domain],
      });
    }

    // 2. DNS MX lookup for custom company domains (e.g. @studioarchitettura.it)
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (mxRecords && mxRecords.length > 0) {
        // Sort by priority ascending
        mxRecords.sort((a, b) => a.priority - b.priority);
        const mxHosts = mxRecords.map((r) => r.exchange.toLowerCase());

        // Check if any MX points to Google
        const isGoogle = mxHosts.some((h) => h.includes('google.com') || h.includes('googlemail.com') || h.includes('aspmx.l.google.com'));
        if (isGoogle) {
          return NextResponse.json({
            detected: true,
            method: 'mx_record',
            domain,
            config: {
              name: 'Google Workspace (Dominio Personalizzato)',
              provider: 'google_workspace',
              host: 'smtp.gmail.com',
              port: 465,
              secure: true,
              requiresAppPassword: true,
              notes: 'Riconosciuto come Google Workspace. Richiede una "Password per le app" a 16 caratteri generata nel tuo account Google aziendale.',
              appPasswordUrl: 'https://myaccount.google.com/apppasswords',
            },
          });
        }

        // Check if any MX points to Microsoft 365
        const isMicrosoft = mxHosts.some((h) => h.includes('protection.outlook.com') || h.includes('office365.com') || h.includes('microsoft.com'));
        if (isMicrosoft) {
          return NextResponse.json({
            detected: true,
            method: 'mx_record',
            domain,
            config: {
              name: 'Microsoft 365 / Exchange Online',
              provider: 'microsoft_365',
              host: 'smtp.office365.com',
              port: 587,
              secure: false,
              requiresAppPassword: false,
              notes: 'Riconosciuto come Microsoft 365. Assicurati che l\'amministratore del tuo tenant abbia attivato "SMTP AUTH" sulla tua casella.',
            },
          });
        }

        // Check if Hostinger
        const isHostinger = mxHosts.some((h) => h.includes('hostinger.com') || h.includes('titan.email'));
        if (isHostinger) {
          return NextResponse.json({
            detected: true,
            method: 'mx_record',
            domain,
            config: {
              name: 'Hostinger / Titan Mail',
              provider: 'hostinger',
              host: 'smtp.hostinger.com',
              port: 465,
              secure: true,
              requiresAppPassword: false,
              notes: 'Riconosciuto come server Hostinger. Usa la normale password della tua casella email.',
            },
          });
        }

        // Check if Aruba
        const isAruba = mxHosts.some((h) => h.includes('aruba.it'));
        if (isAruba) {
          return NextResponse.json({
            detected: true,
            method: 'mx_record',
            domain,
            config: {
              name: 'Aruba Business',
              provider: 'aruba',
              host: 'smtps.aruba.it',
              port: 465,
              secure: true,
              requiresAppPassword: false,
              notes: 'Riconosciuto come casella ospitata su Aruba.',
            },
          });
        }
      }
    } catch (mxError: any) {
      console.warn(`DNS MX check failed for domain ${domain}:`, mxError.message || mxError);
    }

    // 3. Fallback: Not detected, require assisted manual setup
    return NextResponse.json({
      detected: false,
      domain,
      suggestedHost: `mail.${domain}`,
      suggestedPort: 465,
      suggestedSecure: true,
      message: 'Impossibile identificare automaticamente il provider. Utilizza la configurazione assistita manuale.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Errore durante il rilevamento' }, { status: 500 });
  }
}
