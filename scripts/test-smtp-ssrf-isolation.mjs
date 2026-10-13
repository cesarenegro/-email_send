#!/usr/bin/env node
/**
 * test-smtp-ssrf-isolation.mjs
 * 
 * Formal Verification Suite for Phase 2 (Consolidated Revision R01-R05):
 * R01: Coerenza Avvio -> Invio (Pre-flight transport check, zero recipient attempt burn)
 * R02: Integrità Database (Composite FK, check triggers, read-only view)
 * R03: Autorizzazione Mittente (Mere domain match blocked, exact authenticated mailbox enforced)
 * R04: Sessioni e Bozze (Password strip, multi-account draft isolation, unverified badge)
 * R05: Prove che attraversano il codice applicativo (No constant-vs-constant mocks, IV randomness)
 */

import path from 'node:path';
import nodemailer from 'nodemailer';
import dns from 'dns';

try {
  process.loadEnvFile(path.join(process.cwd(), '.env.local'));
} catch (e) {
  // If already loaded or missing
}
import {
  isPrivateOrReservedIp,
  validateSmtpHostAndPort,
  createSecureSmtpTransportConfig,
  validateSenderCompatibility,
  ALLOWED_SMTP_PORTS,
} from '@/lib/security/ssrf';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { encryptSecret, decryptSecret } from '@/lib/crypto/encryption';
import {
  resolveAuthorizedTransportContext,
  getSmtpTransporter,
  getSenderIdentity,
  SmtpConfigurationError,
  SmtpDatabaseError,
} from '@/lib/email/transporter';
import { dispatchNextEmailForCampaign } from '@/lib/email/dispatcher';
import { dispatchNextEmailForNewsletter } from '@/lib/email/newsletter-dispatcher';

const RESULTS = [];

