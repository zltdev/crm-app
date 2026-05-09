begin;

-- ============================================================
-- LEADS MODULE: operational sales pipeline
-- ============================================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete set null,

  -- Contact info (denormalized for operational speed)
  name text not null,
  phone text,
  phone_normalized text,
  email text,
  locality text,

  -- Acquisition
  contacted_at timestamptz not null default timezone('utc', now()),
  reception text,
  contact_medium text,
  lead_source text,

  -- Classification
  project text,
  status text not null default 'nuevo',

  -- Broker assignment / derivation
  broker_name text,
  broker_email text,
  derived_at timestamptz,
  accepted_at timestamptz,

  -- Follow-up
  followup_3d text,
  feedback text,
  feedback_at timestamptz,

  -- Description
  request_summary text,
  interest text,
  progress text,

  -- Meta
  is_duplicate boolean not null default false,
  data_source text,
  month text,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Indexes
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_project_idx on public.leads (project);
create index if not exists leads_month_idx on public.leads (month);
create index if not exists leads_contacted_at_idx on public.leads (contacted_at desc);
create index if not exists leads_phone_normalized_idx on public.leads (phone_normalized);
create index if not exists leads_contact_id_idx on public.leads (contact_id);

-- Auto-update updated_at
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- RLS
alter table public.leads enable row level security;

create policy "leads_service_role_all"
  on public.leads
  for all
  using (true)
  with check (true);

-- ============================================================
-- RPC: leads_summary_stats
-- Returns aggregate KPIs for the leads dashboard
-- ============================================================
create or replace function public.leads_summary_stats()
returns jsonb
language sql
security invoker
as $$
  select jsonb_build_object(
    'total', (select count(*) from leads),
    'nuevos_7d', (select count(*) from leads where contacted_at >= now() - interval '7 days'),
    'falta_derivar', (select count(*) from leads where status = 'falta_derivar'),
    'derivados', (select count(*) from leads where status = 'derivado'),
    'vendidos', (select count(*) from leads where lower(feedback) = 'vendido'),
    'en_negociacion', (select count(*) from leads where lower(feedback) = 'en negociación'),
    'by_status', (
      select coalesce(jsonb_agg(jsonb_build_object('status', status, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (select status, count(*) as cnt from leads group by status) t
    ),
    'by_project', (
      select coalesce(jsonb_agg(jsonb_build_object('project', coalesce(project, 'Sin Asignar'), 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (select project, count(*) as cnt from leads group by project) t
    ),
    'by_month', (
      select coalesce(jsonb_agg(jsonb_build_object('month', month, 'count', cnt) order by month), '[]'::jsonb)
      from (select month, count(*) as cnt from leads where month is not null group by month) t
    ),
    'by_source', (
      select coalesce(jsonb_agg(jsonb_build_object('source', coalesce(lead_source, 'Desconocido'), 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (select lead_source, count(*) as cnt from leads group by lead_source) t
    ),
    'by_feedback', (
      select coalesce(jsonb_agg(jsonb_build_object('feedback', coalesce(feedback, 'Sin feedback'), 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (select feedback, count(*) as cnt from leads group by feedback) t
    )
  );
$$;

-- ============================================================
-- RPC: leads_funnel_monthly
-- Conversion funnel: Leads → Calificados (derivados) → Vendidos
-- ============================================================
create or replace function public.leads_funnel_monthly()
returns jsonb
language sql
security invoker
as $$
  select coalesce(jsonb_agg(row_data order by month), '[]'::jsonb)
  from (
    select
      month,
      jsonb_build_object(
        'month', month,
        'leads', count(*),
        'calificados', count(*) filter (where status = 'derivado'),
        'vendidos', count(*) filter (where lower(feedback) = 'vendido'),
        'en_negociacion', count(*) filter (where lower(feedback) = 'en negociación'),
        'rechazados', count(*) filter (where status in ('rechazado', 'no_derivar'))
      ) as row_data
    from leads
    where month is not null
    group by month
  ) t;
$$;

-- ============================================================
-- RPC: leads_project_month_matrix
-- Grid: project × month with lead/derived counts
-- ============================================================
create or replace function public.leads_project_month_matrix()
returns jsonb
language sql
security invoker
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'project', coalesce(project, 'Sin Asignar'),
      'month', month,
      'leads', total,
      'derivados', derivados
    )
  ), '[]'::jsonb)
  from (
    select
      project,
      month,
      count(*) as total,
      count(*) filter (where status = 'derivado') as derivados
    from leads
    where month is not null
    group by project, month
    order by project, month
  ) t;
$$;

commit;
