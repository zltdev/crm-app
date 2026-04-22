begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  phone_normalized text,
  email text,
  email_normalized text,
  first_name text,
  last_name text,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists contacts_phone_normalized_uniq
  on public.contacts (phone_normalized)
  where phone_normalized is not null;

create unique index if not exists contacts_email_normalized_uniq
  on public.contacts (email_normalized)
  where email_normalized is not null;

create index if not exists contacts_status_idx
  on public.contacts (status);

create table if not exists public.contact_touchpoints (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  source_type text not null,
  source_name text,
  campaign_id uuid,
  event_id uuid,
  expo_id uuid,
  form_id uuid,
  occurred_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists contact_touchpoints_contact_id_idx
  on public.contact_touchpoints (contact_id);

create index if not exists contact_touchpoints_source_type_idx
  on public.contact_touchpoints (source_type);

create index if not exists contact_touchpoints_occurred_at_idx
  on public.contact_touchpoints (occurred_at desc);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_type text not null,
  file_name text not null,
  status text not null default 'uploaded',
  row_count integer,
  uploaded_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists import_batches_source_type_idx
  on public.import_batches (source_type);

create table if not exists public.import_rows_raw (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  row_number integer,
  raw_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists import_rows_raw_batch_id_idx
  on public.import_rows_raw (batch_id);

create table if not exists public.import_rows_normalized (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  raw_row_id uuid references public.import_rows_raw(id) on delete set null,
  normalized_phone text,
  normalized_email text,
  first_name text,
  last_name text,
  source_type text not null,
  source_name text,
  occurred_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  matched_contact_id uuid references public.contacts(id) on delete set null,
  normalization_status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists import_rows_normalized_batch_id_idx
  on public.import_rows_normalized (batch_id);

create index if not exists import_rows_normalized_matched_contact_id_idx
  on public.import_rows_normalized (matched_contact_id);

create index if not exists import_rows_normalized_phone_idx
  on public.import_rows_normalized (normalized_phone);

create index if not exists import_rows_normalized_email_idx
  on public.import_rows_normalized (normalized_email);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text,
  status text not null default 'draft',
  description text,
  start_date date,
  end_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists campaigns_status_idx
  on public.campaigns (status);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  name text not null,
  source_name text,
  slug text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists forms_slug_uniq
  on public.forms (slug)
  where slug is not null;

create index if not exists forms_campaign_id_idx
  on public.forms (campaign_id);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  form_id uuid not null references public.forms(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists form_submissions_contact_id_idx
  on public.form_submissions (contact_id);

create index if not exists form_submissions_form_id_idx
  on public.form_submissions (form_id);

create index if not exists form_submissions_campaign_id_idx
  on public.form_submissions (campaign_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  name text not null,
  event_type text,
  location text,
  start_at timestamptz,
  end_at timestamptz,
  status text not null default 'planned',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists events_campaign_id_idx
  on public.events (campaign_id);

create index if not exists events_start_at_idx
  on public.events (start_at);

create table if not exists public.event_attendances (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  attendance_status text not null default 'registered',
  lead_source text,
  checked_in_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (contact_id, event_id)
);

create index if not exists event_attendances_event_id_idx
  on public.event_attendances (event_id);

create table if not exists public.expos (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  name text not null,
  venue text,
  city text,
  country text,
  start_date date,
  end_date date,
  status text not null default 'planned',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists expos_campaign_id_idx
  on public.expos (campaign_id);

create table if not exists public.expo_contacts (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  expo_id uuid not null references public.expos(id) on delete cascade,
  stand text,
  sales_rep text,
  interaction_result text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (contact_id, expo_id, stand)
);

create index if not exists expo_contacts_expo_id_idx
  on public.expo_contacts (expo_id);

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  channel text not null,
  direction text not null,
  subject text,
  body text,
  occurred_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists communications_contact_id_idx
  on public.communications (contact_id);

create index if not exists communications_campaign_id_idx
  on public.communications (campaign_id);

create index if not exists communications_occurred_at_idx
  on public.communications (occurred_at desc);

create table if not exists public.phone_calls (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  direction text not null,
  outcome text,
  duration_seconds integer,
  occurred_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists phone_calls_contact_id_idx
  on public.phone_calls (contact_id);

create index if not exists phone_calls_occurred_at_idx
  on public.phone_calls (occurred_at desc);

create table if not exists public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  agent_name text,
  channel text not null,
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists agent_conversations_contact_id_idx
  on public.agent_conversations (contact_id);

create table if not exists public.segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  description text,
  definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (name)
);

create table if not exists public.contact_segments (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  segment_id uuid not null references public.segments(id) on delete cascade,
  assigned_at timestamptz not null default timezone('utc', now()),
  assignment_source text,
  metadata jsonb not null default '{}'::jsonb,
  unique (contact_id, segment_id)
);

create index if not exists contact_segments_segment_id_idx
  on public.contact_segments (segment_id);

create table if not exists public.contact_scores (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  fit_score numeric(5,2) not null default 0,
  engagement_score numeric(5,2) not null default 0,
  intent_score numeric(5,2) not null default 0,
  freshness_score numeric(5,2) not null default 0,
  score_total numeric(5,2) not null default 0,
  scoring_model text,
  is_current boolean not null default true,
  calculated_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists contact_scores_contact_id_idx
  on public.contact_scores (contact_id);

create unique index if not exists contact_scores_current_uniq
  on public.contact_scores (contact_id)
  where is_current = true;

create table if not exists public.automation_flows (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  name text not null,
  status text not null default 'draft',
  trigger_type text,
  definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists automation_flows_campaign_id_idx
  on public.automation_flows (campaign_id);

create table if not exists public.content_pieces (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  title text not null,
  content_type text not null,
  channel text,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists content_pieces_campaign_id_idx
  on public.content_pieces (campaign_id);

create table if not exists public.campaign_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  content_piece_id uuid references public.content_pieces(id) on delete set null,
  automation_flow_id uuid references public.automation_flows(id) on delete set null,
  channel text not null,
  delivery_status text not null default 'pending',
  scheduled_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists campaign_deliveries_campaign_id_idx
  on public.campaign_deliveries (campaign_id);

create index if not exists campaign_deliveries_contact_id_idx
  on public.campaign_deliveries (contact_id);

create index if not exists campaign_deliveries_status_idx
  on public.campaign_deliveries (delivery_status);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contact_touchpoints_campaign_id_fkey'
  ) then
    alter table public.contact_touchpoints
      add constraint contact_touchpoints_campaign_id_fkey
      foreign key (campaign_id) references public.campaigns(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'contact_touchpoints_event_id_fkey'
  ) then
    alter table public.contact_touchpoints
      add constraint contact_touchpoints_event_id_fkey
      foreign key (event_id) references public.events(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'contact_touchpoints_expo_id_fkey'
  ) then
    alter table public.contact_touchpoints
      add constraint contact_touchpoints_expo_id_fkey
      foreign key (expo_id) references public.expos(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'contact_touchpoints_form_id_fkey'
  ) then
    alter table public.contact_touchpoints
      add constraint contact_touchpoints_form_id_fkey
      foreign key (form_id) references public.forms(id) on delete set null;
  end if;
end
$$;

drop trigger if exists set_contacts_updated_at on public.contacts;
create trigger set_contacts_updated_at
before update on public.contacts
for each row
execute function public.set_updated_at();

drop trigger if exists set_import_rows_normalized_updated_at on public.import_rows_normalized;
create trigger set_import_rows_normalized_updated_at
before update on public.import_rows_normalized
for each row
execute function public.set_updated_at();

drop trigger if exists set_campaigns_updated_at on public.campaigns;
create trigger set_campaigns_updated_at
before update on public.campaigns
for each row
execute function public.set_updated_at();

drop trigger if exists set_forms_updated_at on public.forms;
create trigger set_forms_updated_at
before update on public.forms
for each row
execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

drop trigger if exists set_expos_updated_at on public.expos;
create trigger set_expos_updated_at
before update on public.expos
for each row
execute function public.set_updated_at();

drop trigger if exists set_segments_updated_at on public.segments;
create trigger set_segments_updated_at
before update on public.segments
for each row
execute function public.set_updated_at();

drop trigger if exists set_automation_flows_updated_at on public.automation_flows;
create trigger set_automation_flows_updated_at
before update on public.automation_flows
for each row
execute function public.set_updated_at();

drop trigger if exists set_content_pieces_updated_at on public.content_pieces;
create trigger set_content_pieces_updated_at
before update on public.content_pieces
for each row
execute function public.set_updated_at();

comment on table public.contacts is 'Entidad principal de personas/contactos unificados.';
comment on table public.contact_touchpoints is 'Historial de origenes e interacciones del contacto.';
comment on table public.import_batches is 'Archivos o lotes cargados al pipeline de importacion.';
comment on table public.import_rows_raw is 'Filas crudas tal como llegaron desde origen.';
comment on table public.import_rows_normalized is 'Filas normalizadas y listas para matching/dedupe.';
comment on table public.events is 'Eventos comerciales o de marketing.';
comment on table public.expos is 'Ferias o exposiciones.';
comment on table public.campaign_deliveries is 'Entregas por contacto dentro de campanas o automatizaciones.';

commit;
