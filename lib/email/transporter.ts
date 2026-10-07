import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function getSenderIdentity() {
  try {
    const supabase = createAdminClient();
    const { data: rows } = await supabase.from('app_settings').select('key, value');
    if (rows && rows.length > 0) {
      const map: Record<string, string> = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
      return {
        fromName: map.from_name || process.env.SMTP_FROM_NAME || 'Stefano Martini | ARKITECNA',
        fromEmail: map.from_email || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'info@arkitecna.com',
        replyTo: map.reply_to || process.env.SMTP_REPLY_TO || map.from_email || process.env.SMTP_FROM_EMAIL || 'info@arkitecna.com',
      };
    }
  } catch (err) {
    console.error('Error fetching sender identity from app_settings:', err);
  }

  return {
    fromName: process.env.SMTP_FROM_NAME || 'Stefano Martini | ARKITECNA',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'info@arkitecna.com',
    replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'info@arkitecna.com',
  };
}
