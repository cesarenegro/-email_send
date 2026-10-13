import net from 'net';
import dns from 'dns';

export const ALLOWED_SMTP_PORTS = [25, 465, 587, 2525] as const;

/**
 * Parses an IPv4 address string into a 32-bit unsigned integer.
 * Returns null if the format is invalid.
 */
export function parseIpv4ToLong(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  const nums: number[] = [];
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = parseInt(p, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    nums.push(n);
  }
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

/**
 * Evaluates whether a 32-bit unsigned IPv4 integer falls in private, loopback, or reserved CIDR ranges.
 */
export function isPrivateOrReservedIpv4Numeric(ipLong: number): boolean {
  const inRange = (netVal: number, maskVal: number) => (ipLong & maskVal) === (netVal & maskVal);

  if (inRange(0x00000000, 0xff000000)) return true; // 0.0.0.0/8 (Current network)
  if (inRange(0x0a000000, 0xff000000)) return true; // 10.0.0.0/8 (RFC 1918 Private)
  if (inRange(0x64400000, 0xffc00000)) return true; // 100.64.0.0/10 (Shared Carrier-Grade NAT)
  if (inRange(0x7f000000, 0xff000000)) return true; // 127.0.0.0/8 (Loopback)
  if (inRange(0xa9fe0000, 0xffff0000)) return true; // 169.254.0.0/16 (Link-Local, AWS/GCP/Azure Metadata 169.254.169.254)
  if (inRange(0xac100000, 0xfff00000)) return true; // 172.16.0.0/12 (RFC 1918 Private)
  if (inRange(0xc0000000, 0xffffff00)) return true; // 192.0.0.0/24 (IETF Protocol Assignments)
  if (inRange(0xc0000200, 0xffffff00)) return true; // 192.0.2.0/24 (TEST-NET-1 Documentation)
  if (inRange(0xc0586300, 0xffffff00)) return true; // 192.88.99.0/24 (6to4 Anycast Relay)
  if (inRange(0xc0a80000, 0xffff0000)) return true; // 192.168.0.0/16 (RFC 1918 Private)
  if (inRange(0xc6120000, 0xfffe0000)) return true; // 198.18.0.0/15 (Benchmarking)
  if (inRange(0xc6336400, 0xffffff00)) return true; // 198.51.100.0/24 (TEST-NET-2 Documentation)
  if (inRange(0xcb007100, 0xffffff00)) return true; // 203.0.113.0/24 (TEST-NET-3 Documentation)
  if ((ipLong >>> 28) === 14) return true;          // 224.0.0.0/4 (Multicast)
  if ((ipLong >>> 28) === 15) return true;          // 240.0.0.0/4 (Reserved)
  if (ipLong === 0xffffffff) return true;           // 255.255.255.255 (Limited Broadcast)
  return false;
}

/**
 * Parses any valid IPv6 address string into a 128-bit BigInt.
 * Robustly normalizes full, compressed (::), and embedded IPv4 formats.
 * Returns null if the format is invalid.
 */
export function parseIpv6ToBigInt(ip: string): bigint | null {
  let str = ip.trim().toLowerCase();

  // If the IPv6 ends with dotted-quad IPv4, convert to hex words
  const lastColon = str.lastIndexOf(':');
  if (lastColon !== -1) {
    const tail = str.slice(lastColon + 1);
    if (tail.includes('.')) {
      const v4Long = parseIpv4ToLong(tail);
      if (v4Long === null) return null;
      const hex1 = (v4Long >>> 16).toString(16);
      const hex2 = (v4Long & 0xffff).toString(16);
      str = str.slice(0, lastColon + 1) + hex1 + ':' + hex2;
    }
  }

  // Handle :: compression
  const doubleColonIdx = str.indexOf('::');
  let words: string[] = [];
  if (doubleColonIdx !== -1) {
    if (str.indexOf('::', doubleColonIdx + 2) !== -1) return null; // Multiple :: illegal
    const leftStr = str.slice(0, doubleColonIdx);
    const rightStr = str.slice(doubleColonIdx + 2);
    const leftWords = leftStr ? leftStr.split(':') : [];
    const rightWords = rightStr ? rightStr.split(':') : [];
    const zeroCount = 8 - (leftWords.length + rightWords.length);
    if (zeroCount < 0) return null;
    words = [...leftWords, ...Array(zeroCount).fill('0'), ...rightWords];
  } else {
    words = str.split(':');
  }

  if (words.length !== 8) return null;

  let val = BigInt(0);
  for (const w of words) {
    if (!/^[0-9a-f]{1,4}$/.test(w)) return null;
    val = (val << BigInt(16)) | BigInt(parseInt(w, 16));
  }
  return val;
}

/**
 * Evaluates whether a 128-bit unsigned IPv6 BigInt falls in private, loopback, or reserved ranges.
 */
export function isPrivateOrReservedIpv6Numeric(val: bigint): boolean {
  if (val === BigInt(0)) return true; // :: (unspecified)
  if (val === BigInt(1)) return true; // ::1 or 0:0:0:0:0:0:0:1 (loopback)

  // IPv4-mapped (::ffff:0:0/96, e.g. ::ffff:7f00:1, ::ffff:a9fe:a9fe, 0:0:0:0:0:ffff:7f00:1)
  if ((val >> BigInt(32)) === BigInt(0xffff)) {
    const ipv4Long = Number(val & BigInt(0xffffffff)) >>> 0;
    return isPrivateOrReservedIpv4Numeric(ipv4Long);
  }

  // IPv4-compatible (::0:0/96, deprecated)
  if ((val >> BigInt(32)) === BigInt(0) && val > BigInt(1)) {
    const ipv4Long = Number(val & BigInt(0xffffffff)) >>> 0;
    return isPrivateOrReservedIpv4Numeric(ipv4Long);
  }

  // 6to4 (2002::/16) -> bits 16..47 contain embedded IPv4
  if ((val >> BigInt(112)) === BigInt(0x2002)) {
    const ipv4Long = Number((val >> BigInt(80)) & BigInt(0xffffffff)) >>> 0;
    return isPrivateOrReservedIpv4Numeric(ipv4Long);
  }

  // Unique Local Address ULA (fc00::/7 -> fc00:: through fdff::)
  if ((val >> BigInt(121)) === BigInt(0x7e)) return true;

  // Link-Local Unicast (fe80::/10 -> fe80:: through febf::)
  if ((val >> BigInt(118)) === BigInt(0x3fa)) return true;

  // Multicast (ff00::/8)
  if ((val >> BigInt(120)) === BigInt(0xff)) return true;

  // Documentation (2001:db8::/32)
  if ((val >> BigInt(96)) === BigInt(0x20010db8)) return true;

  // Discard prefix (100::/64)
  if ((val >> BigInt(64)) === BigInt('0x1000000000000')) return true;

  return false;
}

/**
 * Universal IP safety checker with complete numeric evaluation.
 * Returns true if the IP is private, loopback, link-local, cloud metadata, multicast, or invalid.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const v4Long = parseIpv4ToLong(ip);
  if (v4Long !== null) {
    return isPrivateOrReservedIpv4Numeric(v4Long);
  }

  const v6Val = parseIpv6ToBigInt(ip);
  if (v6Val !== null) {
    return isPrivateOrReservedIpv6Numeric(v6Val);
  }

  // If string cannot be parsed as valid IPv4 or IPv6, treat as unsafe
  return true;
}

export interface ValidatedSmtpTarget {
  host: string;
  port: number;
  validatedIp: string;
  isIPv6: boolean;
}

/**
 * Resolves a hostname, verifies that every resolved IP is public,
 * and returns the validated target for direct socket pinning.
 */
export async function validateSmtpHostAndPort(
  rawHost: string,
  rawPort: number
): Promise<ValidatedSmtpTarget> {
  const host = rawHost.trim().toLowerCase();
  const port = Number(rawPort);

  // 1. Port Allowlist Check
  if (!ALLOWED_SMTP_PORTS.includes(port as any)) {
    throw new Error(
      `Porta ${port} non consentita. Per motivi di sicurezza sono ammesse esclusivamente le porte SMTP standard (25, 465, 587, 2525).`
    );
  }

  // 2. Reject obvious internal/local domain names
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localdomain') ||
    host.includes('metadata.google') ||
    host === '169.254.169.254'
  ) {
    throw new Error(`Host "${rawHost}" non consentito: destinazione locale o riservata.`);
  }

  // 3. If host is already an IP address
  const v4Long = parseIpv4ToLong(host);
  if (v4Long !== null) {
    if (isPrivateOrReservedIpv4Numeric(v4Long)) {
      throw new Error(`Indirizzo IP "${rawHost}" non consentito: indirizzo privato, di loopback o riservato.`);
    }
    return {
      host,
      port,
      validatedIp: host,
      isIPv6: false,
    };
  }

  const v6Val = parseIpv6ToBigInt(host);
  if (v6Val !== null) {
    if (isPrivateOrReservedIpv6Numeric(v6Val)) {
      throw new Error(`Indirizzo IP "${rawHost}" non consentito: indirizzo privato, di loopback o riservato.`);
    }
    return {
      host,
      port,
      validatedIp: host,
      isIPv6: true,
    };
  }

  // 4. DNS Resolution Check with complete inspection of all returned addresses
  let resolvedAddresses: dns.LookupAddress[] = [];
  try {
    resolvedAddresses = await dns.promises.lookup(host, { all: true });
  } catch (lookupErr: any) {
    throw new Error(`Impossibile risolvere il nome host "${rawHost}": ${lookupErr.message}`);
  }

  if (!resolvedAddresses || resolvedAddresses.length === 0) {
    throw new Error(`Nessun indirizzo IP associato all'host "${rawHost}".`);
  }

  // Check every single resolved IP: if any resolved address is unsafe, reject the entire hostname
  for (const addr of resolvedAddresses) {
    if (isPrivateOrReservedIp(addr.address)) {
      throw new Error(
        `Host "${rawHost}" risolto verso un indirizzo IP non consentito (${addr.address}). Connessione bloccata per protezione SSRF.`
      );
    }
  }

  // Pin to the first validated IP
  const primary = resolvedAddresses[0];

  return {
    host,
    port,
    validatedIp: primary.address,
    isIPv6: primary.family === 6,
  };
}

