begin;

-- ============================================================
-- DATA CLEANUP: normalize broker names from Excel import
-- ============================================================
UPDATE leads SET broker_name = 'Qala' WHERE lower(trim(broker_name)) IN ('qala', 'qala desarrollos');
UPDATE leads SET broker_name = 'Crestale' WHERE lower(trim(broker_name)) LIKE '%crestale%';
UPDATE leads SET broker_name = 'Marco Spiaggi' WHERE lower(trim(broker_name)) LIKE '%spiaggi%';
UPDATE leads SET broker_name = 'Zejda' WHERE lower(trim(broker_name)) IN ('zejda', 'marcos zejda', 'marcos sejda');
UPDATE leads SET broker_name = 'Manuel Turner' WHERE lower(trim(broker_name)) IN ('manuel turner', 'manu turner');
UPDATE leads SET broker_name = 'Gino Zavanella' WHERE lower(trim(broker_name)) IN ('gino zavanella', 'gino');
UPDATE leads SET broker_name = trim(broker_name) WHERE broker_name IS NOT NULL AND broker_name != trim(broker_name);

-- Index for broker queries
CREATE INDEX IF NOT EXISTS leads_broker_name_idx ON public.leads (broker_name);

-- ============================================================
-- Drop old zero-arg RPCs (will be replaced with filtered versions)
-- ============================================================
DROP FUNCTION IF EXISTS public.leads_summary_stats();
DROP FUNCTION IF EXISTS public.leads_funnel_monthly();
DROP FUNCTION IF EXISTS public.leads_project_month_matrix();

-- ============================================================
-- RPC: leads_available_months
-- ============================================================
CREATE OR REPLACE FUNCTION public.leads_available_months()
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER AS $$
  SELECT coalesce(jsonb_agg(month ORDER BY month), '[]'::jsonb)
  FROM (SELECT DISTINCT month FROM leads WHERE month IS NOT NULL) t;
$$;

-- ============================================================
-- RPC: leads_summary_stats (with month filter)
-- ============================================================
CREATE OR REPLACE FUNCTION public.leads_summary_stats(p_months text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER AS $$
  WITH f AS (
    SELECT * FROM leads
    WHERE p_months IS NULL OR month = ANY(p_months)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM f),
    'nuevos_7d', (SELECT count(*) FROM f WHERE contacted_at >= now() - interval '7 days'),
    'falta_derivar', (SELECT count(*) FROM f WHERE status = 'falta_derivar'),
    'derivados', (SELECT count(*) FROM f WHERE status = 'derivado'),
    'vendidos', (SELECT count(*) FROM f WHERE lower(feedback) = 'vendido'),
    'en_negociacion', (SELECT count(*) FROM f WHERE lower(feedback) = 'en negociación'),
    'by_status', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('status', status, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (SELECT status, count(*) AS cnt FROM f GROUP BY status) t
    ),
    'by_project', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('project', coalesce(project, 'Sin Asignar'), 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (SELECT project, count(*) AS cnt FROM f GROUP BY project) t
    ),
    'by_month', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('month', month, 'count', cnt) ORDER BY month), '[]'::jsonb)
      FROM (SELECT month, count(*) AS cnt FROM f WHERE month IS NOT NULL GROUP BY month) t
    ),
    'by_source', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('source', coalesce(lead_source, 'Desconocido'), 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (SELECT lead_source, count(*) AS cnt FROM f GROUP BY lead_source) t
    ),
    'by_feedback', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('feedback', coalesce(feedback, 'Sin feedback'), 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (SELECT feedback, count(*) AS cnt FROM f GROUP BY feedback) t
    )
  );
$$;

-- ============================================================
-- RPC: leads_funnel_monthly (with month filter)
-- ============================================================
CREATE OR REPLACE FUNCTION public.leads_funnel_monthly(p_months text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER AS $$
  SELECT coalesce(jsonb_agg(row_data ORDER BY month), '[]'::jsonb)
  FROM (
    SELECT month,
      jsonb_build_object(
        'month', month,
        'leads', count(*),
        'calificados', count(*) FILTER (WHERE status = 'derivado'),
        'vendidos', count(*) FILTER (WHERE lower(feedback) = 'vendido'),
        'en_negociacion', count(*) FILTER (WHERE lower(feedback) = 'en negociación'),
        'rechazados', count(*) FILTER (WHERE status IN ('rechazado', 'no_derivar'))
      ) AS row_data
    FROM leads
    WHERE month IS NOT NULL
      AND (p_months IS NULL OR month = ANY(p_months))
    GROUP BY month
  ) t;
$$;

-- ============================================================
-- RPC: leads_project_month_matrix (with month filter)
-- ============================================================
CREATE OR REPLACE FUNCTION public.leads_project_month_matrix(p_months text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER AS $$
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'project', coalesce(project, 'Sin Asignar'),
      'month', month,
      'leads', total,
      'derivados', derivados
    )
  ), '[]'::jsonb)
  FROM (
    SELECT project, month,
      count(*) AS total,
      count(*) FILTER (WHERE status = 'derivado') AS derivados
    FROM leads
    WHERE month IS NOT NULL
      AND (p_months IS NULL OR month = ANY(p_months))
    GROUP BY project, month
    ORDER BY project, month
  ) t;
$$;

-- ============================================================
-- RPC: leads_broker_stats (NEW - inmobiliaria breakdown)
-- ============================================================
CREATE OR REPLACE FUNCTION public.leads_broker_stats(p_months text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER AS $$
  SELECT coalesce(jsonb_agg(row_data ORDER BY total DESC), '[]'::jsonb)
  FROM (
    SELECT
      jsonb_build_object(
        'broker', broker_name,
        'total', count(*),
        'derivados', count(*) FILTER (WHERE status = 'derivado'),
        'en_negociacion', count(*) FILTER (WHERE lower(feedback) = 'en negociación'),
        'vendidos', count(*) FILTER (WHERE lower(feedback) = 'vendido'),
        'rechazados', count(*) FILTER (WHERE status IN ('rechazado', 'no_derivar')),
        'sin_feedback', count(*) FILTER (WHERE status = 'derivado' AND (feedback IS NULL OR feedback = '' OR feedback = 'Sin feedback'))
      ) AS row_data,
      count(*) AS total
    FROM leads
    WHERE broker_name IS NOT NULL AND broker_name != ''
      AND (p_months IS NULL OR month = ANY(p_months))
    GROUP BY broker_name
  ) t;
$$;

commit;
