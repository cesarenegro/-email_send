import { resolveOrganizationTransport, type ResolvedTransportContext } from './transporter';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  organizationId: string;
  transportContext?: ResolvedTransportContext;
}

/**
 * Invia una email con la casella SMTP verificata dell'organizzazione.
 * Il From è sempre l'identità mittente salvata nelle impostazioni: mai quella dell'utente.
 */
export async function sendEmail({ to, subject, html, replyTo, organizationId, transportContext }: SendEmailParams) {
  const { transporter, senderIdentity } = transportContext || (await resolveOrganizationTransport(organizationId));
  const { fromName, fromEmail, replyTo: defaultReplyTo } = senderIdentity;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    replyTo: replyTo || defaultReplyTo || fromEmail,
    to,
    subject,
    html,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    fromEmail,
  };
}