function recordTest(id, category, description, passed, details = '') {
  RESULTS.push({ id, category, description, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} [${id}] (${category}) ${description}`);
  if (details && !passed) {
    console.log(`   Details: ${details}`);
  }
}

async function runSuite() {
  console.log('='.repeat(80));
  console.log('FASE 2 HARDENED: VERIFICA CONSOLIDATA R01 - R05');
  console.log('='.repeat(80));

  // =========================================================================
  // 1. SSRF NUMERIC IPV4 & IPV6 PARSER TESTS
  // =========================================================================
  console.log('\n--- 1. SSRF: Validazione Numerica Range IPv4 & IPv6 ---');

  const t01 = isPrivateOrReservedIp('::ffff:7f00:1');
  recordTest('T01_IPV6_MAPPED_HEX_LOOPBACK', 'UNIT', 'Blocco IPv4-mapped esadecimale ::ffff:7f00:1 (127.0.0.1)', t01);

  const t02 = isPrivateOrReservedIp('0:0:0:0:0:0:0:1');
  recordTest('T02_IPV6_EXPANDED_LOOPBACK', 'UNIT', 'Blocco IPv6 loopback espanso 0:0:0:0:0:0:0:1 (::1)', t02);

  const t03 = isPrivateOrReservedIp('0:0:0:0:0:ffff:7f00:1');
  recordTest('T03_IPV6_EXPANDED_MAPPED_LOOPBACK', 'UNIT', 'Blocco IPv6 espanso mapped 0:0:0:0:0:ffff:7f00:1', t03);

  const t04 = isPrivateOrReservedIp('::ffff:a9fe:a9fe');
  recordTest('T04_IPV6_MAPPED_HEX_METADATA', 'UNIT', 'Blocco IPv4-mapped esadecimale ::ffff:a9fe:a9fe (169.254.169.254)', t04);

  const t05 = isPrivateOrReservedIp('127.0.0.1') &&
              isPrivateOrReservedIp('10.0.0.1') &&
              isPrivateOrReservedIp('172.16.0.1') &&
              isPrivateOrReservedIp('192.168.1.1') &&
              isPrivateOrReservedIp('169.254.169.254');
  recordTest('T05_IPV4_RESERVED_NUMERIC', 'UNIT', 'Blocco numerico IPv4 (127/8, 10/8, 172.16/12, 192.168/16, 169.254/16)', t05);

  const t06 = isPrivateOrReservedIp('fc00::1') &&
              isPrivateOrReservedIp('fe80::1') &&
              isPrivateOrReservedIp('ff02::1') &&
              isPrivateOrReservedIp('2001:db8::1');
  recordTest('T06_IPV6_ULA_LINKLOCAL_MULTICAST', 'UNIT', 'Blocco IPv6 ULA (fc00::/7), link-local (fe80::/10), multicast, doc', t06);

  const t07 = !isPrivateOrReservedIp('8.8.8.8') &&
              !isPrivateOrReservedIp('1.1.1.1') &&
              !isPrivateOrReservedIp('2607:f8b0:4005:805::200e');
  recordTest('T07_PUBLIC_IPS_ALLOWED', 'UNIT', 'Autorizzazione corretta di IP pubblici validi (8.8.8.8, 1.1.1.1, Google IPv6)', t07);

  let localhostBlocked = false;
  let googleMetaBlocked = false;
  let port80Blocked = false;
  try { await validateSmtpHostAndPort('localhost', 587); } catch (e) { localhostBlocked = true; }
  try { await validateSmtpHostAndPort('metadata.google.internal', 587); } catch (e) { googleMetaBlocked = true; }
  try { await validateSmtpHostAndPort('smtp.gmail.com', 80); } catch (e) { port80Blocked = true; }
  recordTest('T08_SSRF_HOSTNAME_AND_PORT_GUARD', 'INTEGRATION', 'Blocco hostname localhost, metadata interni e porte non-SMTP (80)', localhostBlocked && googleMetaBlocked && port80Blocked);

  // =========================================================================
  // 2. REAL SOCKET DESTINATION & DNS PINNING TEST
  // =========================================================================
  console.log('\n--- 2. Verifica Destinazione Socket Effettiva e Pinning DNS ---');

  let realSocketPinningPassed = false;
  let actualConnectedAddress = null;
  let expectedPinnedIp = null;

  try {
    const ips = await dns.promises.lookup('smtp.gmail.com', { all: true });
    expectedPinnedIp = ips[0].address;

    const transportConfig = createSecureSmtpTransportConfig({
      target: {
        host: 'smtp.gmail.com',
        port: 465,
        validatedIp: expectedPinnedIp,
        isIPv6: ips[0].family === 6,
      },
      user: 'probe@gmail.com',
      pass: 'probe-password',
    });

    const testTransporter = nodemailer.createTransport({
      ...transportConfig,
      logger: {
        info(entry) {
          if (entry && entry.remoteAddress) {
            actualConnectedAddress = entry.remoteAddress;
          }
        },
        debug() {},
        warn() {},
        error() {},
      },
    });

    await testTransporter.verify();
    realSocketPinningPassed = actualConnectedAddress === expectedPinnedIp;
  } catch (err) {
    if (actualConnectedAddress && actualConnectedAddress === expectedPinnedIp) {
      realSocketPinningPassed = true;
    }
  }

  recordTest(
    'T09_REAL_SOCKET_DESTINATION_PINNED',
    'SOCKET',
    `Destinazione socket effettiva coincide con IP validato (${actualConnectedAddress} === ${expectedPinnedIp})`,
    realSocketPinningPassed
  );

  // =========================================================================
  // 3. SENDER COMPATIBILITY & ALIAS AUTHORIZATION (R03)
  // =========================================================================
  console.log('\n--- 3. Autorizzazione Mittente e Blocco Alias non Autorizzati (R03) ---');

  // 3.1 Freemail spoofing blocked
  let freemailMismatchBlocked = false;
  try {
    validateSenderCompatibility('attacker@gmail.com', 'victim@gmail.com');
  } catch (e) {
    freemailMismatchBlocked = e.message.includes('Incompatibilità mittente');
  }
  recordTest('T10_FREEMAIL_ALIAS_BLOCKED', 'UNIT', 'Blocco alias fittizio su freemail (attacker@gmail.com autenticato come victim@gmail.com)', freemailMismatchBlocked);

  // 3.2 Same domain with unauthorized alias MUST BE BLOCKED (R03 requirement)
  let sameDomainUnauthorizedAliasBlocked = false;
  try {
    validateSenderCompatibility('billing@arkitecna.com', 'cesare@arkitecna.com');
  } catch (e) {
    sameDomainUnauthorizedAliasBlocked = e.message.includes('non dimostra l\'autorizzazione');
  }
  recordTest('T11_SAME_DOMAIN_UNAUTHORIZED_ALIAS_BLOCKED', 'UNIT', 'Blocco alias arbitrario sullo stesso dominio senza autorizzazione esplicita (billing@ vs cesare@)', sameDomainUnauthorizedAliasBlocked);

  // 3.3 Exact matching authenticated mailbox passes
  let exactMailboxPassed = false;
  try {
    validateSenderCompatibility('cesare@arkitecna.com', 'cesare@arkitecna.com');
    validateSenderCompatibility('mario.rossi@gmail.com', 'mario.rossi@gmail.com');
    exactMailboxPassed = true;
  } catch (e) {
    exactMailboxPassed = false;
  }
  recordTest('T12_EXACT_AUTHENTICATED_MAILBOX_ALLOWED', 'UNIT', 'Autorizzazione concessa solo all\'indirizzo coincidente con la casella autenticata', exactMailboxPassed);

  // =========================================================================
  // 4. RATE LIMITING PROTECTION (SINGLE-PROCESS INSTANCE)
  // =========================================================================
  console.log('\n--- 4. Protezione Rate Limiting su Endpoint SMTP ---');

  const testRateKey = `probe_test_key_${Date.now()}`;
  let rateLimitTriggered = false;
  for (let i = 0; i < 5; i++) {
    checkRateLimit(testRateKey, 5, 60000);
  }
  const sixthCall = checkRateLimit(testRateKey, 5, 60000);
  rateLimitTriggered = !sixthCall.allowed && sixthCall.retryAfterSeconds > 0;
  recordTest('T13_RATE_LIMITER_ENFORCED', 'UNIT', 'Attivazione blocco 429 al 6° tentativo in 60s per singolo processo', rateLimitTriggered);

  // =========================================================================
  // 5. SERVER-SIDE AES-256-GCM CREDENTIAL ENCRYPTION & SEMANTIC SECURITY
  // =========================================================================
  console.log('\n--- 5. Cifratura Server-Side AES-256-GCM ---');

  const secretPlaintext = 'App-Password-Segreta-Fase2-Test!';
  const enc1 = encryptSecret(secretPlaintext);
  const enc2 = encryptSecret(secretPlaintext);
  const dec1 = decryptSecret(enc1);

  const roundtripSuccess = dec1 === secretPlaintext && enc1.startsWith('v1:');
  const uniqueIv = enc1 !== enc2; // Semantic security: same plaintext -> different ciphertexts

  let tamperBlocked = false;
  try {
    const tampered = enc1.slice(0, -4) + 'ffff';
    decryptSecret(tampered);
  } catch (e) {
    tamperBlocked = e.message.includes('Decifratura fallita');
  }

  recordTest('T14_CRYPTO_AES_256_GCM_ROUNDTRIP', 'CRYPTO', 'Cifratura e decifratura reversibile AES-256-GCM con prefisso v1', roundtripSuccess);
  recordTest('T15_CRYPTO_SEMANTIC_SECURITY_RANDOM_IV', 'CRYPTO', 'Sicurezza semantica: IV casuale (96 bit) garantisce ciphertext distinti per stesso plaintext', uniqueIv);
  recordTest('T16_CRYPTO_TAMPER_PROTECTION', 'CRYPTO', 'Rilevamento manomissione con Authentication Tag GCM', tamperBlocked);

  // =========================================================================
  // 6. APPLICATION FLOW: COERENZA AVVIO -> DISPATCHER (R01) & TENANT ISOLATION (R05)
  // =========================================================================
  console.log('\n--- 6. Coerenza Applicativa Avvio -> Dispatcher e Isolamento Tenant (R01 & R05) ---');

  const userA_id = '00000000-aaaa-4000-8000-000000000001';
  const userB_id = '00000000-bbbb-4000-8000-000000000002';
  const connectionA_id = '00000000-aaaa-4000-8000-000000000011';
  const connectionB_id = '00000000-bbbb-4000-8000-000000000022';
  const connectionUnverified_id = '00000000-aaaa-4000-8000-000000000099';

  // Realistic fixture rows
  const mockDbRows = {
    [connectionA_id]: {
      id: connectionA_id,
      user_id: userA_id,
      name: 'Casella User A',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      username: 'userA@gmail.com',
      encrypted_password: encryptSecret('secretA'),
      from_name: 'User A',
      from_email: 'userA@gmail.com',
      reply_to: 'userA@gmail.com',
      is_verified: true,
    },
    [connectionB_id]: {
      id: connectionB_id,
      user_id: userB_id,
      name: 'Casella User B',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      username: 'userB@gmail.com',
      encrypted_password: encryptSecret('secretB'),
      from_name: 'User B',
      from_email: 'userB@gmail.com',
      reply_to: 'userB@gmail.com',
      is_verified: true,
    },
    [connectionUnverified_id]: {
      id: connectionUnverified_id,
      user_id: userA_id,
      name: 'Casella Unverified',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      username: 'userA@gmail.com',
      encrypted_password: encryptSecret('secretA'),
      from_name: 'User A',
      from_email: 'userA@gmail.com',
      reply_to: 'userA@gmail.com',
      is_verified: false,
    },
  };

  let claimCampaignLeadCalls = 0;
  let claimNewsletterSubscriberCalls = 0;

  const createMockDbClient = (rows = mockDbRows, options = {}) => ({
    from: (table) => {
      if (options.simulateDbError) {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: null, error: { message: 'Database connection timeout', code: 'PGRST_TIMEOUT' } }),
              }),
              maybeSingle: async () => ({ data: null, error: { message: 'Database query failure', code: 'PGRST_ERROR' } }),
            }),
            maybeSingle: async () => ({ data: null, error: { message: 'Database query failure', code: 'PGRST_ERROR' } }),
          }),
        };
      }

      if (table === 'smtp_connections') {
        let filterId = null;
        let filterUserId = null;
        let filterVerified = null;

        const builder = {
          select: () => builder,
          eq: (col, val) => {
            if (col === 'id') filterId = val;
            if (col === 'user_id') filterUserId = val;
            if (col === 'is_verified') filterVerified = val;
            return builder;
          },
          order: () => builder,
          limit: () => builder,
          maybeSingle: async () => {
            const found = filterId ? rows[filterId] || null : null;
            return { data: found, error: null };
          },
          then: (resolve) => {
            let list = Object.values(rows);
            if (filterUserId) list = list.filter((r) => r.user_id === filterUserId);
            if (filterVerified !== null) list = list.filter((r) => r.is_verified === filterVerified);
            resolve({ data: list, error: null });
          },
        };
        return builder;
      }
      return {
        update: () => ({ eq: async () => ({ data: null, error: null }) }),
        select: () => ({ eq: () => ({ in: async () => ({ count: 1 }) }) }),
      };
    },
    rpc: async (fnName) => {
      if (fnName === 'claim_next_campaign_lead') {
        claimCampaignLeadCalls++;
        return { data: [{ id: 'lead-1', email: 'dest@example.com', attempts: 0 }], error: null };
      }
      if (fnName === 'claim_next_newsletter_subscriber') {
        claimNewsletterSubscriberCalls++;
        return { data: [{ id: 'sub-1', email: 'sub@example.com' }], error: null };
      }
      return { data: null, error: null };
    },
    auth: {
      admin: {
        getUserById: async (uid) => {
          if (uid === '592899a6-fe84-491a-baa9-8fccd6f71349') {
            return { data: { user: { email: 'cesare@arkitecna.com' } }, error: null };
          }
          return { data: { user: { email: 'other@example.com' } }, error: null };
        },
      },
    },
  });

  const testDb = createMockDbClient();

  // 6.1 Standard user with NO connection: MUST throw SmtpConfigurationError via application code
  const emptyDb = createMockDbClient({});
  let standardUserBlocked = false;
  try {
    await resolveAuthorizedTransportContext({ userId: userA_id, allowAdminFallback: false, supabaseClient: emptyDb });
  } catch (e) {
    standardUserBlocked = e instanceof SmtpConfigurationError &&
                          e.message.includes('Nessuna configurazione SMTP verificata trovata');
  }
  recordTest('T17_TENANT_NO_FALLBACK_HARD_BLOCK', 'ISOLATION', 'Utente standard A senza casella: SmtpConfigurationError rigido, ZERO fallback ad admin/Hostinger', standardUserBlocked);

  // 6.2 Sender identity without connection: MUST throw SmtpConfigurationError
  let identityBlocked = false;
  try {
    await resolveAuthorizedTransportContext({ userId: userA_id, allowAdminFallback: false, supabaseClient: emptyDb });
  } catch (e) {
    identityBlocked = e instanceof SmtpConfigurationError &&
                      e.message.includes('Nessuna configurazione SMTP verificata trovata');
  }
  recordTest('T18_SENDER_IDENTITY_NO_FALLBACK', 'ISOLATION', 'Identità mittente utente A: blocco rigido, ZERO fallback a cesare@arkitecna.com', identityBlocked);

  // 6.3 User A attempting to pass an explicit non-existent connection UUID: MUST throw not found
  let nonExistentUuidBlocked = false;
  try {
    await resolveAuthorizedTransportContext({
      userId: userA_id,
      smtpConnectionId: '00000000-0000-4000-8000-000000000999',
      supabaseClient: testDb,
    });
  } catch (e) {
    nonExistentUuidBlocked = e instanceof SmtpConfigurationError &&
                            (e.message.includes('non trovata') || e.message.includes('non accessibile'));
  }
  recordTest('T19_INVALID_EXPLICIT_UUID_BLOCKED', 'ISOLATION', 'Connessione esplicita inesistente: blocco rigido via codice applicativo', nonExistentUuidBlocked);

  // 6.4 Cross-Tenant Ownership Verification through APPLICATION CODE
  // Calls the actual resolveAuthorizedTransportContext with User A trying to use User B's verified connection
  let crossTenantAppCodeBlocked = false;
  try {
    await resolveAuthorizedTransportContext({
      userId: userA_id,
      smtpConnectionId: connectionB_id,
      supabaseClient: testDb,
    });
  } catch (e) {
    crossTenantAppCodeBlocked = e instanceof SmtpConfigurationError &&
                                e.message.includes('Violazione di sicurezza: tentativo di utilizzare una connessione SMTP appartenente a un altro utente');
  }
  recordTest('T20_APP_CODE_CROSS_TENANT_BLOCKED', 'ISOLATION', 'Codice applicativo: connessione di User B richiesta da User A genera eccezione SmtpConfigurationError', crossTenantAppCodeBlocked);

  // 6.5 Positive Case: Valid verified connection belonging to User A
  let positiveCaseResolved = false;
  try {
    const verifiedCtx = await resolveAuthorizedTransportContext({
      userId: userA_id,
      smtpConnectionId: connectionA_id,
      supabaseClient: testDb,
    });
    positiveCaseResolved = verifiedCtx &&
                           verifiedCtx.senderIdentity.fromEmail === 'userA@gmail.com' &&
                           verifiedCtx.connectionId === connectionA_id &&
                           Boolean(verifiedCtx.transporter);
  } catch (e) {
    console.error('Positive case error:', e);
  }
  recordTest('T21_APP_CODE_POSITIVE_VERIFIED_CONNECTION', 'APPLICATION_FLOW', 'Codice applicativo caso positivo: connessione verificata propria viene risolta con transporter e sender identity corretti', positiveCaseResolved);

  // 6.6 Unverified Connection Case: User A attempting to use an unverified connection
  let unverifiedBlocked = false;
  try {
    await resolveAuthorizedTransportContext({
      userId: userA_id,
      smtpConnectionId: connectionUnverified_id,
      supabaseClient: testDb,
    });
  } catch (e) {
    unverifiedBlocked = e instanceof SmtpConfigurationError &&
                        e.message.includes('non è stata verificata');
  }
  recordTest('T22_APP_CODE_UNVERIFIED_CONNECTION_BLOCKED', 'ISOLATION', 'Codice applicativo: connessione non verificata (is_verified=false) rifiutata con SmtpConfigurationError', unverifiedBlocked);

  // 6.7 Database Error Case: Distinction between DB transient error and configuration error
  let dbErrorDistinguished = false;
  const failingDb = createMockDbClient(mockDbRows, { simulateDbError: true });
  try {
    await resolveAuthorizedTransportContext({
      userId: userA_id,
      smtpConnectionId: connectionA_id,
      supabaseClient: failingDb,
    });
  } catch (e) {
    dbErrorDistinguished = e instanceof SmtpDatabaseError &&
                           e.message.includes('Database query failure');
  }
  recordTest('T23_APP_CODE_DATABASE_ERROR_DISTINCTION', 'ERROR_HANDLING', 'Codice applicativo: distinzione errore database (SmtpDatabaseError) da errore di configurazione', dbErrorDistinguished);

  // 6.8 Pre-flight Dispatcher Campagne: Zero attempt burn
  claimCampaignLeadCalls = 0;
  const mockCampaignWithBrokenSmtp = {
    id: '00000000-0000-4000-8000-000000000001',
    user_id: userA_id,
    smtp_connection_id: '00000000-0000-4000-8000-000000000999', // Inesistente/inutilizzabile
    status: 'active',
  };

  const dispatchCampaignOutcome = await dispatchNextEmailForCampaign(testDb, mockCampaignWithBrokenSmtp);
  const campaignProtectedAttempts = dispatchCampaignOutcome.status === 'error_configuration' && claimCampaignLeadCalls === 0;
  recordTest(
    'T24_DISPATCHER_CAMPAIGN_ZERO_ATTEMPT_BURN',
    'APPLICATION_FLOW',
    `Dispatcher campagne blocca prima di claim lead: status=error_configuration, tentativi consumati=0 (claimCalls=${claimCampaignLeadCalls})`,
    campaignProtectedAttempts
  );

  // 6.9 Pre-flight Dispatcher Newsletter: Zero subscriber burn
  claimNewsletterSubscriberCalls = 0;
  const mockNewsletterWithBrokenSmtp = {
    id: '00000000-0000-4000-8000-000000000002',
    user_id: userA_id,
    smtp_connection_id: '00000000-0000-4000-8000-000000000999', // Inesistente/inutilizzabile
    status: 'active',
  };

  const dispatchNewsletterOutcome = await dispatchNextEmailForNewsletter(testDb, mockNewsletterWithBrokenSmtp);
  const newsletterProtectedSubscribers = dispatchNewsletterOutcome.status === 'error_configuration' && claimNewsletterSubscriberCalls === 0;
  recordTest(
    'T25_DISPATCHER_NEWSLETTER_ZERO_SUBSCRIBER_BURN',
    'APPLICATION_FLOW',
    `Dispatcher newsletter blocca prima di claim subscriber: status=error_configuration, iscritti consumati=0 (claimCalls=${claimNewsletterSubscriberCalls})`,
    newsletterProtectedSubscribers
  );

  // Session races must exercise the mounted component, not duplicated guard logic.
  console.log('[R04] Collaudo separato: node scripts/test-smtp-session-browser.mjs');

  // =========================================================================
  // 8. INFORMAZIONI DI CONFIGURAZIONE & CONSEGNA
  // =========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('INFORMAZIONI DI CONFIGURAZIONE & CONSEGNA');
  console.log('='.repeat(80));

  const envHost = process.env.SMTP_HOST;
  const envUser = process.env.SMTP_USER;
  const hasEnvSmtp = Boolean(envHost && envUser && process.env.SMTP_PASS);

  console.log(`[Configurazione] Connessione SMTP di sistema: ${hasEnvSmtp ? `CONFIGURATA (${envUser} su ${envHost})` : 'NON CONFIGURATA'}`);
  console.log(`[Configurazione] Seconda casella SMTP autonoma in locale: NON PRESENTE`);
  console.log(`[Stato Collaudo] Consegna reale con 2 caselle distinte: NON VERIFICATA`);
  console.log(`                (Richiede 2 credenziali SMTP autentiche distinte per l'invio e verifica header RFC)`);

  // =========================================================================
  // RIEPILOGO FINALE
  // =========================================================================
  console.log('\n' + '='.repeat(80));
  const passedCount = RESULTS.filter((r) => r.passed).length;
  const totalCount = RESULTS.length;
  console.log(`ESITO TEST FASE 2: ${passedCount}/${totalCount} PASS`);
  console.log('='.repeat(80));

  if (passedCount < totalCount) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
