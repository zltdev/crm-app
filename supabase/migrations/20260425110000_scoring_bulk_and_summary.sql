-- 1) RPC para recalcular score de todos los contactos en bulk.
--    Replica las reglas de lib/crm/scoring.ts (modelo "v1").
create or replace function public.recalculate_all_scores()
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  affected integer := 0;
  weight_fit constant numeric := 0.20;
  weight_eng constant numeric := 0.30;
  weight_int constant numeric := 0.30;
  weight_fre constant numeric := 0.20;
begin
  update public.contact_scores set is_current = false where is_current = true;

  with stats as (
    select
      ct.contact_id,
      count(*) filter (where ct.occurred_at >= now() - interval '90 days') as count_90d,
      count(*) filter (
        where ct.occurred_at >= now() - interval '30 days'
          and ct.source_type in ('event','expo','phone_call','form')
      ) as hot_30d,
      max(ct.occurred_at) as last_at
    from public.contact_touchpoints ct
    group by ct.contact_id
  ),
  scored as (
    select
      contact_id, count_90d, hot_30d, last_at,
      case
        when count_90d <= 0 then 0
        when count_90d = 1 then 20
        when count_90d <= 4 then 45
        when count_90d <= 9 then 70
        else 100
      end as engagement,
      case
        when hot_30d <= 0 then 0
        when hot_30d = 1 then 35
        when hot_30d = 2 then 60
        when hot_30d <= 4 then 85
        else 100
      end as intent,
      case
        when last_at is null then 0
        when last_at >= now() - interval '7 days' then 100
        when last_at >= now() - interval '30 days' then 70
        when last_at >= now() - interval '90 days' then 40
        when last_at >= now() - interval '180 days' then 15
        else 0
      end as freshness,
      50 as fit
    from stats
  )
  insert into public.contact_scores (
    contact_id, fit_score, engagement_score, intent_score, freshness_score,
    score_total, scoring_model, is_current, metadata
  )
  select
    contact_id, fit, engagement, intent, freshness,
    round(
      fit * weight_fit
      + engagement * weight_eng
      + intent * weight_int
      + freshness * weight_fre,
    2),
    'v1',
    true,
    jsonb_build_object(
      'model', 'v1',
      'touchpoints_90d', count_90d,
      'hot_touchpoints_30d', hot_30d,
      'last_at', last_at
    )
  from scored;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.recalculate_all_scores() to authenticated, service_role;

-- 2) Resumen de touchpoints por contacto: count + array de fuentes únicas.
create or replace function public.contacts_touchpoint_summary(contact_ids uuid[])
returns table (
  contact_id uuid,
  touchpoint_count integer,
  source_types text[],
  source_count integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    ct.contact_id,
    count(*)::int as touchpoint_count,
    array_agg(distinct ct.source_type order by ct.source_type) as source_types,
    count(distinct ct.source_type)::int as source_count
  from public.contact_touchpoints ct
  where ct.contact_id = any (contact_ids)
  group by ct.contact_id;
$$;

grant execute on function public.contacts_touchpoint_summary(uuid[]) to authenticated, service_role;
