-- =========================================================
-- CRM hardening v1
-- 1) RLS policies (authenticated = full; service_role bypass)
-- 2) Normalización automática de phone/email
-- 3) contact_scores.is_current auto-demote
-- 4) expo_contacts unique con COALESCE(stand,'')
-- 5) CHECK constraints (enums) en campos clave
-- + set_updated_at con search_path fijo
-- + índice compuesto (contact_id, occurred_at desc)
-- =========================================================

-- -------- Helpers --------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p is null or length(regexp_replace(p, '[^0-9]', '', 'g')) = 0 then null
    else regexp_replace(p, '[^0-9+]', '', 'g')
  end;
$$;

create or replace function public.normalize_email(e text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when e is null or length(trim(e)) = 0 then null
    else lower(trim(e))
  end;
$$;

-- -------- 2) Normalización automática --------
create or replace function public.contacts_normalize_trg()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.phone_normalized = public.normalize_phone(new.phone);
  new.email_normalized = public.normalize_email(new.email);
  return new;
end;
$$;

drop trigger if exists contacts_normalize on public.contacts;
create trigger contacts_normalize
before insert or update of phone, email on public.contacts
for each row execute function public.contacts_normalize_trg();

create or replace function public.import_rows_normalized_trg()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.normalized_phone = public.normalize_phone(new.normalized_phone);
  new.normalized_email = public.normalize_email(new.normalized_email);
  return new;
end;
$$;

drop trigger if exists import_rows_normalized_normalize on public.import_rows_normalized;
create trigger import_rows_normalized_normalize
before insert or update of normalized_phone, normalized_email on public.import_rows_normalized
for each row execute function public.import_rows_normalized_trg();

-- -------- 3) contact_scores.is_current auto-demote --------
create or replace function public.contact_scores_demote_previous()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.is_current then
    update public.contact_scores
       set is_current = false
     where contact_id = new.contact_id
       and is_current = true
       and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);
  end if;
  return new;
end;
$$;

drop trigger if exists contact_scores_demote on public.contact_scores;
create trigger contact_scores_demote
before insert or update on public.contact_scores
for each row execute function public.contact_scores_demote_previous();

-- -------- 4) expo_contacts: unique con COALESCE(stand,'') --------
do $$
declare
  cons_name text;
begin
  select conname into cons_name
    from pg_constraint
   where conrelid = 'public.expo_contacts'::regclass
     and contype = 'u'
     and pg_get_constraintdef(oid) ilike '%(contact_id, expo_id, stand)%';
  if cons_name is not null then
    execute format('alter table public.expo_contacts drop constraint %I', cons_name);
  end if;
end $$;

drop index if exists public.expo_contacts_contact_expo_stand_uniq;
create unique index expo_contacts_contact_expo_stand_uniq
  on public.expo_contacts (contact_id, expo_id, coalesce(stand, ''));

-- -------- índice compuesto sugerido --------
create index if not exists contact_touchpoints_contact_occurred_idx
  on public.contact_touchpoints (contact_id, occurred_at desc);

-- -------- 5) CHECK constraints (enums) --------
alter table public.contacts
  drop constraint if exists contacts_status_check;
alter table public.contacts
  add constraint contacts_status_check
  check (status in ('active','blocked','deleted','merged'));

alter table public.contact_touchpoints
  drop constraint if exists contact_touchpoints_source_type_check;
alter table public.contact_touchpoints
  add constraint contact_touchpoints_source_type_check
  check (source_type in (
    'form','event','expo','phone_call','whatsapp','email','agent','manual','referral','import','other'
  ));

alter table public.import_batches
  drop constraint if exists import_batches_status_check;
alter table public.import_batches
  add constraint import_batches_status_check
  check (status in ('uploaded','processing','normalized','matched','imported','failed','cancelled'));

alter table public.import_rows_normalized
  drop constraint if exists import_rows_normalized_status_check;
alter table public.import_rows_normalized
  add constraint import_rows_normalized_status_check
  check (normalization_status in ('pending','normalized','matched','imported','failed','skipped'));

alter table public.campaigns
  drop constraint if exists campaigns_status_check;
alter table public.campaigns
  add constraint campaigns_status_check
  check (status in ('draft','active','paused','closed'));

alter table public.campaigns
  drop constraint if exists campaigns_channel_check;
