import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface NotificationPayload {
  type:
    | 'submitted'
    | 'approved'
    | 'rejected'
    | 'sent_back'
    | 'resubmitted'
    | 'follow_up'
    | 'completed'
    | 'sla_approaching'
    | 'sla_breached';
  crq_id: string;
  follow_up_message?: string;
  approver_comments?: string;
}

async function getCRQWithDetails(crqId: string) {
  const { data, error } = await supabase
    .from('crqs')
    .select(`
      *,
      project:projects(name),
      requester:users!requester_id(email, full_name),
      approvers:crq_approvers(
        status, comments,
        approver:users!approver_id(email, full_name)
      )
    `)
    .eq('id', crqId)
    .single();
  if (error) throw error;
  return data;
}

async function sendEmail(to: string, subject: string, html: string) {
  const { error } = await supabase.auth.admin.sendRawEmail({
    to,
    subject,
    html,
  } as never);
  if (error) console.error('Email error:', error);
}

function crqLink(crqId: string) {
  return `${appUrl}/crqs/${crqId}`;
}

function baseEmail(crq: Record<string, unknown>, body: string) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2>${crq.crq_number} — ${crq.title}</h2>
      <p><strong>Project:</strong> ${(crq.project as {name:string})?.name ?? 'N/A'}</p>
      <p><strong>Status:</strong> ${crq.status}</p>
      ${body}
      <hr/>
      <p><a href="${crqLink(crq.id as string)}">View CRQ →</a></p>
    </div>
  `;
}

serve(async (req) => {
  const payload: NotificationPayload = await req.json();
  const crq = await getCRQWithDetails(payload.crq_id);
  const approvers = (crq.approvers ?? []) as Array<{status: string; approver: {email: string; full_name: string}}>;
  const pendingApprovers = approvers.filter((a) => a.status === 'pending');

  const subjectMap: Record<string, string> = {
    submitted:       `[${crq.crq_number}] Action Required: Approval Needed`,
    approved:        `[${crq.crq_number}] Approved — Ready for Implementation`,
    rejected:        `[${crq.crq_number}] Rejected — See Comments`,
    sent_back:       `[${crq.crq_number}] Changes Requested — See Comments`,
    resubmitted:     `[${crq.crq_number}] Resubmitted for Approval`,
    follow_up:       `[${crq.crq_number}] Follow-Up: Approval Reminder`,
    completed:       `[${crq.crq_number}] Implementation Completed`,
    sla_approaching: `[${crq.crq_number}] SLA Reminder — Action Due Soon`,
    sla_breached:    `[${crq.crq_number}] SLA Overdue — Immediate Action Required`,
  };

  const subject = subjectMap[payload.type];

  switch (payload.type) {
    case 'submitted':
    case 'resubmitted': {
      const body = baseEmail(crq, `<p>A change request requires your approval.</p>`);
      for (const a of pendingApprovers) {
        await sendEmail(a.approver.email, subject, body);
      }
      break;
    }
    case 'approved':
    case 'rejected':
    case 'sent_back': {
      const comments = payload.approver_comments
        ? `<p><strong>Comments:</strong> ${payload.approver_comments}</p>`
        : '';
      const body = baseEmail(crq, comments);
      await sendEmail((crq.requester as {email:string}).email, subject, body);
      break;
    }
    case 'follow_up': {
      const body = baseEmail(
        crq,
        `<p><strong>Message:</strong> ${payload.follow_up_message ?? ''}</p>`
      );
      for (const a of pendingApprovers) {
        await sendEmail(a.approver.email, subject, body);
      }
      break;
    }
    case 'completed': {
      const body = baseEmail(crq, `<p>The implementation has been marked complete.</p>`);
      for (const a of approvers) {
        await sendEmail(a.approver.email, subject, body);
      }
      break;
    }
    case 'sla_approaching':
    case 'sla_breached': {
      const body = baseEmail(
        crq,
        `<p>SLA deadline: <strong>${crq.sla_deadline}</strong></p>`
      );
      await sendEmail((crq.requester as {email:string}).email, subject, body);
      break;
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
