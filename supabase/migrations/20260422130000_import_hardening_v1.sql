-- =========================================================
-- Import hardening v1
-- 1) FKs opcionales desde contact_touchpoints a agent_conversations,
--    phone_calls y communications (las otras 3 ya existían).
-- 2) Columna import_batches.source_kind con CHECK estricto para
--    los 4 tipos canónicos del importador (agent/form/event/expo) + extras.
-- 3) Columnas de mapping/estadística en import_batches para guardar
--    el mapeo persistido y los counts del commit.
-- =========================================================

alter table public.contact_touchpoints
  add column if not exists agent_conversation_id uuid,
  add column if not exists phone_call_id uuid,
  add column if not exists communication_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'contact_touchpoints_agent_conversation_id_fkey'
  ) then
    alter table public.contact_touchpoints
      add constraint contact_touchpoints_agent_conversation_id_fkey
      foreign key (agent_conversation_id)
      references public.agent_conversations(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'contact_touchpoints_phone_call_id_fkey'
  ) then
    alter table public.contact_touchpoints
      add constraint contact_touchpoints_phone_call_id_fkey
      foreign key (phone_call_id)
      references public.phone_calls(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'contact_touchpoints_communication_id_fkey'
  ) then
    alter table public.contact_touchpoints
      add constraint contact_touchpoints_communication_id_fkey
      foreign key (communication_id)
      references public.communications(id) on delete set null;
  end if;
end $$;

create index if not exists contact_touchpoints_agent_conv_idx
  on public.contact_touchpoints (agent_conversation_id)
  where agent_conversation_id is not null;

alter table public.import_batches
  add column if not exists source_kind text;

alter table public.import_batches
  drop constraint if exists import_batches_source_kind_check;
alter table public.import_batches
  add constraint import_batches_source_kind_check
  check (source_kind is null or source_kind in (
    'agent','form','event','expo','phone_call','communication','other'
  ));

alter table public.import_batches
  add column if not exists column_mapping jsonb,
  add column if not exists result_stats jsonb,
  add column if not exists context_event_id uuid references public.events(id) on delete set null,
  add column if not exists context_expo_id uuid references public.expos(id) on delete set null,
  add column if not exists context_form_id uuid references public.forms(id) on delete set null,
  add column if not exists context_campaign_id uuid references public.campaigns(id) on delete set null,
  add column if not exists sheet_name text,
  add column if not exists header_row integer not null default 1;

create index if not exists import_batches_source_kind_idx
  on public.import_batches (source_kind);