alter table public.campaigns
  add constraint campaigns_channel_check
  check (channel is null or channel in (
    'meta_ads','google_ads','email','event','landing','whatsapp','direct','referral','other'
  ));

alter table public.forms
  drop constraint if exists forms_status_check;
alter table public.forms
  add constraint forms_status_check
  check (status in ('active','inactive','archived'));

alter table public.events
  drop constraint if exists events_status_check;
alter table public.events
  add constraint events_status_check
  check (status in ('planned','active','closed','cancelled'));

alter table public.event_attendances
  drop constraint if exists event_attendances_status_check;
alter table public.event_attendances
  add constraint event_attendances_status_check
  check (attendance_status in ('registered','confirmed','checked_in','no_show','cancelled'));

alter table public.expos
  drop constraint if exists expos_status_check;
alter table public.expos
  add constraint expos_status_check
  check (status in ('planned','active','closed','cancelled'));

alter table public.communications
  drop constraint if exists communications_channel_check;
alter table public.communications
  add constraint communications_channel_check
  check (channel in ('email','whatsapp','sms','call','push','other'));

alter table public.communications
  drop constraint if exists communications_direction_check;
alter table public.communications
  add constraint communications_direction_check
  check (direction in ('inbound','outbound'));

alter table public.phone_calls
  drop constraint if exists phone_calls_direction_check;
alter table public.phone_calls
  add constraint phone_calls_direction_check
  check (direction in ('inbound','outbound'));

alter table public.phone_calls
  drop constraint if exists phone_calls_outcome_check;
alter table public.phone_calls
  add constraint phone_calls_outcome_check
  check (outcome is null or outcome in (
    'answered','no_answer','voicemail','busy','failed',
    'interested','not_interested','callback','scheduled'
  ));

alter table public.agent_conversations
  drop constraint if exists agent_conversations_channel_check;
alter table public.agent_conversations
  add constraint agent_conversations_channel_check
  check (channel in ('whatsapp','web','email','sms','other'));

alter table public.segments
  drop constraint if exists segments_status_check;
alter table public.segments
  add constraint segments_status_check
  check (status in ('active','inactive','archived'));

alter table public.automation_flows
  drop constraint if exists automation_flows_status_check;
alter table public.automation_flows
  add constraint automation_flows_status_check
  check (status in ('draft','active','paused','closed'));

alter table public.automation_flows
  drop constraint if exists automation_flows_trigger_type_check;
alter table public.automation_flows
  add constraint automation_flows_trigger_type_check
  check (trigger_type is null or trigger_type in (
    'manual','event','segment','schedule','webhook','touchpoint'
  ));

alter table public.content_pieces
  drop constraint if exists content_pieces_type_check;
alter table public.content_pieces
  add constraint content_pieces_type_check
  check (content_type in ('email','whatsapp','sms','landing','post','ad','document','other'));

alter table public.campaign_deliveries
  drop constraint if exists campaign_deliveries_status_check;
alter table public.campaign_deliveries
  add constraint campaign_deliveries_status_check
  check (delivery_status in (
    'pending','scheduled','sent','delivered','failed','bounced','opened','clicked','replied','unsubscribed'
  ));

alter table public.campaign_deliveries
  drop constraint if exists campaign_deliveries_channel_check;
alter table public.campaign_deliveries
  add constraint campaign_deliveries_channel_check
  check (channel in ('email','whatsapp','sms','call','push','other'));

-- -------- 1) RLS policies --------
-- Estrategia V1: authenticated puede todo; anon nada; service_role bypass.
-- Refinaremos por rol (admin/marketing/sales) cuando exista tabla de users/roles.
do $$
declare
  t record;
begin
  for t in
    select c.relname as table_name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and c.relname in (
         'contacts','contact_touchpoints','import_batches','import_rows_raw',
         'import_rows_normalized','campaigns','forms','form_submissions',
         'events','event_attendances','expos','expo_contacts',
         'communications','phone_calls','agent_conversations',
         'segments','contact_segments','contact_scores',
         'automation_flows','content_pieces','campaign_deliveries'
       )
  loop
    execute format('drop policy if exists "authenticated_all" on public.%I', t.table_name);
    execute format($p$
      create policy "authenticated_all" on public.%I
        for all
        to authenticated
        using (true)
        with check (true)
    $p$, t.table_name);
  end loop;
end $$;
