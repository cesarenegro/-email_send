import nodemailer from 'nodemailer';

export function getSmtpTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = Number(process.env.SMTP_PORT || '465');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    throw new Error('SMTP credentials are not configured in environment variables');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    // Safe timeout limits
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}

export function getSenderIdentity() {
  return {
    fromName: process.env.SMTP_FROM_NAME || 'Stefano Martini | ARKITECNA',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'cesare@arkitecna.com',
  };
}
