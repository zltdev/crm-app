-- Función agregadora que devuelve todos los stats del dashboard en una sola llamada.
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with
  contacts_total as (select count(*)::int as n from contacts),
  contacts_new_7d as (
    select count(*)::int as n from contacts
     where created_at > now() - interval '7 days'
  ),
  touchpoints_total as (select count(*)::int as n from contact_touchpoints),
  import_batches_total as (select count(*)::int as n from import_batches),
  campaigns_active as (
    select count(*)::int as n from campaigns where status = 'active'
  ),
  contacts_by_week as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('week', week_start, 'count', c)
        order by week_start
      ),
      '[]'::jsonb
    ) as j
    from (
      select date_trunc('week', created_at) as week_start, count(*)::int as c
        from contacts
       where created_at > now() - interval '8 weeks'
       group by week_start
    ) q
  ),
  touchpoints_by_type as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('type', source_type, 'count', c)
        order by c desc
      ),
      '[]'::jsonb
    ) as j
    from (
      select source_type, count(*)::int as c
        from contact_touchpoints
       group by source_type
    ) q
  ),
  top_campaigns as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'count', c,
          'status', status
        )
        order by c desc
      ),
      '[]'::jsonb
    ) as j
    from (
      select c.id, c.name, c.status, count(cd.id)::int as c
        from campaigns c
        left join campaign_deliveries cd on cd.campaign_id = c.id
       group by c.id, c.name, c.status
       order by count(cd.id) desc
       limit 5
    ) q
  ),
  deliveries_by_status as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('status', delivery_status, 'count', c)
      ),
      '[]'::jsonb
    ) as j
    from (
      select delivery_status, count(*)::int as c
        from campaign_deliveries
       group by delivery_status
    ) q
  )
  select jsonb_build_object(
    'contacts_total', (select n from contacts_total),
    'contacts_new_7d', (select n from contacts_new_7d),
    'touchpoints_total', (select n from touchpoints_total),
    'import_batches_total', (select n from import_batches_total),
    'campaigns_active', (select n from campaigns_active),
    'contacts_by_week', (select j from contacts_by_week),
    'touchpoints_by_type', (select j from touchpoints_by_type),
    'top_campaigns', (select j from top_campaigns),
    'deliveries_by_status', (select j from deliveries_by_status)
  );
$$;

grant execute on function public.dashboard_stats() to authenticated, anon, service_role;
