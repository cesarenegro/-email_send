import { z } from 'zod';
import { DateTime } from 'luxon';

export const NewsletterSchema = z.object({
  title: z.string().min(1, 'Il titolo della newsletter è obbligatorio'),
  subject: z.string().min(1, "L'oggetto dell'email è obbligatorio"),
  html_content: z.string().default(''),
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
});

export type NewsletterInput = z.infer<typeof NewsletterSchema>;
