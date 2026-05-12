import Link from "next/link";
import { Plus, BarChart3 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LeadsTable, type LeadListRow, type FilterOptions, type CampaignOption } from "./leads-table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const VALID_SORT_FIELDS = new Set([
  "name",
  "project",
  "status",
  "feedback",
  "broker_name",
  "lead_source",
  "month",
  "contacted_at",
]);

type SearchParams = {
  q?: string;
  page?: string;
  status?: string;
  project?: string;
  month?: string;
  source?: string;
  broker?: string;
  feedback?: string;
  sort?: string;
  dir?: string;
};

function fromLeads(admin: ReturnType<typeof createSupabaseAdminClient>) {
  return (
    admin as unknown as {
      from: (
        t: string,
      ) => ReturnType<ReturnType<typeof createSupabaseAdminClient>["from"]>;
    }
  ).from("leads");
}

function parseMulti(val?: string): string[] {
  if (!val) return [];
  return val.split(",").filter(Boolean);
}

async function getLeads(params: SearchParams) {
  const pageNum = Math.max(1, Number(params.page ?? 1));
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sortBy = params.sort && VALID_SORT_FIELDS.has(params.sort) ? params.sort : "contacted_at";
  const sortDir = params.dir === "asc" ? true : false;

  const admin = createSupabaseAdminClient();
  let query = fromLeads(admin)
    .select(
      "id, name, phone, email, locality, project, status, lead_source, feedback, contacted_at, broker_name, month, contact_medium, derived_at, interest, is_duplicate, progress, followup_3d",
      { count: "exact" },
    )
    .order(sortBy, { ascending: sortDir })
    .range(from, to);

  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    query = query.or(
      `name.ilike.${like},phone.ilike.${like},email.ilike.${like},request_summary.ilike.${like},locality.ilike.${like}`,
    );
  }

  // Multi-value filters: use .in() for arrays, .eq() for single values
  const statuses = parseMulti(params.status);
  if (statuses.length === 1) query = query.eq("status", statuses[0]);
  else if (statuses.length > 1) query = query.in("status", statuses);

  const projects = parseMulti(params.project);
  if (projects.length === 1) query = query.eq("project", projects[0]);
  else if (projects.length > 1) query = query.in("project", projects);

  const months = parseMulti(params.month);
  if (months.length === 1) query = query.eq("month", months[0]);
  else if (months.length > 1) query = query.in("month", months);

  const sources = parseMulti(params.source);
  if (sources.length === 1) query = query.eq("lead_source", sources[0]);
  else if (sources.length > 1) query = query.in("lead_source", sources);

  const brokers = parseMulti(params.broker);
  if (brokers.length === 1) query = query.eq("broker_name", brokers[0]);
  else if (brokers.length > 1) query = query.in("broker_name", brokers);

  const feedbacks = parseMulti(params.feedback);
  if (feedbacks.length > 0) {
    const hasSinFeedback = feedbacks.includes("sin_feedback");
    const realFeedbacks = feedbacks.filter((f) => f !== "sin_feedback");
    if (hasSinFeedback && realFeedbacks.length === 0) {
      query = query.or("feedback.is.null,feedback.eq.Sin feedback,feedback.eq.");
    } else if (hasSinFeedback && realFeedbacks.length > 0) {
      // combine: null/empty OR in the real values
      const inList = realFeedbacks.map((f) => `feedback.eq.${f}`).join(",");
      query = query.or(`feedback.is.null,feedback.eq.Sin feedback,feedback.eq.,${inList}`);
    } else if (realFeedbacks.length === 1) {
      query = query.eq("feedback", realFeedbacks[0]);
    } else if (realFeedbacks.length > 1) {
      query = query.in("feedback", realFeedbacks);
    }
  }

  const { data, count, error } = await query;
  return {
    rows: (data ?? []) as LeadListRow[],
    total: (count ?? 0) as number,
    page: pageNum,
    error: error?.message ?? null,
  };
}

async function getFilterOptions(): Promise<FilterOptions> {
  const admin = createSupabaseAdminClient();
  const [monthsRes, sourcesRes, brokersRes, feedbacksRes] = await Promise.all([
    fromLeads(admin)
      .select("month")
      .not("month", "is", null)
      .order("month", { ascending: false })
      .limit(100),
    fromLeads(admin)
      .select("lead_source")
      .not("lead_source", "is", null)
      .limit(500),
    fromLeads(admin)
      .select("broker_name")
      .not("broker_name", "is", null)
      .limit(500),
    fromLeads(admin)
      .select("feedback")
      .not("feedback", "is", null)
      .limit(500),
  ]);

  const uniqueMonths = [
    ...new Set(
      ((monthsRes.data ?? []) as Array<{ month: string }>).map((r) => r.month),
    ),
  ];
  const uniqueSources = [
    ...new Set(
      ((sourcesRes.data ?? []) as Array<{ lead_source: string }>).map(
        (r) => r.lead_source,
      ),
    ),
  ].sort();
  const uniqueBrokers = [
    ...new Set(
      ((brokersRes.data ?? []) as Array<{ broker_name: string }>).map(
        (r) => r.broker_name,
      ),
    ),
  ].sort();
  const uniqueFeedbacks = [
    ...new Set(
      ((feedbacksRes.data ?? []) as Array<{ feedback: string }>)
        .map((r) => r.feedback)
        .filter((f) => f && f !== "Sin feedback"),
    ),
  ].sort();

  return {
    months: uniqueMonths,
    sources: uniqueSources,
    brokers: uniqueBrokers,
    feedbacks: uniqueFeedbacks,
  };
}

async function getCampaigns(): Promise<CampaignOption[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("campaigns")
    .select("id, name, status")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as CampaignOption[];
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [{ rows, total, page, error }, filters, campaigns] = await Promise.all([
    getLeads(params),
    getFilterOptions(),
    getCampaigns(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pipeline de ventas &middot;{" "}
            {total.toLocaleString("es-AR")} lead{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/leads/reportes"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <BarChart3 className="h-4 w-4" /> Reportes
          </Link>
          <Link
            href="/leads/nuevo"
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="h-4 w-4" /> Nuevo lead
          </Link>
        </div>
      </header>

      <LeadsTable
        rows={rows}
        total={total}
        page={page}
        totalPages={totalPages}
        filters={filters}
        campaigns={campaigns}
        error={error}
      />
    </div>
  );
}
