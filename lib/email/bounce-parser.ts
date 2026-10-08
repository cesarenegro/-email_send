/**
 * Parser for Delivery Status Notifications (DSN) and Bounce emails.
 * Handles MailChannels, Postfix, Exim, Microsoft 365, and RFC 3464 structures.
 */

export interface ParsedBounce {
  email: string;
  reason: string;
  diagnosticCode?: string;
}

export function parseBounceContent(content: string): ParsedBounce | null {
  if (!content) return null;

  // 1. RFC 3464 / Standard Delivery-Status format
  // Final-Recipient: rfc822; user@example.com
  const finalRecipMatch = content.match(/Final-Recipient:\s*(?:rfc822;)?\s*<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i);
  const diagMatch = content.match(/Diagnostic-Code:\s*(?:smtp;)?\s*([^\r\n]+(?:\r?\n[ \t]+[^\r\n]+)*)/i);

  if (finalRecipMatch) {
    const email = finalRecipMatch[1].trim().toLowerCase();
    const reason = diagMatch
      ? diagMatch[1].replace(/\r?\n[ \t]+/g, ' ').trim()
      : '550 Delivery failed (DSN)';
    return {
      email,
      reason,
      diagnosticCode: diagMatch ? diagMatch[1].trim() : undefined,
    };
  }

  // 2. MailChannels / Postfix style:
  // <user@example.com>: host mx.example.com[...] said: 550 5.1.1 ...
  const postfixMatch = content.match(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>:\s*(?:host\s+[^:\r\n]+said:\s*)?([45]\d\d\s+[^\r\n]+(?:\r?\n[ \t]+[^\r\n]+)*)/i);
  if (postfixMatch) {
    const email = postfixMatch[1].trim().toLowerCase();
    const reason = postfixMatch[2].replace(/\r?\n[ \t]+/g, ' ').trim();
    return {
      email,
      reason,
      diagnosticCode: reason,
    };
  }

  // 3. Microsoft Office 365 style:
  // Your message to user@example.com couldn't be delivered.
  // The group / user ... Sender not allowed
  const msMatch = content.match(/Your message to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+couldn't be delivered\.?([\s\S]{0,300}?(?:Sender not allowed|User unknown|mailbox unavailable|Hop count exceeded|550[^\r\n]*))/i);
  if (msMatch) {
    const email = msMatch[1].trim().toLowerCase();
    const reasonDetail = msMatch[2] ? msMatch[2].replace(/\s+/g, ' ').trim() : "Couldn't be delivered";
    return {
      email,
      reason: `Office 365: ${reasonDetail.slice(0, 150)}`,
    };
  }

  // 4. Fallback: look for an email address followed by 5xx or rejection keywords
  const genericMatch = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})[\s\S]{1,150}?([45]\d\d[\s\S]{1,250}?(?:User unknown|Recipient address rejected|does not exist|mailbox unavailable|Relay access denied|No such user|Sender not allowed))/i);
  if (genericMatch) {
    const email = genericMatch[1].trim().toLowerCase();
    const reason = genericMatch[2].replace(/\s+/g, ' ').trim();
    return {
      email,
      reason,
    };
  }

  return null;
}
