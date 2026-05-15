begin;

-- ============================================================
-- Update leads_conversion_funnel to source "contactos" from
-- agent touchpoints (Lead_Brutos) instead of leads table.
--
-- Funnel now matches Excel "Conversión Leads" pivot table:
--   Contactos  = Lead_Brutos count (agent touchpoints by month)
--   Leads      = Lead ZLT count (all leads by month)
--   Derivados  = leads with status = 'derivado'
--   Vendidos   = leads with feedback = 'vendido'
-- ============================================================

CREATE OR REPLACE FUNCTION public.leads_conversion_funnel(p_months text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER AS $$
  WITH contacto_stats AS (
    -- Contactos = agent touchpoints from Lead_Brutos, grouped by month
    SELECT to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
      count(*) AS contactos
    FROM contact_touchpoints
    WHERE source_type = 'agent' AND source_name = 'Lead_Brutos'
      AND (p_months IS NULL OR to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM') = ANY(p_months))
    GROUP BY to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM')
  ),
  lead_stats AS (
    -- Leads = all Lead ZLT entries by month
    SELECT month,
      count(*) AS leads,
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
  ),
  all_months AS (
    SELECT DISTINCT month FROM (
      SELECT month FROM contacto_stats
      UNION SELECT month FROM lead_stats
      UNION SELECT month FROM campaign_stats
    ) t
  )
  SELECT jsonb_build_object(
    'by_month', (
      SELECT coalesce(jsonb_agg(
        jsonb_build_object(
          'month', m.month,
          'inversion', coalesce(cs.inversion, 0),
          'mensajes_ads', coalesce(cs.mensajes_ads, 0),
          'contactos', coalesce(ct.contactos, 0),
          'leads_calificados', coalesce(l.leads, 0),
          'derivados', coalesce(l.derivados, 0),
          'en_negociacion', coalesce(l.en_negociacion, 0),
          'vendidos', coalesce(l.vendidos, 0),
          'costo_por_lead', CASE WHEN coalesce(ct.contactos, 0) > 0
            THEN (coalesce(cs.inversion, 0) / ct.contactos)::numeric(10,2) ELSE 0 END,
          'costo_por_derivado', CASE WHEN coalesce(l.derivados, 0) > 0
            THEN (coalesce(cs.inversion, 0) / l.derivados)::numeric(10,2) ELSE 0 END
        ) ORDER BY m.month
      ), '[]'::jsonb)
      FROM all_months m
      LEFT JOIN contacto_stats ct ON ct.month = m.month
      LEFT JOIN lead_stats l ON l.month = m.month
      LEFT JOIN campaign_stats cs ON cs.month = m.month
    ),
    'totals', jsonb_build_object(
      'inversion', (SELECT coalesce(sum(inversion), 0) FROM campaign_stats),
      'mensajes_ads', (SELECT coalesce(sum(mensajes_ads), 0) FROM campaign_stats),
      'contactos', (SELECT coalesce(sum(contactos), 0) FROM contacto_stats),
      'leads_calificados', (SELECT coalesce(sum(leads), 0) FROM lead_stats),
      'derivados', (SELECT coalesce(sum(derivados), 0) FROM lead_stats),
      'en_negociacion', (SELECT coalesce(sum(en_negociacion), 0) FROM lead_stats),
      'vendidos', (SELECT coalesce(sum(vendidos), 0) FROM lead_stats)
    )
  );
$$;

-- ============================================================
-- Update leads_available_months to include touchpoint months
-- ============================================================
CREATE OR REPLACE FUNCTION public.leads_available_months()
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER AS $$
  SELECT coalesce(jsonb_agg(month ORDER BY month), '[]'::jsonb)
  FROM (
    SELECT DISTINCT month FROM (
      SELECT month FROM leads WHERE month IS NOT NULL
      UNION
      SELECT to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month
      FROM contact_touchpoints
      WHERE source_type = 'agent' AND source_name = 'Lead_Brutos'
    ) t
  ) u;
$$;

-- ============================================================
-- Drop the email unique index (it was already dropped at runtime;
-- this makes the migration file authoritative)
-- ============================================================
DROP INDEX IF EXISTS public.contacts_email_normalized_uniq;

-- ============================================================
-- Add permissive RLS policies for anon role
-- (matches leads table pattern)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'anon_all'
  ) THEN
    CREATE POLICY "anon_all" ON public.contacts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_touchpoints' AND policyname = 'anon_all'
  ) THEN
    CREATE POLICY "anon_all" ON public.contact_touchpoints FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agent_conversations' AND policyname = 'anon_all'
  ) THEN
    CREATE POLICY "anon_all" ON public.agent_conversations FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

commit;
