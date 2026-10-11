import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Staff-only control endpoint for managing AD-HOC Lead Research orders:
 * - Accept order (sets accepted_at and due_at = accepted_at + 24 hours)
 * - Review and verify lead row
 * - Deliver order (strictly enforces 100% human verification)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  // Check staff role
  const isStaff = user.app_metadata?.role === 'staff' || user.email?.includes('arkitecna') || user.email?.includes('admin');
  if (!isStaff) {
    return NextResponse.json({ error: 'Accesso riservato al personale di revisione umana' }, { status: 403 });
  }

  const body = await request.json();
  const { action, leadData, leadResultId, notes } = body;
  const adminClient = createAdminClient();

  const { data: job, error: jobError } = await adminClient
    .from('lead_research_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
  }

  // 1. ACTION: ACCEPT ORDER (SLA 24 Hours clock starts)
  if (action === 'accept') {
    const acceptedAt = new Date();
    const dueAt = new Date(acceptedAt.getTime() + 24 * 60 * 60 * 1000); // exactly 24 consecutive hours

    const { data: updated, error } = await adminClient
      .from('lead_research_jobs')
      .update({
        status: 'accepted',
        accepted_at: acceptedAt.toISOString(),
        due_at: dueAt.toISOString(),
        assigned_staff_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  }

  // 2. ACTION: ADD OR VERIFY LEAD ROW
  if (action === 'add_or_verify_lead') {
    if (leadResultId) {
      // Mark existing row as verified by staff
      const { data: updatedResult, error } = await adminClient
        .from('lead_research_results')
        .update({
          human_verified: true,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          verification_notes: notes || 'Verificato e validato da operatore umano',
          data_status: 'web_found',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadResultId)
        .eq('job_id', id)
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(updatedResult);
    }

    if (leadData) {
      // Insert new verified lead entered by staff
      const { data: insertedResult, error } = await adminClient
        .from('lead_research_results')
        .insert({
          job_id: id,
          company_name: leadData.company_name,
          category: leadData.category || null,
          country: leadData.country || null,
          region: leadData.region || null,
          city: leadData.city || null,
          address: leadData.address || null,
          email: leadData.email || null,
          phone: leadData.phone || null,
          website: leadData.website || null,
          contact_person: leadData.contact_person || null,
          contact_role: leadData.contact_role || null,
          source_evidence: leadData.source_evidence || {
            manual: { source_url: leadData.website || '', collected_at: new Date().toISOString() },
          },
          data_status: 'web_found',
          human_verified: true,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          verification_notes: notes || 'Ricerca e verifica manuale staff',
          deliverability_status: 'unverified',
        })
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(insertedResult);
    }
  }

  // 3. ACTION: DELIVER ORDER (STRICT GATE: 100% human verification required)
  if (action === 'deliver') {
    const { data: allResults } = await adminClient
      .from('lead_research_results')
      .select('id, human_verified, company_name')
      .eq('job_id', id);

    if (!allResults || allResults.length === 0) {
      return NextResponse.json(
        { error: 'Impossibile consegnare: nessun lead presente per questa ricerca' },
        { status: 400 }
      );
    }

    const unverifiedLeads = allResults.filter((r) => !r.human_verified);
    if (unverifiedLeads.length > 0) {
      return NextResponse.json(
        {
          error: `Impossibile consegnare: ${unverifiedLeads.length} lead su ${allResults.length} non hanno ancora la revisione umana completata.`,
          unverified_leads: unverifiedLeads.map((u) => u.company_name),
        },
        { status: 400 }
      );
    }

    const { data: deliveredJob, error: deliverError } = await adminClient
      .from('lead_research_jobs')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (deliverError) return NextResponse.json({ error: deliverError.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      message: 'Ricerca AD-HOC consegnata con successo al cliente con 100% di verifiche umane.',
      job: deliveredJob,
    });
  }

  return NextResponse.json({ error: 'Azione non riconosciuta' }, { status: 400 });
}
