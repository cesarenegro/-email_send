/**
 * Test Harness: Database Isolation & Public Access Verification (Phase 1 Refined)
 * Purpose: Verifies tenant data isolation, anonymous blocking, RPC authorization,
 *          concurrency protection (FOR UPDATE SKIP LOCKED), and settings immutability.
 * 
 * Safety & Governance:
 * - Uses exact UUID tracking for synthetic fixtures (no broad ilike deletes).
 * - Never modifies real settings (uses dedicated probe key '__audit_probe_<timestamp>__').
 * - Pre-creates the probe row via service_role to verify UPDATE blocking against existing rows.
 * - Concurrency test uses a dedicated synthetic campaign with exactly ONE eligible lead.
 * - Validates positive and negative cases across anon, User A (owner), User B, and service_role.
 * - Asserts specific error codes (no false PASS on network/query errors, PGRST301 rejected).
 * - Strict cleanup validation: non-zero exit code if tests or cleanup fail.
 */

import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile(path.join(process.cwd(), '.env.local'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error('FATAL: Missing required Supabase environment variables');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function createAuthenticatedClient(email) {
  const link = await adminClient.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error) throw new Error(`Magic link failed for ${email}: ${link.error.message}`);

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.data.properties.hashed_token,
  });
  if (error) throw new Error(`OTP verify failed for ${email}: ${error.message}`);

  return { client, user: data.user };
}

