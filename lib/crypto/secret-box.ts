/**
 * MAIL-K — Cifratura dei segreti a riposo (AES-256-GCM).
 * Copia adattata di K-CRM `src/adapters/providers/secret-box.ts` (stessa chiave dell'ecosistema).
 *
 * Usata per: password SMTP e IMAP per organizzazione (`mail_sender_settings.*_ciphertext`).
 *
 * Chiave: `KCRM_SECRET_ENCRYPTION_KEY` (32 byte in base64 o 64 caratteri esadecimali).
 * Formato: `v1.<iv>.<tag>.<ciphertext>` in base64url. `key_version` = 1.
 * In produzione la chiave è obbligatoria (errore se assente);
 * fuori produzione, se manca, viene derivata da una costante di sviluppo e segnalata.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export interface SecretBox {
  readonly keyVersion: number;
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
  /** Ultime 4 cifre in chiaro, per mostrare "••••abcd" senza decifrare. */
  last4(plaintext: string): string;
}

export class SecretBoxError extends Error {
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'SecretBoxError';
  }
}

const DEV_FALLBACK_SEED = 'kcrm-dev-insecure-secret-box-seed';

function parseKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, 'hex');
  const b64 = Buffer.from(trimmed, 'base64');
  if (b64.length === 32) return b64;
  throw new SecretBoxError('KCRM_SECRET_ENCRYPTION_KEY non valida: servono 32 byte (base64 o hex).');
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

export function createSecretBox(key: Buffer, keyVersion = 1): SecretBox {
  if (key.length !== 32) {
    throw new SecretBoxError('Chiave di cifratura non valida.');
  }
  return {
    keyVersion,
    encrypt(plaintext: string): string {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return `v${keyVersion}.${b64url(iv)}.${b64url(tag)}.${b64url(ct)}`;
    },
    decrypt(ciphertext: string): string {
      const parts = String(ciphertext ?? '').split('.');
      if (parts.length !== 4 || parts[0] !== `v${keyVersion}`) {
        throw new SecretBoxError('Segreto cifrato con una versione di chiave non disponibile.', {
          key_version: parts[0],
        });
      }
      const [, ivB, tagB, ctB] = parts;
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB, 'base64url'));
      decipher.setAuthTag(Buffer.from(tagB, 'base64url'));
      try {
        return Buffer.concat([decipher.update(Buffer.from(ctB, 'base64url')), decipher.final()]).toString('utf8');
      } catch {
        throw new SecretBoxError('Impossibile decifrare il segreto (chiave errata o dato corrotto).');
      }
    },
    last4(plaintext: string): string {
      const s = String(plaintext ?? '');
      return s.slice(-4);
    },
  };
}

let cachedDefault: SecretBox | null = null;
let warnedDevKey = false;

function isProductionRuntime(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production';
}

/** Scatola predefinita dall'ambiente. Fuori produzione, senza chiave, usa un seme di sviluppo. */
export function getDefaultSecretBox(env: NodeJS.ProcessEnv = process.env): SecretBox {
  if (cachedDefault) return cachedDefault;
  const raw = env.KCRM_SECRET_ENCRYPTION_KEY?.trim();
  if (raw) {
    cachedDefault = createSecretBox(parseKey(raw));
    return cachedDefault;
  }
  if (isProductionRuntime(env)) {
    throw new SecretBoxError('KCRM_SECRET_ENCRYPTION_KEY assente: segreti non cifrabili in produzione.', {
      missing: ['KCRM_SECRET_ENCRYPTION_KEY'],
    });
  }
  if (!warnedDevKey) {
    warnedDevKey = true;
    console.warn('[MAIL-K] KCRM_SECRET_ENCRYPTION_KEY assente: chiave di sviluppo derivata da una costante (solo locale).');
  }
  cachedDefault = createSecretBox(createHash('sha256').update(DEV_FALLBACK_SEED).digest());
  return cachedDefault;
}

/** Solo per i test: azzera la cache del box predefinito. */
export function resetDefaultSecretBoxForTests(): void {
  cachedDefault = null;
}
