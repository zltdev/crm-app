begin;

-- ============================================================
-- TABLE: meta_campaigns — Meta Ads campaign performance data
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meta_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project text NOT NULL,
  name text NOT NULL,
  month text NOT NULL,             -- YYYY-MM format
  budget numeric NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  messages integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read meta_campaigns"
  ON public.meta_campaigns FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS meta_campaigns_month_idx ON public.meta_campaigns (month);
CREATE INDEX IF NOT EXISTS meta_campaigns_project_idx ON public.meta_campaigns (project);

-- ============================================================
-- RPC: leads_available_months (includes meta_campaigns months)
-- ============================================================
CREATE OR REPLACE FUNCTION public.leads_available_months()
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER AS $$
  SELECT coalesce(jsonb_agg(month ORDER BY month), '[]'::jsonb)
  FROM (
    SELECT DISTINCT month FROM leads WHERE month IS NOT NULL
    UNION
    SELECT DISTINCT month FROM meta_campaigns WHERE month IS NOT NULL
  ) t;
$$;

-- ============================================================
-- RPC: meta_campaigns_summary — aggregate Meta Ads KPIs
-- ============================================================
CREATE OR REPLACE FUNCTION public.meta_campaigns_summary(p_months text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER AS $$
  WITH f AS (
    SELECT * FROM meta_campaigns
    WHERE p_months IS NULL OR month = ANY(p_months)
  ),
  by_month AS (
    SELECT month,
      sum(budget)::numeric(12,2) AS budget,
      sum(impressions) AS impressions,
      sum(reach) AS reach,
      sum(clicks) AS clicks,
      sum(messages) AS messages,
      count(*) AS campaigns
    FROM f GROUP BY month
  ),
  by_project AS (
    SELECT project,
      sum(budget)::numeric(12,2) AS budget,
      sum(impressions) AS impressions,
      sum(reach) AS reach,
      sum(clicks) AS clicks,
      sum(messages) AS messages
    FROM f GROUP BY project
  )
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'budget', (SELECT coalesce(sum(budget),0) FROM f)::numeric(12,2),
      'impressions', (SELECT coalesce(sum(impressions),0) FROM f),
      'reach', (SELECT coalesce(sum(reach),0) FROM f),
      'clicks', (SELECT coalesce(sum(clicks),0) FROM f),
      'messages', (SELECT coalesce(sum(messages),0) FROM f),
      'campaigns', (SELECT count(*) FROM f),
      'cpm', CASE WHEN (SELECT sum(impressions) FROM f) > 0
        THEN ((SELECT sum(budget) FROM f) / (SELECT sum(impressions) FROM f) * 1000)::numeric(10,2)
        ELSE 0 END,
      'cpc', CASE WHEN (SELECT sum(clicks) FROM f) > 0
        THEN ((SELECT sum(budget) FROM f) / (SELECT sum(clicks) FROM f))::numeric(10,2)
        ELSE 0 END,
      'cost_per_message', CASE WHEN (SELECT sum(messages) FROM f) > 0
        THEN ((SELECT sum(budget) FROM f) / (SELECT sum(messages) FROM f))::numeric(10,2)
        ELSE 0 END
    ),
    'by_month', (SELECT coalesce(jsonb_agg(
      jsonb_build_object('month', month, 'budget', budget, 'impressions', impressions, 'reach', reach, 'clicks', clicks, 'messages', messages, 'campaigns', campaigns)
      ORDER BY month), '[]'::jsonb) FROM by_month),
    'by_project', (SELECT coalesce(jsonb_agg(
      jsonb_build_object('project', project, 'budget', budget, 'impressions', impressions, 'reach', reach, 'clicks', clicks, 'messages', messages)
      ORDER BY budget DESC), '[]'::jsonb) FROM by_project),
    'campaigns', (SELECT coalesce(jsonb_agg(
      jsonb_build_object('name', name, 'project', project, 'month', month, 'budget', budget::numeric(12,2), 'impressions', impressions, 'reach', reach, 'clicks', clicks, 'messages', messages)
      ORDER BY month, project), '[]'::jsonb) FROM f)
  );
$$;

