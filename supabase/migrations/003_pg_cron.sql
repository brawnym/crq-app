-- ============================================================
-- SLA Cron Jobs
-- Note: service_role_key is stored in Supabase Vault (not here).
--       Edge function URL is derived from the project ref.
-- ============================================================

-- Function: notify users with approaching SLA (within last 20% of 24hr window)
create or replace function public.check_sla_approaching()
returns void
language plpgsql security definer
as $$
declare
  rec record;
  _service_role_key text;
begin
  select decrypted_secret into _service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  for rec in
    select c.id, c.crq_number, c.title, c.sla_deadline, c.requester_id, c.status
    from public.crqs c
    where c.status in ('pending_approval', 'in_implementation')
      and c.sla_deadline is not null
      and c.sla_deadline > now()
      and c.sla_deadline <= now() + interval '5 hours'
      and not exists (
        select 1 from public.audit_trail at2
        where at2.crq_id = c.id
          and at2.action = 'sla_reminder_sent'
          and at2.created_at > now() - interval '4 hours'
      )
  loop
    insert into public.audit_trail (crq_id, actor_id, action, note)
    values (rec.id, rec.requester_id, 'sla_reminder_sent', 'SLA approaching — reminder triggered');

    perform net.http_post(
      url := 'https://wcwposkzaibsqqfslqtw.supabase.co/functions/v1/send-crq-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := jsonb_build_object(
        'type', 'sla_approaching',
        'crq_id', rec.id
      )
    );
  end loop;
end;
$$;

-- Function: notify on SLA breach
create or replace function public.check_sla_breached()
returns void
language plpgsql security definer
as $$
declare
  rec record;
  _service_role_key text;
begin
  select decrypted_secret into _service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  for rec in
    select c.id, c.crq_number, c.requester_id
    from public.crqs c
    where c.status in ('pending_approval', 'in_implementation')
      and c.sla_deadline is not null
      and c.sla_deadline < now()
      and not exists (
        select 1 from public.audit_trail at2
        where at2.crq_id = c.id
          and at2.action = 'sla_breached_notified'
          and at2.created_at > now() - interval '4 hours'
      )
  loop
    insert into public.audit_trail (crq_id, actor_id, action, note)
    values (rec.id, rec.requester_id, 'sla_breached_notified', 'SLA breached — notification sent');

    perform net.http_post(
      url := 'https://wcwposkzaibsqqfslqtw.supabase.co/functions/v1/send-crq-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := jsonb_build_object(
        'type', 'sla_breached',
        'crq_id', rec.id
      )
    );
  end loop;
end;
$$;

-- Function: auto-archive completed CRQs after 30 days
create or replace function public.auto_archive_completed()
returns void
language plpgsql security definer
as $$
begin
  update public.crqs
  set status = 'archived',
      archived_at = now()
  where status = 'completed'
    and last_updated_at < now() - interval '30 days';
end;
$$;

-- Schedule: SLA checks every hour, archive daily at midnight
select cron.schedule('sla-approaching', '0 * * * *', 'select public.check_sla_approaching()');
select cron.schedule('sla-breached',   '0 * * * *', 'select public.check_sla_breached()');
select cron.schedule('auto-archive',   '0 0 * * *', 'select public.auto_archive_completed()');
