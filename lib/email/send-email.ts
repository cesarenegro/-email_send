import { resolveAuthorizedTransportContext, ResolvedTransportContext } from './transporter';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  userId?: string | null;
  smtpConnectionId?: string | null;
  allowAdminFallback?: boolean;
  transportContext?: ResolvedTransportContext;
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
  userId,
  smtpConnectionId,
  allowAdminFallback,
  transportContext,
}: SendEmailParams) {
  // 1. Obtain verified transporter and sender identity from pre-verified context or atomic resolution
  const { transporter, senderIdentity } = transportContext || await resolveAuthorizedTransportContext({
    userId,
    smtpConnectionId,
    allowAdminFallback,
  });

  const { fromName, fromEmail, replyTo: defaultReplyTo } = senderIdentity;

  // 2. Dispatch email with verified From strictly bound to the authorized transport
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