async function runSecurityAudit() {
  console.log('='.repeat(80));
  console.log('MAIL-K DATABASE ISOLATION & ACCESS AUDIT TEST HARNESS (PHASE 1 REFINED)');
  console.log('='.repeat(80));

  const testMatrix = [];
  let userA = null;
  let userB = null;

  const runTimestamp = Date.now();

  // Exact fixture identifiers
  const fixtures = {
    campaignId: null,
    lead1Id: null,
    lead2Id: null,
    leadServiceRoleId: null,
    logId: null,
    newsletterId: null,
    subscriberAnonId: null,
    subscriberServiceRoleId: null,
    concCampaignId: null,
    concLeadId: null,
    probeSettingKey: `__audit_probe_${runTimestamp}__`,
    probeSettingInsertKey: `__audit_probe_ins_${runTimestamp}__`,
  };

  let allPassed = true;

  function record(id, name, actor, expected, observed, pass, category = 'CHECK') {
    if (!pass) allPassed = false;
    testMatrix.push({
      ID: id,
      Test: name,
      Actor: actor,
      Expected: expected,
      Observed: observed,
      Pass: pass ? 'PASS' : 'FAIL',
      Status: category,
    });
  }

  try {
    console.log('\n[1/6] Establishing authenticated sessions...');
    userA = await createAuthenticatedClient('cesare@arkitecna.com');
    console.log(`  - User A (Owner): ${userA.user.email} (${userA.user.id})`);

    userB = await createAuthenticatedClient('yelhk.cpa@gmail.com');
    console.log(`  - User B (Tenant B): ${userB.user.email} (${userB.user.id})`);

    console.log('\n[2/6] Provisioning exact synthetic test fixtures under User A...');

    // 1. Primary Synthetic Campaign
    const { data: campaign, error: campErr } = await adminClient
      .from('campaigns')
      .insert({
        name: `__SYNTHETIC_CAMPAIGN_${runTimestamp}__`,
        subject_template: 'Security Audit Synthetic Subject',
        html_template: '<p>Synthetic Body</p>',
        status: 'draft',
        user_id: userA.user.id,
      })
      .select()
      .single();
    if (campErr || !campaign) throw new Error(`Campaign fixture creation failed: ${campErr?.message}`);
    fixtures.campaignId = campaign.id;

    // 2. Synthetic Leads for Primary Campaign
    const { data: lead1, error: lead1Err } = await adminClient
      .from('campaign_leads')
      .insert({
        campaign_id: fixtures.campaignId,
        email: `lead-1-${runTimestamp}@audit.invalid`,
        status: 'pending',
      })
      .select()
      .single();
    if (lead1Err || !lead1) throw new Error(`Lead 1 fixture creation failed: ${lead1Err?.message}`);
    fixtures.lead1Id = lead1.id;

    const { data: lead2, error: lead2Err } = await adminClient
      .from('campaign_leads')
      .insert({
        campaign_id: fixtures.campaignId,
        email: `lead-2-${runTimestamp}@audit.invalid`,
        status: 'pending',
      })
      .select()
      .single();
    if (lead2Err || !lead2) throw new Error(`Lead 2 fixture creation failed: ${lead2Err?.message}`);
    fixtures.lead2Id = lead2.id;

    const { data: leadSR, error: leadSRErr } = await adminClient
      .from('campaign_leads')
      .insert({
        campaign_id: fixtures.campaignId,
        email: `lead-servicerole-${runTimestamp}@audit.invalid`,
        status: 'pending',
      })
      .select()
      .single();
    if (leadSRErr || !leadSR) throw new Error(`Lead service_role fixture creation failed: ${leadSRErr?.message}`);
    fixtures.leadServiceRoleId = leadSR.id;

    // 3. Synthetic Email Log
    const { data: log, error: logErr } = await adminClient
      .from('email_logs')
      .insert({
        campaign_id: fixtures.campaignId,
        campaign_lead_id: fixtures.lead1Id,
        event_type: 'sent',
        smtp_message_id: `<audit-${runTimestamp}@mailk.local>`,
      })
      .select()
      .single();
    if (logErr || !log) throw new Error(`Log fixture creation failed: ${logErr?.message}`);
    fixtures.logId = log.id;

    // 4. Dedicated Concurrency Campaign with EXACTLY 1 eligible pending lead
    const { data: concCamp, error: concCampErr } = await adminClient
      .from('campaigns')
      .insert({
        name: `__SYNTHETIC_CONC_CAMPAIGN_${runTimestamp}__`,
        subject_template: 'Concurrency Subject',
        html_template: '<p>Concurrency Body</p>',
        status: 'draft',
        user_id: userA.user.id,
      })
      .select()
      .single();
    if (concCampErr || !concCamp) throw new Error(`Concurrency campaign fixture failed: ${concCampErr?.message}`);
    fixtures.concCampaignId = concCamp.id;

    const { data: concLead, error: concLeadErr } = await adminClient
      .from('campaign_leads')
      .insert({
        campaign_id: fixtures.concCampaignId,
        email: `lead-concurrent-${runTimestamp}@audit.invalid`,
        status: 'pending',
      })
      .select()
      .single();
    if (concLeadErr || !concLead) throw new Error(`Concurrency lead fixture failed: ${concLeadErr?.message}`);
    fixtures.concLeadId = concLead.id;

    // 4b. Dedicated Campaign for Positive service_role Claim
    const { data: srCamp, error: srCampErr } = await adminClient
      .from('campaigns')
      .insert({
        name: `__SYNTHETIC_SR_CAMPAIGN_${runTimestamp}__`,
        subject_template: 'SR Subject',
        html_template: '<p>SR Body</p>',
        status: 'draft',
        user_id: userA.user.id,
      })
      .select()
      .single();
    if (srCampErr || !srCamp) throw new Error(`SR campaign fixture failed: ${srCampErr?.message}`);
    fixtures.srCampaignId = srCamp.id;

    const { data: srLead, error: srLeadErr } = await adminClient
      .from('campaign_leads')
      .insert({
        campaign_id: fixtures.srCampaignId,
        email: `lead-sr-positive-${runTimestamp}@audit.invalid`,
        status: 'pending',
      })
      .select()
      .single();
    if (srLeadErr || !srLead) throw new Error(`SR lead fixture failed: ${srLeadErr?.message}`);
    fixtures.srLeadId = srLead.id;

    // 5. Synthetic Newsletter & Subscribers for isolation
    const { data: nl, error: nlErr } = await adminClient
      .from('newsletters')
      .insert({
        user_id: userA.user.id,
        title: `__SYNTHETIC_NL_${runTimestamp}__`,
        subject: 'Audit Newsletter',
        html_content: '<p>Audit Newsletter Body</p>',
        status: 'draft',
      })
      .select()
      .single();
    if (nlErr || !nl) throw new Error(`Newsletter fixture creation failed: ${nlErr?.message}`);
    fixtures.newsletterId = nl.id;

    const { data: subAnon, error: subAnonErr } = await adminClient
      .from('newsletter_subscribers')
      .insert({
        newsletter_id: fixtures.newsletterId,
        email: `sub-anon-${runTimestamp}@audit.invalid`,
        status: 'pending',
      })
      .select()
      .single();
    if (subAnonErr || !subAnon) throw new Error(`Newsletter subscriber 1 failed: ${subAnonErr?.message}`);
    fixtures.subscriberAnonId = subAnon.id;

    const { data: subB, error: subBErr } = await adminClient
      .from('newsletter_subscribers')
      .insert({
        newsletter_id: fixtures.newsletterId,
        email: `sub-userb-${runTimestamp}@audit.invalid`,
        status: 'pending',
      })
      .select()
      .single();
    if (subBErr || !subB) throw new Error(`Newsletter subscriber B failed: ${subBErr?.message}`);
    fixtures.subscriberBId = subB.id;

    // 5b. Dedicated Newsletter for positive service_role claim
    const { data: srNl, error: srNlErr } = await adminClient
      .from('newsletters')
      .insert({
        user_id: userA.user.id,
        title: `__SYNTHETIC_SR_NL_${runTimestamp}__`,
        subject: 'Audit SR Newsletter',
        html_content: '<p>Audit Body</p>',
        status: 'draft',
      })
      .select()
      .single();
    if (srNlErr || !srNl) throw new Error(`SR Newsletter fixture failed: ${srNlErr?.message}`);
    fixtures.srNewsletterId = srNl.id;

    const { data: srSub, error: srSubErr } = await adminClient
      .from('newsletter_subscribers')
      .insert({
        newsletter_id: fixtures.srNewsletterId,
        email: `sub-sr-${runTimestamp}@audit.invalid`,
        status: 'pending',
      })
      .select()
      .single();
    if (srSubErr || !srSub) throw new Error(`SR Newsletter sub failed: ${srSubErr?.message}`);
    fixtures.srSubscriberId = srSub.id;

    // 6. Pre-create dedicated probe row in app_settings via service_role for UPDATE test
    const { error: probeInsertErr } = await adminClient
      .from('app_settings')
      .insert({ key: fixtures.probeSettingKey, value: 'initial_authorized_value' });
    if (probeInsertErr) throw new Error(`Probe app_settings creation failed: ${probeInsertErr.message}`);

    console.log('  - All exact synthetic fixtures provisioned successfully.');

    console.log('\n[3/6] Running Data Isolation & Permissions Tests...');

    // Test 1: User A reads own campaign
    const { data: aCamp, error: aCampErr } = await userA.client
      .from('campaigns')
      .select('id')
      .eq('id', fixtures.campaignId);
    record(
      'T01',
      'User A reads own campaign',
      'User A',
      '1 row returned',
      aCampErr ? `Error: ${aCampErr.message}` : `${aCamp?.length ?? 0} rows`,
      !aCampErr && aCamp?.length === 1,
      'POSITIVE'
    );

    // Test 2: User A reads own campaign lead
    const { data: aLead, error: aLeadErr } = await userA.client
      .from('campaign_leads')
      .select('id')
      .eq('id', fixtures.lead1Id);
    record(
      'T02',
      'User A reads own campaign lead',
      'User A',
      '1 row returned',
      aLeadErr ? `Error: ${aLeadErr.message}` : `${aLead?.length ?? 0} rows`,
      !aLeadErr && aLead?.length === 1,
      'POSITIVE'
    );

    // Test 3: User A reads own email_logs
    const { data: aLogs, error: aLogsErr } = await userA.client
      .from('email_logs')
      .select('id')
      .eq('id', fixtures.logId);
    record(
      'T03',
      'User A reads own campaign email log',
      'User A',
      '1 row returned',
      aLogsErr ? `Error: ${aLogsErr.message}` : `${aLogs?.length ?? 0} rows`,
      !aLogsErr && aLogs?.length === 1,
      'POSITIVE'
    );

    // Test 4: User B denied viewing User A's campaign
    const { data: bCamp, error: bCampErr } = await userB.client
      .from('campaigns')
      .select('id')
      .eq('id', fixtures.campaignId);
    record(
      'T04',
      'User B blocked from User A campaign',
      'User B',
      '0 rows returned',
      bCampErr ? `Error: ${bCampErr.message}` : `${bCamp?.length ?? 0} rows`,
      !bCampErr && bCamp?.length === 0,
      'ISOLATION'
    );

    // Test 5: User B denied viewing User A's campaign lead
    const { data: bLead, error: bLeadErr } = await userB.client
      .from('campaign_leads')
      .select('id')
      .eq('id', fixtures.lead1Id);
    record(
      'T05',
      'User B blocked from User A lead',
      'User B',
      '0 rows returned',
      bLeadErr ? `Error: ${bLeadErr.message}` : `${bLead?.length ?? 0} rows`,
      !bLeadErr && bLead?.length === 0,
      'ISOLATION'
    );

    // Test 6: User B denied viewing User A's email_logs
    const { data: bLogs, error: bLogsErr } = await userB.client
      .from('email_logs')
      .select('id')
      .eq('id', fixtures.logId);
    const bLogsBlocked = (!bLogsErr && bLogs?.length === 0) || (bLogsErr && bLogsErr.code === '42501');
    record(
      'T06',
      'User B blocked from User A email log',
      'User B',
      '0 rows or 42501 error',
      bLogsErr ? `Blocked (${bLogsErr.code})` : `${bLogs?.length ?? 0} rows visible`,
      bLogsBlocked,
      'F02-LOGS'
    );

    // Test 7: Anonymous denied viewing email_logs
    const { data: anonLogs, error: anonLogsErr } = await anonClient
      .from('email_logs')
      .select('id')
      .eq('id', fixtures.logId);
    const anonLogsBlocked = (!anonLogsErr && anonLogs?.length === 0) || (anonLogsErr && anonLogsErr.code === '42501');
    record(
      'T07',
      'Anonymous blocked from reading email logs',
      'Anonymous',
      '0 rows or 42501 error',
      anonLogsErr ? `Blocked (${anonLogsErr.code})` : `${anonLogs?.length ?? 0} rows visible`,
      anonLogsBlocked,
      'F02-LOGS'
    );

    console.log('\n[4/6] Running RPC Authorization & Concurrency Tests...');

    // Helper to evaluate strictly expected authorization failure on RPC (revocation or 42501)
    const isRpcAuthBlocked = (err) => {
      if (!err) return false;
      // 42501 = insufficient_privilege in PostgreSQL (or permission denied for function)
      // Note: PGRST202 is deliberately excluded as it can indicate schema cache mismatch / missing function
      return err.code === '42501' || err.message?.toLowerCase().includes('permission denied for function') || err.message?.toLowerCase().includes('accesso negato');
    };

    // Test 8: Anonymous calling claim_next_campaign_lead
    const anonClaim = await anonClient.rpc('claim_next_campaign_lead', { p_campaign_id: fixtures.campaignId });
    const anonClaimBlocked = isRpcAuthBlocked(anonClaim.error);
    record(
      'T08',
      'Anonymous blocked from claim_next_campaign_lead',
      'Anonymous',
      '42501 permission denied / revoked',
      anonClaim.error ? `Error: ${anonClaim.error.code} (${anonClaim.error.message})` : `ACCEPTED (returned ${anonClaim.data?.length ?? 0} rows)`,
      anonClaimBlocked,
      'F01-RPC'
    );

    // Test 9: User B calling claim_next_campaign_lead on User A's campaign
    const bClaim = await userB.client.rpc('claim_next_campaign_lead', { p_campaign_id: fixtures.campaignId });
    const bClaimBlocked = isRpcAuthBlocked(bClaim.error);
    record(
      'T09',
      'User B blocked from claiming lead of User A',
      'User B',
      '42501 permission denied / revoked',
      bClaim.error ? `Blocked: ${bClaim.error.code} (${bClaim.error.message})` : `ACCEPTED (returned ${bClaim.data?.length ?? 0} rows)`,
      bClaimBlocked,
      'F01-RPC'
    );

    // Test 10: User A (Owner) calling claim_next_campaign_lead directly
    // Under service_role-only model, even authenticated owner must NOT execute RPC directly
    const aClaim = await userA.client.rpc('claim_next_campaign_lead', { p_campaign_id: fixtures.campaignId });
    const aClaimBlocked = isRpcAuthBlocked(aClaim.error);
    record(
      'T10',
      'User A (Owner) blocked from direct RPC (service_role only)',
      'User A',
      '42501 permission denied / revoked',
      aClaim.error ? `Blocked: ${aClaim.error.code} (${aClaim.error.message})` : `ACCEPTED (returned ${aClaim.data?.length ?? 0} rows)`,
      aClaimBlocked,
      'F01-RPC'
    );

    // Test 11: Anonymous calling claim_next_newsletter_subscriber
    const anonNl = await anonClient.rpc('claim_next_newsletter_subscriber', { p_newsletter_id: fixtures.newsletterId });
    const anonNlBlocked = isRpcAuthBlocked(anonNl.error);
    record(
      'T11',
      'Anonymous blocked from claim_next_newsletter_subscriber',
      'Anonymous',
      '42501 permission denied / revoked',
      anonNl.error ? `Blocked: ${anonNl.error.code} (${anonNl.error.message})` : `ACCEPTED (returned ${anonNl.data?.length ?? 0} rows)`,
      anonNlBlocked,
      'F01-RPC'
    );

    // Test 12: User B calling claim_next_newsletter_subscriber on User A's newsletter
    const bNl = await userB.client.rpc('claim_next_newsletter_subscriber', { p_newsletter_id: fixtures.newsletterId });
    const bNlBlocked = isRpcAuthBlocked(bNl.error);
    record(
      'T12',
      'User B blocked from claiming subscriber of User A',
      'User B',
      '42501 permission denied / revoked',
      bNl.error ? `Blocked: ${bNl.error.code} (${bNl.error.message})` : `ACCEPTED (returned ${bNl.data?.length ?? 0} rows)`,
      bNlBlocked,
      'F01-RPC'
    );

    // Test 13: Positive newsletter claim by service_role (dispatcher)
    const serviceNlClaim = await adminClient.rpc('claim_next_newsletter_subscriber', { p_newsletter_id: fixtures.srNewsletterId });
    const serviceNlClaimSuccess = !serviceNlClaim.error && serviceNlClaim.data && serviceNlClaim.data.length === 1 && serviceNlClaim.data[0].status === 'sending';
    record(
      'T13',
      'service_role claims newsletter subscriber atomically',
      'service_role',
      '1 subscriber claimed in status sending',
      serviceNlClaim.error ? `Error: ${serviceNlClaim.error.message}` : (serviceNlClaim.data?.length ? `Claimed ID: ${serviceNlClaim.data[0].id} status=${serviceNlClaim.data[0].status}` : '0 rows claimed'),
      serviceNlClaimSuccess,
      'POSITIVE'
    );

    // Test 14: service_role claiming campaign lead atomically
    const serviceClaim = await adminClient.rpc('claim_next_campaign_lead', { p_campaign_id: fixtures.srCampaignId });
    const serviceClaimSuccess = !serviceClaim.error && serviceClaim.data && serviceClaim.data.length === 1 && serviceClaim.data[0].status === 'sending';
    record(
      'T14',
      'service_role claims lead atomically (dispatcher)',
      'service_role',
      '1 lead claimed with status sending',
      serviceClaim.error ? `Error: ${serviceClaim.error.message}` : (serviceClaim.data?.length ? `Claimed ID: ${serviceClaim.data[0].id} status=${serviceClaim.data[0].status}` : '0 rows claimed'),
      serviceClaimSuccess,
      'POSITIVE'
    );

    // Test 15: Concurrency protection on dedicated campaign with EXACTLY 1 eligible pending lead
    const [c1, c2] = await Promise.all([
      adminClient.rpc('claim_next_campaign_lead', { p_campaign_id: fixtures.concCampaignId }),
      adminClient.rpc('claim_next_campaign_lead', { p_campaign_id: fixtures.concCampaignId }),
    ]);

    const c1Rows = c1.data?.length ?? 0;
    const c2Rows = c2.data?.length ?? 0;
    const neitherErrored = !c1.error && !c2.error;
    const totalClaimed = c1Rows + c2Rows;
    const exactlyOneWon = neitherErrored && totalClaimed === 1 && ((c1Rows === 1 && c2Rows === 0) || (c1Rows === 0 && c2Rows === 1));
    const winnerData = c1Rows === 1 ? c1.data[0] : (c2Rows === 1 ? c2.data[0] : null);
    const validClaimAttributes = winnerData && winnerData.id === fixtures.concLeadId && winnerData.status === 'sending' && winnerData.attempts === 1;

    record(
      'T15',
      'Atomic concurrency: exactly 1 claim on isolated 1-lead campaign',
      'service_role x2',
      'Zero errors, exactly 1 winner with expected UUID & attempts=1, other 0 rows',
      neitherErrored
        ? `Call 1: ${c1Rows} rows, Call 2: ${c2Rows} rows (winner=${winnerData?.id}, status=${winnerData?.status}, attempts=${winnerData?.attempts})`
        : `Error in call: ${c1.error?.message || c2.error?.message}`,
      exactlyOneWon && validClaimAttributes,
      'CONCURRENCY'
    );

    console.log('\n[5/6] Testing app_settings Immutability (Dedicated Probe Fixture)...');

    // Test 16: User B attempts INSERT on app_settings
    const { data: bInsertSet, error: bInsertSetErr } = await userB.client
      .from('app_settings')
      .insert({ key: fixtures.probeSettingInsertKey, value: 'unauthorized_probe' })
      .select();
    const bInsertBlocked = bInsertSetErr !== null && (bInsertSetErr.code === '42501' || bInsertSetErr.message?.includes('violates row-level security policy') || bInsertSetErr.message?.includes('permission denied'));
    record(
      'T16',
      'User B blocked from INSERT on app_settings',
      'User B',
      '42501 permission denied / RLS rejection',
      bInsertSetErr ? `Blocked: ${bInsertSetErr.code} (${bInsertSetErr.message})` : `VULNERABLE (inserted ${bInsertSet?.length ?? 0} rows)`,
      bInsertBlocked,
      'F03-SETTINGS'
    );

    // Test 17: User B attempts UPDATE on existing probe setting
    const { data: bUpdateSet, error: bUpdateSetErr } = await userB.client
      .from('app_settings')
      .update({ value: 'tampered_by_user_b' })
      .eq('key', fixtures.probeSettingKey)
      .select();

    // Check actual DB value via admin to confirm it remained untampered
    const { data: probeCheck } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', fixtures.probeSettingKey)
      .single();

    const isUntampered = probeCheck?.value === 'initial_authorized_value';
    const bUpdateBlocked = ((bUpdateSetErr && bUpdateSetErr.code === '42501') || (bUpdateSet?.length === 0)) && isUntampered;

    record(
      'T17',
      'User B blocked from UPDATE on existing app_settings probe',
      'User B',
      '0 rows updated or 42501, value unmodified',
      bUpdateSetErr
        ? `Blocked: ${bUpdateSetErr.code}`
        : (bUpdateSet?.length ? `VULNERABLE (updated ${bUpdateSet.length} rows, val=${probeCheck?.value})` : `0 rows updated (DB val: ${probeCheck?.value})`),
      bUpdateBlocked,
      'F03-SETTINGS'
    );

    console.log('\n[6/6] TEST AUDIT MATRIX SUMMARY:\n');
    console.table(testMatrix);

  } catch (err) {
    console.error('Audit execution exception:', err);
    allPassed = false;
  } finally {
    console.log('\nPerforming strict cleanup by exact fixture identifiers...');
    let cleanupFailed = false;

    // 1. Delete probe settings and verify absence
    try {
      const { error: delProbe1Err } = await adminClient.from('app_settings').delete().eq('key', fixtures.probeSettingKey);
      if (delProbe1Err) {
        console.error('Error deleting probe setting 1:', delProbe1Err);
        cleanupFailed = true;
      }
      const { error: delProbe2Err } = await adminClient.from('app_settings').delete().eq('key', fixtures.probeSettingInsertKey);
      if (delProbe2Err) {
        console.error('Error deleting probe setting 2:', delProbe2Err);
        cleanupFailed = true;
      }

      // Verify probe keys are absent
      const { data: probeResiduals, error: probeCheckErr } = await adminClient
        .from('app_settings')
        .select('key')
        .in('key', [fixtures.probeSettingKey, fixtures.probeSettingInsertKey]);
      if (probeCheckErr || probeResiduals === null || probeResiduals.length > 0) {
        console.error('CLEANUP CHECK FAILED: Probe settings still exist in app_settings.');
        cleanupFailed = true;
      } else {
        console.log('  - Verified probe app_settings removed.');
      }
    } catch (e) {
      console.error('Exception during probe cleanup:', e);
      cleanupFailed = true;
    }

    // 2. Delete synthetic primary campaign and its cascading leads/logs
    if (fixtures.campaignId) {
      const { error: delCampErr } = await adminClient
        .from('campaigns')
        .delete()
        .eq('id', fixtures.campaignId);
      if (delCampErr) {
        console.error('Error deleting synthetic campaign:', delCampErr);
        cleanupFailed = true;
      }
      const { data: checkCamp, error: checkCampErr } = await adminClient
        .from('campaigns')
        .select('id')
        .eq('id', fixtures.campaignId);
      if (checkCampErr || checkCamp === null || checkCamp.length > 0) {
        console.error(`CLEANUP CHECK FAILED: Campaign ${fixtures.campaignId} still exists.`);
        cleanupFailed = true;
      } else {
        console.log(`  - Verified synthetic campaign ${fixtures.campaignId} removed.`);
      }
    }

    // 3. Delete synthetic concurrency campaign
    if (fixtures.concCampaignId) {
      const { error: delConcCampErr } = await adminClient
        .from('campaigns')
        .delete()
        .eq('id', fixtures.concCampaignId);
      if (delConcCampErr) {
        console.error('Error deleting concurrency campaign:', delConcCampErr);
        cleanupFailed = true;
      }
      const { data: checkConc, error: checkConcErr } = await adminClient
        .from('campaigns')
        .select('id')
        .eq('id', fixtures.concCampaignId);
      if (checkConcErr || checkConc === null || checkConc.length > 0) {
        console.error(`CLEANUP CHECK FAILED: Concurrency campaign ${fixtures.concCampaignId} still exists.`);
        cleanupFailed = true;
      } else {
        console.log(`  - Verified concurrency campaign ${fixtures.concCampaignId} removed.`);
      }
    }

    // 3b. Delete synthetic SR campaign
    if (fixtures.srCampaignId) {
      const { error: delSrCampErr } = await adminClient
        .from('campaigns')
        .delete()
        .eq('id', fixtures.srCampaignId);
      if (delSrCampErr) {
        console.error('Error deleting SR campaign:', delSrCampErr);
        cleanupFailed = true;
      }
      const { data: checkSrCamp, error: checkSrCampErr } = await adminClient
        .from('campaigns')
        .select('id')
        .eq('id', fixtures.srCampaignId);
      if (checkSrCampErr || checkSrCamp === null || checkSrCamp.length > 0) {
        console.error(`CLEANUP CHECK FAILED: SR Campaign ${fixtures.srCampaignId} still exists or check query errored:`, checkSrCampErr);
        cleanupFailed = true;
      } else {
        console.log(`  - Verified synthetic SR campaign ${fixtures.srCampaignId} removed.`);
      }
    }

    // 4. Delete synthetic newsletter
    if (fixtures.newsletterId) {
      const { error: delNlErr } = await adminClient
        .from('newsletters')
        .delete()
        .eq('id', fixtures.newsletterId);
      if (delNlErr) {
        console.error('Error deleting synthetic newsletter:', delNlErr);
        cleanupFailed = true;
      }
      const { data: checkNl, error: checkNlErr } = await adminClient
        .from('newsletters')
        .select('id')
        .eq('id', fixtures.newsletterId);
      if (checkNlErr || checkNl === null || checkNl.length > 0) {
        console.error(`CLEANUP CHECK FAILED: Newsletter ${fixtures.newsletterId} still exists.`);
        cleanupFailed = true;
      } else {
        console.log(`  - Verified synthetic newsletter ${fixtures.newsletterId} removed.`);
      }
    }

    // 4b. Delete synthetic SR newsletter
    if (fixtures.srNewsletterId) {
      const { error: delSrNlErr } = await adminClient
        .from('newsletters')
        .delete()
        .eq('id', fixtures.srNewsletterId);
      if (delSrNlErr) {
        console.error('Error deleting SR newsletter:', delSrNlErr);
        cleanupFailed = true;
      }
      const { data: checkSrNl, error: checkSrNlErr } = await adminClient
        .from('newsletters')
        .select('id')
        .eq('id', fixtures.srNewsletterId);
      if (checkSrNlErr || checkSrNl === null || checkSrNl.length > 0) {
        console.error(`CLEANUP CHECK FAILED: SR Newsletter ${fixtures.srNewsletterId} still exists or check query errored:`, checkSrNlErr);
        cleanupFailed = true;
      } else {
        console.log(`  - Verified synthetic SR newsletter ${fixtures.srNewsletterId} removed.`);
      }
    }

    // 5. Revoke sessions
    if (userA) {
      const outA = await userA.client.auth.signOut({ scope: 'local' });
      if (outA.error) {
        console.error('Error revoking User A session:', outA.error);
        cleanupFailed = true;
      }
    }
    if (userB) {
      const outB = await userB.client.auth.signOut({ scope: 'local' });
      if (outB.error) {
        console.error('Error revoking User B session:', outB.error);
        cleanupFailed = true;
      }
    }

    console.log(`Cleanup complete. Residual verification: ${cleanupFailed ? 'FAILED' : 'SUCCESS (0 leftovers)'}\n`);

    if (cleanupFailed || !allPassed) {
      process.exitCode = 1;
    }
  }
}

runSecurityAudit();
