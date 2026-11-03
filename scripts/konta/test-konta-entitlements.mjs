/**
 * MAIL-K — Account KONTA unico: stessi test di K-CRM (test/konta-entitlements.test.mjs) sulle copie
 * allineate in lib/konta/entitlements.ts e lib/supabase/cookie-options.ts, più il menu visto da Mail-K.
 * Uso: node --test scripts/konta/test-konta-entitlements.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  KONTA_STATE_RANK,
  buildKontaAppLinks,
  daysUntil,
  decideCrmRoute,
  isKontaStateOperational,
  parseKontaEntitlements,
} from '../../lib/konta/entitlements.ts';
import { readSharedCookieDomain, sharedSessionCookieOptions } from '../../lib/supabase/cookie-options.ts';

const sample = (overrides = {}) => ({
  user_id: '11111111-1111-4111-8111-111111111111',
  email: 'owner-a@test.local',
  evaluated_at: '2026-11-04T10:00:00Z',
  products: {
    light: { state: 'active', organizations: [] },
    pro: { state: 'trial_active', organizations: [{ organization_id: 'p1', name: 'Alfa PRO', role: 'owner', state: 'trial_active', plan: 'trial', trial_expires_at: '2026-11-20T00:00:00Z', subscription_status: null, subscription_plan_id: null, billing_cycle: null, current_period_end: null, cancel_at_period_end: false }] },
    kcrm: { state: 'active', organizations: [{ organization_id: 'c1', name: 'Alfa Impianti Srl', role: 'O', state: 'active', valid_until: null, source: 'manual_lifetime' }] },
    mailk: { state: 'non_activated', organizations: [] },
    ...overrides,
  },
});

describe('parseKontaEntitlements', () => {
  it('accetta la forma del contratto e rifiuta payload incompleti o con stati sconosciuti', () => {
    assert.ok(parseKontaEntitlements(sample()));
    assert.equal(parseKontaEntitlements(null), null);
    assert.equal(parseKontaEntitlements({ user_id: 'x' }), null);
    assert.equal(parseKontaEntitlements(sample({ mailk: { state: 'gold', organizations: [] } })), null);
    assert.equal(parseKontaEntitlements(sample({ kcrm: { state: 'active' } })), null);
  });
});

describe('ordine degli stati e instradamento', () => {
  it('l\'ordine coincide con konta_state_rank in SQL', () => {
    assert.ok(KONTA_STATE_RANK.active < KONTA_STATE_RANK.trial_active);
    assert.ok(KONTA_STATE_RANK.trial_active < KONTA_STATE_RANK.cancel_scheduled);
    assert.ok(KONTA_STATE_RANK.non_activated < KONTA_STATE_RANK.expired);
    assert.ok(KONTA_STATE_RANK.security_hold < KONTA_STATE_RANK.revoked);
  });

  it('decideCrmRoute: onboarding senza aziende, entra se operativo, sola lettura altrimenti, revoked nega', () => {
    assert.deepEqual(decideCrmRoute({ state: 'non_activated', organizations: [] }), { kind: 'onboarding' });
    const org = { organization_id: 'c1', name: 'A', role: 'O', state: 'active', valid_until: null, source: null };
    assert.deepEqual(decideCrmRoute({ state: 'active', organizations: [org] }), { kind: 'enter' });
    assert.deepEqual(decideCrmRoute({ state: 'trial_active', organizations: [org] }), { kind: 'enter' });
    assert.deepEqual(decideCrmRoute({ state: 'expired', organizations: [org] }), { kind: 'enter_read_only', state: 'expired' });
    assert.deepEqual(decideCrmRoute({ state: 'past_due', organizations: [org] }), { kind: 'enter_read_only', state: 'past_due' });
    assert.deepEqual(decideCrmRoute({ state: 'revoked', organizations: [org] }), { kind: 'denied', state: 'revoked' });
    assert.equal(isKontaStateOperational('cancel_scheduled'), true);
    assert.equal(isKontaStateOperational('suspended'), false);
  });

  it('daysUntil arrotonda per eccesso e tollera date assenti o non valide', () => {
    const now = new Date('2026-11-04T10:00:00Z');
    assert.equal(daysUntil('2026-11-18T09:00:00Z', now), 14);
    assert.equal(daysUntil('2026-11-03T10:00:00Z', now), -1);
    assert.equal(daysUntil(null, now), null);
    assert.equal(daysUntil('non-una-data', now), null);
  });
});

describe('menu App KONTA', () => {
  it('una voce per prodotto, con azione current/open/activate e dettaglio onesto', () => {
    const links = buildKontaAppLinks(sample(), 'kcrm', new Date('2026-11-04T10:00:00Z'));
    assert.deepEqual(links.map((l) => l.key), ['light', 'pro', 'kcrm', 'mailk']);
    const byKey = Object.fromEntries(links.map((l) => [l.key, l]));
    assert.equal(byKey.light.action, 'open');
    assert.equal(byKey.pro.action, 'open');
    assert.match(byKey.pro.detail, /Prova attiva · 16 giorni rimasti · Alfa PRO/);
    assert.equal(byKey.kcrm.action, 'current');
    assert.equal(byKey.mailk.action, 'activate');
    assert.equal(byKey.mailk.detail, 'Nessuna azienda: inizia da qui');
    assert.equal(byKey.mailk.url, 'https://mailk.arkai.dev');
  });
});

describe('cookie condiviso', () => {
  it('senza variabile nessuna opzione; con .arkai.dev opzioni sul dominio padre; valori non validi ignorati', () => {
    assert.equal(sharedSessionCookieOptions({}), undefined);
    assert.equal(readSharedCookieDomain({ NEXT_PUBLIC_KONTA_AUTH_COOKIE_DOMAIN: 'localhost' }), null);
    assert.equal(readSharedCookieDomain({ NEXT_PUBLIC_KONTA_AUTH_COOKIE_DOMAIN: 'arkai.dev' }), null);
    assert.equal(readSharedCookieDomain({ NEXT_PUBLIC_KONTA_AUTH_COOKIE_DOMAIN: '.arkai.dev' }), '.arkai.dev');
    assert.deepEqual(sharedSessionCookieOptions({ NEXT_PUBLIC_KONTA_AUTH_COOKIE_DOMAIN: ' .Arkai.dev ' }), {
      domain: '.arkai.dev',
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
  });
});

describe('Mail-K', () => {
  it('menu visto da Mail-K: mailk è "current", K-CRM attivo si apre', () => {
    const links = buildKontaAppLinks(sample(), 'mailk', new Date('2026-11-04T10:00:00Z'));
    const byKey = Object.fromEntries(links.map((l) => [l.key, l]));
    assert.equal(byKey.mailk.action, 'current');
    assert.equal(byKey.kcrm.action, 'open');
    assert.match(byKey.kcrm.detail, /Attivo · Alfa Impianti Srl/);
  });

  it('decideCrmRoute su products.mailk: organizzazione senza riga mailk → sola consultazione', () => {
    const org = { organization_id: 'c1', name: 'Alfa Impianti Srl', role: 'O', state: 'non_activated', valid_until: null, source: null };
    assert.deepEqual(decideCrmRoute({ state: 'non_activated', organizations: [org] }), { kind: 'enter_read_only', state: 'non_activated' });
    assert.deepEqual(decideCrmRoute({ state: 'cancel_scheduled', organizations: [org] }), { kind: 'enter' });
    assert.deepEqual(decideCrmRoute({ state: 'suspended', organizations: [org] }), { kind: 'enter_read_only', state: 'suspended' });
  });
});
