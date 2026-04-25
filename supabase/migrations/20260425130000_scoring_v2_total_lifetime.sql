-- Scoring v2: Engagement e Intent como totales acumulados (sin ventana).
-- Solo Freshness decae con el tiempo. Buckets de Freshness más suaves.
-- Justificación: con imports de expos/eventos viejos, las ventanas cortas
-- daban 0 a casi todo. "Cuántas veces interactuó" es contexto que no
-- expira; la actualidad queda expresada en Freshness.
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
      count(*) as total_count,
      count(*) filter (
        where ct.source_type in ('event','expo','phone_call','form')
      ) as hot_count,
      max(ct.occurred_at) as last_at
    from public.contact_touchpoints ct
    group by ct.contact_id
  ),
  scored as (
    select
      contact_id, total_count, hot_count, last_at,
      case
        when total_count <= 0 then 0
        when total_count = 1 then 20
        when total_count <= 4 then 45
        when total_count <= 9 then 70
        else 100
      end as engagement,
      case
        when hot_count <= 0 then 0
        when hot_count = 1 then 35
        when hot_count = 2 then 60
        when hot_count <= 4 then 85
        else 100
      end as intent,
      case
        when last_at is null then 0
        when last_at >= now() - interval '7 days' then 100
        when last_at >= now() - interval '30 days' then 80
        when last_at >= now() - interval '90 days' then 60
        when last_at >= now() - interval '180 days' then 40
        when last_at >= now() - interval '365 days' then 20
        else 5
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
    'v2',
    true,
    jsonb_build_object(
      'model', 'v2',
      'total_touchpoints', total_count,
      'hot_touchpoints', hot_count,
      'last_at', last_at
    )
  from scored;

  get diagnostics affected = row_count;
  return affected;
end;
$$;
