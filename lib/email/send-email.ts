import { getSmtpTransporter, getSenderIdentity } from './transporter';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams) {
  const transporter = getSmtpTransporter();
  const { fromName, fromEmail, replyTo: defaultReplyTo } = await getSenderIdentity();

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
  };
}
