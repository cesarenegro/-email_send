import { z } from 'zod';

export const CampaignSchema = z.object({
  name: z.string().min(1, 'Il nome della campagna è obbligatorio'),
  subject_template: z.string().default(''),
  html_template: z.string().default(''),
  timezone: z.string().default('Europe/Rome'),
  start_at: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== '' ? val : null)),
  send_window_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato ora non valido (HH:mm)').default('09:00'),
  send_window_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato ora non valido (HH:mm)').default('18:00'),
  send_interval_seconds: z.coerce.number().min(60, "L'intervallo minimo è 60 secondi").default(240),
  daily_limit: z.coerce.number().min(1, 'Il limite giornaliero deve essere maggiore di 0').default(80),
});

export type CampaignInput = z.infer<typeof CampaignSchema>;
