export interface TimezoneOption {
  value: string; // IANA identifier
  label: string; // UI dropdown label
  shortLabel: string;
  region: string;
  utcOffset: string;
  description: string;
}

export const SUPPORTED_TIMEZONES: TimezoneOption[] = [
  {
    value: 'Europe/Rome',
    label: 'Roma — CET/CEST (Italia)',
    shortLabel: 'Roma (CET/CEST)',
    region: 'Europa',
    utcOffset: 'UTC+1 / UTC+2',
    description: 'Fuso orario italiano standard (Europe/Rome)',
  },
  {
    value: 'America/New_York',
    label: 'USA EST — Eastern Time (New York, Miami, Atlanta)',
    shortLabel: 'USA EST',
    region: 'USA East',
    utcOffset: 'UTC-5 / UTC-4',
    description: 'Costa Orientale USA (America/New_York)',
  },
  {
    value: 'America/Los_Angeles',
    label: 'USA WEST — Pacific Time (Los Angeles, San Francisco, Seattle)',
    shortLabel: 'USA WEST',
    region: 'USA West',
    utcOffset: 'UTC-8 / UTC-7',
    description: 'Costa Occidentale USA (America/Los_Angeles)',
  },
  {
    value: 'Asia/Dubai',
    label: 'DUBAI — Gulf Standard Time (Emirati Arabi Uniti)',
    shortLabel: 'DUBAI (GST)',
    region: 'Medio Oriente',
    utcOffset: 'UTC+4',
    description: 'Emirati Arabi / Golfo (Asia/Dubai)',
  },
  {
    value: 'Asia/Makassar',
    label: 'ASIA WITA — Waktu Indonesia Tengah (Bali, Makassar, UTC+8)',
    shortLabel: 'ASIA WITA (UTC+8)',
    region: 'Asia',
    utcOffset: 'UTC+8',
    description: 'Indonesia Centrale / WITA / Bali (Asia/Makassar)',
  },
];

export const DEFAULT_TIMEZONE = 'Europe/Rome';

export function getTimezoneConfig(zoneValue?: string): TimezoneOption {
  const match = SUPPORTED_TIMEZONES.find((tz) => tz.value === zoneValue);
  if (match) return match;

  return {
    value: zoneValue || DEFAULT_TIMEZONE,
    label: zoneValue || DEFAULT_TIMEZONE,
    shortLabel: zoneValue || DEFAULT_TIMEZONE,
    region: 'Personalizzato',
    utcOffset: '',
    description: zoneValue || DEFAULT_TIMEZONE,
  };
}
