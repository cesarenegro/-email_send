import { renderTemplate } from '../lib/email/render-template';
import { normalizeEmail, validateAndDeduplicateLeads } from '../lib/csv/validate-lead';
import { computeNextSendTime, computeSubsequentSendTime } from '../lib/scheduling/next-send-time';
import { DateTime } from 'luxon';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- TEST 1: Template Rendering ---');
const renderedSubject = renderTemplate('Render per {{azienda}}', {
  company_name: 'Rossi Arredi',
  email: 'info@rossiarredi.it',
});
assert(renderedSubject === 'Render per Rossi Arredi', 'Placeholder {{azienda}} replaces properly');

const renderedBoth = renderTemplate('Gentile {{companyName}} <{{email}}>', {
  company_name: 'Rossi Arredi',
  email: 'info@rossiarredi.it',
});
assert(renderedBoth === 'Gentile Rossi Arredi <info@rossiarredi.it>', '{{companyName}} and {{email}} replace properly');

const renderedUserCase = renderTemplate('Hello {{NOME_AZIENDA}} team, contact {{EMAIL}}', {
  company_name: 'Acme Corp',
  email: 'contact@acme.com',
});
assert(
  renderedUserCase === 'Hello Acme Corp team, contact contact@acme.com',
  'Placeholder {{NOME_AZIENDA}} and {{EMAIL}} replace properly'
);

const renderedSpacedAndAliases = renderTemplate(
  'Buongiorno {{ nome_azienda }}, info at {{ mail }} or {{ company_name }}',
  { company_name: 'Delta SRL', email: 'info@delta.it' }
);
assert(
  renderedSpacedAndAliases === 'Buongiorno Delta SRL, info at info@delta.it or Delta SRL',
  'Spaced {{ nome_azienda }} and {{ mail }} replace properly'
);


console.log('--- TEST 2: Email Normalization ---');
const normalized = normalizeEmail('  INFO@ROSSI.IT  ');
assert(normalized === 'info@rossi.it', 'Trims and lowercases email');

console.log('--- TEST 3: Duplicate Handling in CSV ---');
const testRows = [
  { company_name: 'Rossi', email: 'info@rossi.it' },
  { company_name: 'Rossi Clone', email: '  INFO@ROSSI.IT ' },
  { company_name: 'Bianchi', email: 'info@bianchi.it' },
  { company_name: 'Invalid', email: 'bad-email' },
];
const result = validateAndDeduplicateLeads(testRows);
assert(result.valid.length === 2, 'Only 2 valid leads parsed (1 duplicate and 1 invalid skipped)');
assert(result.duplicates === 1, 'Exactly 1 duplicate detected');
assert(result.invalid.length === 1, 'Exactly 1 invalid email detected');

console.log('--- TEST 4: Schedule Next Time & Weekend Skip ---');
// Wednesday 17:58 + 4 min = 18:02 -> next day Thursday 09:00
const wednesdayEvening = DateTime.fromISO('2026-10-07T17:58:00', { zone: 'Europe/Rome' });
const nextSlotWed = computeSubsequentSendTime(wednesdayEvening.toJSDate(), {
  timezone: 'Europe/Rome',
  send_window_start: '09:00',
  send_window_end: '18:00',
  send_interval_seconds: 240, // 4 min
});
const dtWed = DateTime.fromISO(nextSlotWed).setZone('Europe/Rome');
assert(dtWed.weekday === 4, 'Wednesday after window boundary moves to Thursday (weekday 4)');
assert(dtWed.hour === 9 && dtWed.minute === 0, 'Moves to 09:00 start of window');

// Friday 17:58 + 4 min = 18:02 -> next weekday Monday 09:00
const fridayEvening = DateTime.fromISO('2026-10-09T17:58:00', { zone: 'Europe/Rome' });
const nextSlotFri = computeSubsequentSendTime(fridayEvening.toJSDate(), {
  timezone: 'Europe/Rome',
  send_window_start: '09:00',
  send_window_end: '18:00',
  send_interval_seconds: 240,
});
const dtFri = DateTime.fromISO(nextSlotFri).setZone('Europe/Rome');
assert(dtFri.weekday === 1, 'Friday after window boundary moves to Monday (weekday 1)');
assert(dtFri.hour === 9 && dtFri.minute === 0, 'Moves to Monday 09:00');

console.log('--- TEST 5: Verification of All 5 Requested Timezones ---');
const testZones = [
  { key: 'Europe/Rome', name: 'Roma' },
  { key: 'America/New_York', name: 'USA EST' },
  { key: 'America/Los_Angeles', name: 'USA WEST' },
  { key: 'Asia/Dubai', name: 'DUBAI' },
  { key: 'Asia/Makassar', name: 'ASIA WITA' },
];

for (const tz of testZones) {
  const localNow = DateTime.now().setZone(tz.key);
  assert(localNow.isValid, `Luxon timezone "${tz.key}" (${tz.name}) is valid`);
  
  // Test computation of next send slot inside window for that timezone
  const tuesdayMorning = DateTime.fromISO('2026-10-06T10:30:00', { zone: tz.key });
  const nextSlot = computeNextSendTime(tuesdayMorning, {
    timezone: tz.key,
    send_window_start: '09:00',
    send_window_end: '18:00',
  });
  const localSlot = nextSlot.setZone(tz.key);
  assert(localSlot.hour === 10 && localSlot.minute === 30, `${tz.name} preserves in-window slot`);

  // Test subsequent slot calculation (e.g. 240s = 4 min)
  const subsequent = computeSubsequentSendTime(tuesdayMorning.toJSDate(), {
    timezone: tz.key,
    send_window_start: '09:00',
    send_window_end: '18:00',
    send_interval_seconds: 240,
  });
  const subDt = DateTime.fromISO(subsequent).setZone(tz.key);
  assert(subDt.hour === 10 && subDt.minute === 34, `${tz.name} adds interval correctly in local timezone`);
}

console.log('\n🎉 ALL CORE BUSINESS LOGIC TESTS PASSED SUCCESSFULLY!');