-- ============================================================
-- RPC: leads_conversion_funnel — leads + ad spend for ROI
-- ============================================================
CREATE OR REPLACE FUNCTION public.leads_conversion_funnel(p_months text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER AS $$
  WITH lead_stats AS (
    SELECT month,
      count(*) AS contactos,
      count(*) FILTER (WHERE status NOT IN ('no_derivar','rechazado')) AS leads_calificados,
      count(*) FILTER (WHERE status = 'derivado') AS derivados,
      count(*) FILTER (WHERE lower(feedback) = 'en negociación') AS en_negociacion,
      count(*) FILTER (WHERE lower(feedback) = 'vendido') AS vendidos
    FROM leads
    WHERE month IS NOT NULL
      AND (p_months IS NULL OR month = ANY(p_months))
    GROUP BY month
  ),
  campaign_stats AS (
    SELECT month,
      sum(budget)::numeric(12,2) AS inversion,
      sum(messages) AS mensajes_ads
    FROM meta_campaigns
    WHERE p_months IS NULL OR month = ANY(p_months)
    GROUP BY month
  )
  SELECT jsonb_build_object(
    'by_month', (
      SELECT coalesce(jsonb_agg(
        jsonb_build_object(
          'month', coalesce(l.month, c.month),
          'inversion', coalesce(c.inversion, 0),
          'mensajes_ads', coalesce(c.mensajes_ads, 0),
          'contactos', coalesce(l.contactos, 0),
          'leads_calificados', coalesce(l.leads_calificados, 0),
          'derivados', coalesce(l.derivados, 0),
          'en_negociacion', coalesce(l.en_negociacion, 0),
          'vendidos', coalesce(l.vendidos, 0),
          'costo_por_lead', CASE WHEN coalesce(l.contactos, 0) > 0
            THEN (coalesce(c.inversion, 0) / l.contactos)::numeric(10,2) ELSE 0 END,
          'costo_por_derivado', CASE WHEN coalesce(l.derivados, 0) > 0
            THEN (coalesce(c.inversion, 0) / l.derivados)::numeric(10,2) ELSE 0 END
        ) ORDER BY coalesce(l.month, c.month)
      ), '[]'::jsonb)
      FROM lead_stats l FULL OUTER JOIN campaign_stats c ON l.month = c.month
    ),
    'totals', jsonb_build_object(
      'inversion', (SELECT coalesce(sum(inversion), 0) FROM campaign_stats),
      'mensajes_ads', (SELECT coalesce(sum(mensajes_ads), 0) FROM campaign_stats),
      'contactos', (SELECT coalesce(sum(contactos), 0) FROM lead_stats),
      'leads_calificados', (SELECT coalesce(sum(leads_calificados), 0) FROM lead_stats),
      'derivados', (SELECT coalesce(sum(derivados), 0) FROM lead_stats),
      'en_negociacion', (SELECT coalesce(sum(en_negociacion), 0) FROM lead_stats),
      'vendidos', (SELECT coalesce(sum(vendidos), 0) FROM lead_stats)
    )
  );
$$;

-- ============================================================
-- RPC: leads_broker_monthly — per-broker per-month breakdown
-- ============================================================
CREATE OR REPLACE FUNCTION public.leads_broker_monthly(p_months text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER AS $$
  WITH f AS (
    SELECT * FROM leads
    WHERE broker_name IS NOT NULL AND broker_name != ''
      AND (p_months IS NULL OR month = ANY(p_months))
  ),
  broker_month AS (
    SELECT broker_name, month,
      count(*) AS total,
      count(*) FILTER (WHERE status = 'derivado') AS derivados,
      count(*) FILTER (WHERE lower(feedback) = 'en negociación') AS en_negociacion,
      count(*) FILTER (WHERE lower(feedback) = 'vendido') AS vendidos,
      count(*) FILTER (WHERE feedback IS NOT NULL AND feedback != '' AND feedback != 'Sin feedback') AS con_feedback,
      count(*) FILTER (WHERE feedback IS NULL OR feedback = '' OR feedback = 'Sin feedback') AS sin_feedback
    FROM f
    WHERE month IS NOT NULL
    GROUP BY broker_name, month
  ),
  broker_totals AS (
    SELECT broker_name,
      count(*) AS total,
      count(*) FILTER (WHERE status = 'derivado') AS derivados,
      count(*) FILTER (WHERE lower(feedback) = 'en negociación') AS en_negociacion,
      count(*) FILTER (WHERE lower(feedback) = 'vendido') AS vendidos,
      count(*) FILTER (WHERE feedback IS NOT NULL AND feedback != '' AND feedback != 'Sin feedback') AS con_feedback,
      count(*) FILTER (WHERE feedback IS NULL OR feedback = '' OR feedback = 'Sin feedback') AS sin_feedback,
      count(*) FILTER (WHERE status IN ('rechazado','no_derivar')) AS rechazados
    FROM f
    GROUP BY broker_name
  )
  SELECT jsonb_build_object(
    'brokers', (
      SELECT coalesce(jsonb_agg(
        jsonb_build_object(
          'broker', bt.broker_name,
          'total', bt.total,
          'derivados', bt.derivados,
          'en_negociacion', bt.en_negociacion,
          'vendidos', bt.vendidos,
          'con_feedback', bt.con_feedback,
          'sin_feedback', bt.sin_feedback,
          'rechazados', bt.rechazados,
          'efectividad', CASE WHEN bt.derivados > 0
            THEN ((bt.vendidos + bt.en_negociacion)::numeric / bt.derivados * 100)::numeric(5,1)
            ELSE 0 END,
          'by_month', (
            SELECT coalesce(jsonb_agg(
              jsonb_build_object('month', bm.month, 'total', bm.total, 'derivados', bm.derivados,
                'en_negociacion', bm.en_negociacion, 'vendidos', bm.vendidos, 'sin_feedback', bm.sin_feedback)
              ORDER BY bm.month), '[]'::jsonb)
            FROM broker_month bm WHERE bm.broker_name = bt.broker_name
          )
        ) ORDER BY bt.total DESC
      ), '[]'::jsonb)
      FROM broker_totals bt
    ),
    'months', (
      SELECT coalesce(jsonb_agg(DISTINCT month ORDER BY month), '[]'::jsonb)
      FROM broker_month
    )
  );
$$;

commit;
