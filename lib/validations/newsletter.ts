import { z } from 'zod';
import { DateTime } from 'luxon';

export const NewsletterSchema = z.object({
  title: z.string().min(1, 'Il titolo della newsletter è obbligatorio'),
  subject: z.string().min(1, "L'oggetto dell'email è obbligatorio"),
  html_content: z
    .string()
    .default('')
    .refine(
      (content) => !/data:image\/[a-zA-Z+]+;base64,/i.test(content),
      {
        message: 'Non è consentito salvare immagini Base64. Convertile in immagini caricate su storage prima del salvataggio.',
      }
    ),
  timezone: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== '' ? val : 'Europe/Rome'))
    .refine((tz) => DateTime.now().setZone(tz).isValid, {
      message: 'Fuso orario non valido',
    })
    .default('Europe/Rome'),
  scheduled_at: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== '' ? val : null)),
  send_interval_seconds: z.coerce.number().min(30, "L'intervallo minimo è 30 secondi").default(60),
  smtp_connection_id: z.string().uuid('ID connessione SMTP non valido').nullish(),
});

export type NewsletterInput = z.infer<typeof NewsletterSchema>;