/**
 * Creates Nodemailer transport configuration with direct socket IP pinning.
 * Pinning the socket to target.validatedIp guarantees that Nodemailer never re-resolves DNS,
 * completely preventing DNS rebinding attacks while enforcing TLS SNI and certificate validation.
 */
export function createSecureSmtpTransportConfig({
  target,
  user,
  pass,
}: {
  target: ValidatedSmtpTarget;
  user: string;
  pass: string;
}) {
  const isDirectSsl = target.port === 465;

  return {
    // Connect directly to the validated IP to defeat DNS rebinding (isIP(host) === true in Nodemailer)
    host: target.validatedIp,
    port: target.port,
    secure: isDirectSsl,
    // Original hostname for TLS SNI and server certificate verification
    servername: target.host,
    name: target.host,
    requireTLS: !isDirectSsl,
    tls: {
      servername: target.host,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
    auth: {
      user,
      pass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  };
}

/**
 * Validates that an outbound sender identity (From) is authorized and strictly compatible
 * with the authenticated SMTP mailbox credentials.
 */
export function validateSenderCompatibility(fromEmail: string, username: string): void {
  const cleanFrom = fromEmail.trim().toLowerCase();
  const cleanUser = username.trim().toLowerCase();

  const fromParts = cleanFrom.split('@');
  if (fromParts.length !== 2 || !fromParts[0] || !fromParts[1]) {
    throw new Error('Indirizzo mittente (From) non valido.');
  }
  const fromDomain = fromParts[1];

  const FREEMAIL_DOMAINS = [
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.it', 'outlook.com',
    'hotmail.com', 'hotmail.it', 'live.com', 'icloud.com', 'me.com',
    'libero.it', 'virgilio.it', 'alice.it', 'tin.it', 'tiscali.it'
  ];

  // 1. For an ordinary mailbox where username is an email address:
  // The authenticated mailbox address is the authoritative reference.
  // Mere domain matching does NOT prove the right to use an alias.
  if (cleanUser.includes('@')) {
    if (cleanFrom !== cleanUser) {
      throw new Error(
        `Incompatibilità mittente: per la casella ordinaria l'indirizzo mittente (${cleanFrom}) ` +
        `deve coincidere con la casella autenticata (${cleanUser}). ` +
        `La corrispondenza del solo dominio non dimostra l'autorizzazione all'uso di un alias.`
      );
    }
    return;
  }

  // 2. If username is an API key (e.g. "apikey" or "access_key_id")
  // Still disallow pretending to send as a public freemail address
  if (FREEMAIL_DOMAINS.includes(fromDomain)) {
    throw new Error(
      `Non è consentito utilizzare un indirizzo pubblico (@${fromDomain}) tramite credenziali generiche.`
    );
  }
}
