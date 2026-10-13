import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM recommended by NIST
const AUTH_TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Derives a 256-bit symmetric encryption key from server environment secrets.
 */
function getDerivedKey(): Buffer {
  const secret = process.env.SMTP_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      'Chiave di cifratura non configurata sul server (richiesto SMTP_ENCRYPTION_KEY o SUPABASE_SERVICE_ROLE_KEY).'
    );
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a random IV.
 * Returns a serialized string format: "v1:<hex_iv>:<hex_tag>:<hex_ciphertext>"
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Il valore da cifrare deve essere una stringa non vuota.');
  }

  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a previously encrypted secret string format: "v1:<hex_iv>:<hex_tag>:<hex_ciphertext>"
 */
export function decryptSecret(payload: string): string {
  if (!payload || typeof payload !== 'string') {
    throw new Error('Payload di cifratura non valido.');
  }

  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Formato cifratura non supportato o corrotto.');
  }

  const [, ivHex, tagHex, dataHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(dataHex, 'hex');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Parametri di cifratura (IV o auth tag) non validi.');
  }

  const key = getDerivedKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch (err: any) {
    throw new Error('Decifratura fallita: integrità del segreto compromessa o chiave errata.');
  }
}
