"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Phone,
  Mail,
  Calendar,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Megaphone,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LeadStatusBadge,
  LeadFeedbackBadge,
} from "@/components/crm/lead-status-badge";
import { SelectionBar } from "@/components/crm/selection-bar";
import { NewCampaignDialog } from "@/components/crm/new-campaign-dialog";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_PROJECTS } from "@/lib/crm/leads";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type LeadListRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  locality: string | null;
  project: string | null;
  status: string;
  lead_source: string | null;
  feedback: string | null;
  contacted_at: string;
  broker_name: string | null;
  month: string | null;
  contact_medium: string | null;
  derived_at: string | null;
  interest: string | null;
  is_duplicate: boolean;
  progress: string | null;
  followup_3d: string | null;
};

export type FilterOptions = {
  months: string[];
  sources: string[];
  brokers: string[];
  feedbacks: string[];
};

export type CampaignOption = {
  id: string;
  name: string;
  status: string;
};

type SortDir = "asc" | "desc";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MONTH_LABELS: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

function fmtMonth(m: string | null) {
  if (!m) return "—";
  const [y, mm] = m.split("-");
  return `${MONTH_LABELS[mm] ?? mm} ${y}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function parseMulti(val: string | null): string[] {
  if (!val) return [];
  return val.split(",").filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  MultiSelect dropdown                                               */
/* ------------------------------------------------------------------ */

function MultiSelect({
  options,
  selected,
  onChange,
  renderLabel,
}: {
  label?: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  renderLabel?: (v: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const selSet = useMemo(() => new Set(selected), [selected]);

  function toggle(val: string) {
    const next = new Set(selSet);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    onChange([...next]);
  }

  const displayLabel =
    selected.length === 0
      ? `Todos`
      : selected.length <= 2
        ? selected.map((v) => (renderLabel ? renderLabel(v) : v)).join(", ")
        : `${selected.length} sel.`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-sm text-foreground hover:bg-muted transition-colors"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full min-w-[160px] overflow-y-auto rounded-md border border-border bg-card shadow-lg">
            <div className="p-1">
              <button
                type="button"
                onClick={() => {
                  onChange([]);
                  setOpen(false);
                }}
                className="w-full rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
              >
                Limpiar
              </button>
              {options.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={selSet.has(opt)}
                    onChange={() => toggle(opt)}
                  />
                  <span className="truncate">
                    {renderLabel ? renderLabel(opt) : opt}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sortable column header                                             */
/* ------------------------------------------------------------------ */

function SortHeader({
  label,
  field,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  field: string;
  currentSort: string;
  currentDir: SortDir;
  onSort: (field: string) => void;
  className?: string;
}) {
  const active = currentSort === field;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {active ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </TableHead>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function LeadsTable({
  rows,
  total,
  page,
  totalPages,
  filters,
  campaigns,
  error,
}: {
  rows: LeadListRow[];
  total: number;
  page: number;
  totalPages: number;
  filters: FilterOptions;
  campaigns: CampaignOption[];
  error: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Current filter state from URL
  const q = searchParams.get("q") ?? "";
  const statusFilter = parseMulti(searchParams.get("status"));
  const projectFilter = parseMulti(searchParams.get("project"));
  const monthFilter = parseMulti(searchParams.get("month"));
  const brokerFilter = parseMulti(searchParams.get("broker"));
  const sourceFilter = parseMulti(searchParams.get("source"));
  const feedbackFilter = parseMulti(searchParams.get("feedback"));
  const sortBy = searchParams.get("sort") ?? "contacted_at";
  const sortDir = (searchParams.get("dir") ?? "desc") as SortDir;

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);

  const hasFilters =
    q ||
    statusFilter.length > 0 ||
    projectFilter.length > 0 ||
    monthFilter.length > 0 ||
    brokerFilter.length > 0 ||
    sourceFilter.length > 0 ||
    feedbackFilter.length > 0;

  const activeFilterCount =
    (statusFilter.length > 0 ? 1 : 0) +
    (projectFilter.length > 0 ? 1 : 0) +
    (monthFilter.length > 0 ? 1 : 0) +
    (brokerFilter.length > 0 ? 1 : 0) +
    (sourceFilter.length > 0 ? 1 : 0) +
    (feedbackFilter.length > 0 ? 1 : 0);

  // Navigation helper
  const navigate = useCallback(
    (overrides: Record<string, string | string[] | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Remove page when filters change
      if (!("page" in overrides)) params.delete("page");

      for (const [k, v] of Object.entries(overrides)) {
        if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
          params.delete(k);
        } else if (Array.isArray(v)) {
          params.set(k, v.join(","));
        } else {
          params.set(k, v);
        }
      }
      router.push(`/leads?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Sort handler
  function handleSort(field: string) {
    if (sortBy === field) {
      navigate({ sort: field, dir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      navigate({ sort: field, dir: "desc" });
    }
  }

  // Selection handlers
  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleAll() {
    if (allOnPageSelected) {
      const next = new Set(selected);
      rows.forEach((r) => next.delete(r.id));
      setSelected(next);
      setAllMatching(false);
    } else {
      const next = new Set(selected);
      rows.forEach((r) => next.add(r.id));
      setSelected(next);
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
      setAllMatching(false);
    } else {
      next.add(id);
    }
    setSelected(next);
  }

  // Build current filter params for bulk action
  const currentFilters = useMemo(() => {
    const f: Record<string, string> = {};
    if (q) f.q = q;
    if (statusFilter.length) f.status = statusFilter.join(",");
    if (projectFilter.length) f.project = projectFilter.join(",");
    if (monthFilter.length) f.month = monthFilter.join(",");
    if (brokerFilter.length) f.broker = brokerFilter.join(",");
    if (sourceFilter.length) f.source = sourceFilter.join(",");
    if (feedbackFilter.length) f.feedback = feedbackFilter.join(",");
    return f;
  }, [q, statusFilter, projectFilter, monthFilter, brokerFilter, sourceFilter, feedbackFilter]);

  // Search form submit
  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    navigate({ q: (fd.get("q") as string) || undefined });
  }

  return (
    <>
      {/* Selection bar */}
      <SelectionBar
        count={allMatching ? total : selected.size}
        totalFiltered={total}
        allMatchingActive={allMatching}
        onSelectAllMatching={() => setAllMatching(true)}
        onClear={() => {
          setSelected(new Set());
          setAllMatching(false);
        }}
      >
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCampaignDialogOpen(true)}
        >
          <Megaphone className="h-3.5 w-3.5" />
          Crear campana
        </Button>
      </SelectionBar>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-3">
            {/* Row 1: search + main filters */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <form onSubmit={handleSearch} className="md:col-span-3 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Search className="h-3 w-3" /> Buscar
                </label>
                <div className="flex gap-1">
                  <Input
                    name="q"
                    defaultValue={q}
                    placeholder="Nombre, tel, email..."
                    className="h-9"
                  />
                  <Button type="submit" size="sm" variant="secondary" className="h-9 px-2">
                    <Search className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>

              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <MultiSelect
                  label="Estado"
                  options={[...LEAD_STATUSES]}
                  selected={statusFilter}
                  onChange={(v) => navigate({ status: v })}
                  renderLabel={(s) => LEAD_STATUS_LABELS[s as keyof typeof LEAD_STATUS_LABELS] ?? s}
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Proyecto</label>
                <MultiSelect
                  label="Proyecto"
                  options={[...LEAD_PROJECTS]}
                  selected={projectFilter}
                  onChange={(v) => navigate({ project: v })}
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Mes</label>
                <MultiSelect
                  label="Mes"
                  options={filters.months}
                  selected={monthFilter}
                  onChange={(v) => navigate({ month: v })}
                  renderLabel={fmtMonth}
                />
              </div>

              <div className="md:col-span-3 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Broker</label>
                <MultiSelect
                  label="Broker"
                  options={filters.brokers}
                  selected={brokerFilter}
                  onChange={(v) => navigate({ broker: v })}
                />
              </div>
            </div>

            {/* Row 2: source + feedback + clear */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Fuente</label>
                <MultiSelect
                  label="Fuente"
                  options={filters.sources}
                  selected={sourceFilter}
                  onChange={(v) => navigate({ source: v })}
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Feedback</label>
                <MultiSelect
                  label="Feedback"
                  options={["sin_feedback", ...filters.feedbacks]}
                  selected={feedbackFilter}
                  onChange={(v) => navigate({ feedback: v })}
                  renderLabel={(v) => (v === "sin_feedback" ? "Sin feedback" : v)}
                />
              </div>

              <div className="md:col-span-8 flex items-end gap-2">
                {hasFilters && (
                  <>
                    <Badge variant="outline" className="h-8 px-2 gap-1">
                      <Filter className="h-3 w-3" />
                      {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""}
                    </Badge>
                    <Link
                      href="/leads"
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      <X className="h-3.5 w-3.5" /> Limpiar
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            Error: {error}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allOnPageSelected && rows.length > 0}
                    onChange={toggleAll}
                  />
                </TableHead>
                <SortHeader label="Nombre" field="name" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} className="min-w-[180px]" />
                <SortHeader label="Proyecto" field="project" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                <SortHeader label="Estado" field="status" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                <SortHeader label="Feedback" field="feedback" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                <SortHeader label="Broker" field="broker_name" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                <SortHeader label="Fuente" field="lead_source" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                <TableHead>Medio</TableHead>
                <TableHead>Localidad</TableHead>
                <SortHeader label="Mes" field="month" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                <SortHeader label="Contacto" field="contacted_at" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                <TableHead>Derivacion</TableHead>
                <TableHead>Seguimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={13}
                    className="text-center text-muted-foreground py-12"
                  >
                    No se encontraron leads.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className={`${lead.is_duplicate ? "opacity-60" : ""} ${selected.has(lead.id) ? "bg-primary/5" : ""}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(lead.id)}
                        onChange={() => toggleOne(lead.id)}
                      />
                    </TableCell>

                    <TableCell>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {lead.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        {lead.phone && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                            <Phone className="h-2.5 w-2.5" />
                            {lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                            <Mail className="h-2.5 w-2.5" />
                            {lead.email.length > 20 ? lead.email.slice(0, 20) + "..." : lead.email}
                          </span>
                        )}
                      </div>
                      {lead.is_duplicate && (
                        <Badge variant="warning" className="text-[10px] px-1.5 py-0 mt-0.5">
                          Duplicado
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {lead.project ? (
                        <Badge variant="outline" className="text-xs">{lead.project}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{"—"}</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>

                    <TableCell>
                      <LeadFeedbackBadge feedback={lead.feedback} />
                    </TableCell>

                    <TableCell>
                      <span className="text-xs whitespace-nowrap">{lead.broker_name ?? "—"}</span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs">{lead.lead_source ?? "—"}</span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-muted-foreground">{lead.contact_medium ?? "—"}</span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{lead.locality ?? "—"}</span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs tabular-nums">{fmtMonth(lead.month)}</span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        <Calendar className="inline h-3 w-3 mr-0.5" />
                        {formatDate(lead.contacted_at)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {lead.derived_at ? formatDate(lead.derived_at) : "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      {lead.followup_3d ? (
                        <Badge
                          variant={
                            lead.followup_3d.toLowerCase().includes("si") ||
                            lead.followup_3d.toLowerCase().includes("sí")
                              ? "success"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {lead.followup_3d}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{"—"}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Pagina {page} de {totalPages} &middot; {total.toLocaleString("es-AR")} leads
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ page: String(page - 1) })}
              >
                Anterior
              </Button>
            )}
            {page < totalPages && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ page: String(page + 1) })}
              >
                Siguiente
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Campaign dialog */}
      <NewCampaignDialog
        open={campaignDialogOpen}
        onClose={() => setCampaignDialogOpen(false)}
        source="contacts"
        scope={allMatching ? "all_matching" : "ids"}
        ids={[...selected]}
        filters={currentFilters}
        estimatedContacts={allMatching ? total : selected.size}
        campaigns={campaigns}
      />
    </>
  );
}
