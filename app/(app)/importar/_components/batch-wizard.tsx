"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SATELLITE_FIELDS,
  SOURCE_KIND_LABELS,
  TARGET_LABELS,
  type ColumnMapping,
  type RowFilter,
  type SourceKind,
  type TargetKind,
} from "@/lib/import/types";
import { normalizePhone, normalizeEmail } from "@/lib/crm/normalize";
import {
  commitBatchAction,
  saveMappingAction,
  type CommitState,
  type MappingState,
} from "../actions";
import { cn } from "@/lib/utils";

type Options = {
  events: { id: string; label: string }[];
  expos: { id: string; label: string }[];
  forms: { id: string; label: string }[];
  campaigns: { id: string; label: string }[];
};

type Props = {
  batchId: string;
  sourceKind: SourceKind;
  status: string;
  sourceName: string;
  sampleRows: Record<string, unknown>[];
  initialMapping: ColumnMapping[];
  contextIds: {
    event_id: string | null;
    expo_id: string | null;
    form_id: string | null;
    campaign_id: string | null;
  };
  options: Options;
  resultStats: unknown;
  rowFilter: RowFilter | null;
};

type BatchStats = {
  total: number;
  contactsCreated: number;
  contactsMatched: number;
  touchpointsCreated: number;
  skippedNoIdentifier: number;
  skippedInvalidPhone: number;
  skippedFiltered: number;
  failed: number;
};

export function BatchWizard(props: Props) {
  const { batchId, sourceKind, status, sampleRows, resultStats } = props;
  const router = useRouter();

  const [mapping, setMapping] = useState<ColumnMapping[]>(props.initialMapping);
  const [sourceName, setSourceName] = useState(props.sourceName);
  const [eventId, setEventId] = useState(props.contextIds.event_id ?? "");
  const [expoId, setExpoId] = useState(props.contextIds.expo_id ?? "");
  const [formId, setFormId] = useState(props.contextIds.form_id ?? "");
  const [campaignId, setCampaignId] = useState(
    props.contextIds.campaign_id ?? "",
  );
  const [filterColumn, setFilterColumn] = useState<string>(
    props.rowFilter?.column ?? "",
  );
  const [filterOperator, setFilterOperator] = useState<"in" | "not_in">(
    props.rowFilter?.operator ?? "in",
  );
  const [filterValues, setFilterValues] = useState<string[]>(
    props.rowFilter?.values ?? [],
  );
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [commitState, setCommitState] = useState<CommitState>({});
  const [isCommitting, startCommitting] = useTransition();

  const isImported = status === "imported";

  const stats = useMemo(
    () =>
      computePreview(sampleRows, mapping, {
        column: filterColumn,
        operator: filterOperator,
        values: filterValues,
      }),
    [sampleRows, mapping, filterColumn, filterOperator, filterValues],
  );

  // Valores únicos en la columna elegida para filtrar (de las muestras).
  const filterColumnUniqueValues = useMemo(() => {
    if (!filterColumn) return [];
    const set = new Set<string>();
    sampleRows.forEach((r) => {
      const v = r[filterColumn];
      if (v != null && String(v).trim() !== "") {
        set.add(String(v).trim());
      }
    });
    return Array.from(set).sort();
  }, [sampleRows, filterColumn]);

  const contextReady =
    sourceKind === "agent" ||
    (sourceKind === "event" && !!eventId) ||
    (sourceKind === "expo" && !!expoId) ||
    (sourceKind === "form" && !!formId);

  function buildFormData() {
    const fd = new FormData();
    fd.set("mapping", JSON.stringify({ columns: mapping }));
    fd.set("source_name", sourceName);
    fd.set("event_id", eventId);
    fd.set("expo_id", expoId);
    fd.set("form_id", formId);
    fd.set("campaign_id", campaignId);
    fd.set("filter_column", filterColumn);
    fd.set("filter_operator", filterOperator);
    fd.set("filter_values", JSON.stringify(filterValues));
    return fd;
  }

  function saveMapping() {
    startSaving(async () => {
      const res: MappingState = await saveMappingAction(
        batchId,
        {},
        buildFormData(),
      );
      setSaveMsg(res.error ? `❌ ${res.error}` : "✓ Mapeo guardado");
      router.refresh();
    });
  }

  function commitImport() {
    startCommitting(async () => {
      // Primero persistir el mapeo
      const s = await saveMappingAction(batchId, {}, buildFormData());
      if (s.error) {
        setCommitState({ error: s.error });
        return;
      }

      const fd = new FormData();
      const res = await commitBatchAction(batchId, {}, fd);
      setCommitState(res);
      router.refresh();
    });
  }

  if (isImported) {
    const imported = (resultStats ?? {}) as Partial<BatchStats>;
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-emerald-400/40 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" /> Importación completada
            </CardTitle>
            <CardDescription>
              Tipo:{" "}
              <strong>{SOURCE_KIND_LABELS[sourceKind]}</strong>. Ya podés verlo
              en Contactos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatsGrid stats={imported as BatchStats} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Contexto de la importación</CardTitle>
          <CardDescription>
            Tipo de fuente:{" "}
            <strong>{SOURCE_KIND_LABELS[sourceKind]}</strong>. El tipo se fija
            al crear el batch.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="source_name">Nombre de la importación</Label>
            <Input
              id="source_name"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
            />
          </div>

          {sourceKind === "event" && (
            <ContextSelect
              label="Evento"
              required
              value={eventId}
              onChange={setEventId}
              options={props.options.events}
              emptyHint="Todavía no hay eventos cargados. Creá uno desde la sección Eventos (próximamente) o desde el SQL editor."
            />
          )}
          {sourceKind === "expo" && (
            <ContextSelect
              label="Expo"
              required
              value={expoId}
              onChange={setExpoId}
              options={props.options.expos}
              emptyHint="Todavía no hay expos cargadas."
            />
          )}
          {sourceKind === "form" && (
            <ContextSelect
              label="Formulario"
              required
              value={formId}
              onChange={setFormId}
              options={props.options.forms}
              emptyHint="Todavía no hay formularios cargados."
            />
          )}

          <ContextSelect
            label="Campaña (opcional)"
            value={campaignId}
            onChange={setCampaignId}
            options={props.options.campaigns}
            emptyHint="Ninguna campaña cargada."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filtro de filas (opcional)</CardTitle>
          <CardDescription>
            Si querés importar solo filas que tengan ciertos valores en una
            columna (ej: <code>TIPO ∈ {"{"}VISITANTE, EXPOSITOR{"}"}</code>),
            elegí la columna y los valores. Las filas que no matchean se
            descartan con motivo &quot;filtered_out&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter_column">Columna</Label>
            <Select
              id="filter_column"
              value={filterColumn}
              onChange={(e) => {
                setFilterColumn(e.target.value);
                setFilterValues([]);
              }}
            >
              <option value="">— Sin filtro —</option>
              {mapping.map((m) => (
                <option key={m.column} value={m.column}>
                  {m.column}
                </option>
              ))}
            </Select>
          </div>
          {filterColumn && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter_operator">Operador</Label>
                <Select
                  id="filter_operator"
                  value={filterOperator}
                  onChange={(e) =>
                    setFilterOperator(e.target.value as "in" | "not_in")
                  }
                >
                  <option value="in">Incluir si está en la lista</option>
                  <option value="not_in">Excluir si está en la lista</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-3">
                <Label>Valores (de las primeras filas del archivo)</Label>
                <div className="flex flex-wrap gap-2">
                  {filterColumnUniqueValues.map((v) => {
                    const checked = filterValues.includes(v);
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() =>
                          setFilterValues((prev) =>
                            prev.includes(v)
                              ? prev.filter((x) => x !== v)
                              : [...prev, v],
                          )
                        }
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs",
                          checked
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-card hover:bg-muted",
                        )}
                      >
                        {v}
                      </button>
                    );
                  })}
                  {filterColumnUniqueValues.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      No hay valores en la muestra. Podés escribir manualmente:
                    </span>
                  )}
                </div>
                <Input
                  placeholder="Agregar valor manual y enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = (e.target as HTMLInputElement).value.trim();
                      if (v && !filterValues.includes(v)) {
                        setFilterValues((prev) => [...prev, v]);
                      }
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
                {filterValues.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Activos: {filterValues.join(", ")}
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Mapeo de columnas</CardTitle>
            <CardDescription>
              Por cada columna del Excel, elegí a dónde va dentro del CRM.
              Auto-sugerido por nombre; podés ajustar.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={saveMapping}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar mapeo
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28%]">Columna del Excel</TableHead>
                <TableHead className="w-[32%]">Destino</TableHead>
                <TableHead className="w-[20%]">Detalle</TableHead>
                <TableHead>Ejemplo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mapping.map((m, i) => (
                <TableRow key={m.column}>
                  <TableCell className="font-mono text-xs">
                    {m.column}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={m.target}
                      onChange={(e) => {
                        const target = e.target.value as TargetKind;
                        setMapping((prev) => {
                          const next = [...prev];
                          next[i] = {
                            ...next[i],
                            target,
                            satelliteField:
                              target === "satellite_field"
                                ? SATELLITE_FIELDS[sourceKind][0]?.value
                                : undefined,
                            metadataKey:
                              target === "metadata"
                                ? prev[i].metadataKey ?? m.column
                                : undefined,
                          };
                          return next;
                        });
                      }}
                    >
                      <optgroup label="Contacto">
                        <option value="contact_phone">
                          {TARGET_LABELS.contact_phone}
                        </option>
                        <option value="contact_email">
                          {TARGET_LABELS.contact_email}
                        </option>
                        <option value="contact_first_name">
                          {TARGET_LABELS.contact_first_name}
                        </option>
                        <option value="contact_last_name">
                          {TARGET_LABELS.contact_last_name}
                        </option>
                        <option value="contact_full_name">
                          {TARGET_LABELS.contact_full_name}
                        </option>
                      </optgroup>
                      <optgroup label="Touchpoint">
                        <option value="touchpoint_occurred_at">
                          {TARGET_LABELS.touchpoint_occurred_at}
                        </option>
                        <option value="touchpoint_source_name">
                          {TARGET_LABELS.touchpoint_source_name}
                        </option>
                      </optgroup>
                      <optgroup label={`Campo de ${SOURCE_KIND_LABELS[sourceKind]}`}>
                        <option value="satellite_field">
                          Usar campo específico
                        </option>
                      </optgroup>
                      <optgroup label="Otros">
                        <option value="metadata">
                          {TARGET_LABELS.metadata}
                        </option>
                        <option value="skip">{TARGET_LABELS.skip}</option>
                      </optgroup>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {m.target === "satellite_field" && (
                      <Select
                        value={m.satelliteField ?? ""}
                        onChange={(e) =>
                          setMapping((prev) => {
                            const next = [...prev];
                            next[i] = {
                              ...next[i],
                              satelliteField: e.target.value,
                            };
                            return next;
                          })
                        }
                      >
                        {SATELLITE_FIELDS[sourceKind].map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </Select>
                    )}
                    {m.target === "metadata" && (
                      <Input
                        value={m.metadataKey ?? ""}
                        placeholder="key en metadata"
                        onChange={(e) =>
                          setMapping((prev) => {
                            const next = [...prev];
                            next[i] = {
                              ...next[i],
                              metadataKey: e.target.value,
                            };
                            return next;
                          })
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                    {String(sampleRows[0]?.[m.column] ?? "") || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {saveMsg && (
        <div className="text-sm text-muted-foreground">{saveMsg}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Preview
          </CardTitle>
          <CardDescription>
            Estimación basada en las primeras {sampleRows.length} filas del
            archivo. El total real se procesa al importar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {sampleRows.length} filas de muestra
          </Badge>
          <Badge variant={stats.phoneOk === 0 ? "destructive" : "success"}>
            {stats.phoneOk} con teléfono
          </Badge>
          <Badge variant="secondary">{stats.emailOk} con email</Badge>
          {stats.invalidPhone > 0 && (
            <Badge variant="warning">
              {stats.invalidPhone} con teléfono inválido (corto o sin dígitos)
            </Badge>
          )}
          {stats.filteredOut > 0 && (
            <Badge variant="outline">
              {stats.filteredOut} se descartan por filtro
            </Badge>
          )}
          {stats.missingIdentifier > 0 && (
            <Badge variant="warning">
              {stats.missingIdentifier} sin phone ni email
            </Badge>
          )}
          {!stats.hasPhoneMapping && !stats.hasEmailMapping && (
            <Badge variant="destructive">
              ⚠ Mapeá al menos teléfono o email
            </Badge>
          )}
        </CardContent>
      </Card>

      {commitState.error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            ❌ {commitState.error}
          </CardContent>
        </Card>
      )}

      {commitState.stats && (
        <Card className="border-emerald-400/40 bg-emerald-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <strong>Importación completa</strong>
            </div>
            <StatsGrid
              stats={{
                ...commitState.stats,
                skippedInvalidPhone:
                  commitState.stats.skippedInvalidPhone ?? 0,
                skippedFiltered: commitState.stats.skippedFiltered ?? 0,
              }}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button
          onClick={commitImport}
          disabled={
            isCommitting ||
            !contextReady ||
            (!stats.hasPhoneMapping && !stats.hasEmailMapping)
          }
        >
          {isCommitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Importar ahora
        </Button>
        {!contextReady && (
          <span className="self-center text-xs text-muted-foreground">
            Elegí el {sourceKind === "event" ? "evento" : sourceKind === "expo" ? "expo" : "formulario"} para habilitar la importación.
          </span>
        )}
      </div>
    </div>
  );
}

function ContextSelect({
  label,
  value,
  onChange,
  options,
  emptyHint,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  emptyHint?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Ninguno —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>
      {options.length === 0 && emptyHint && (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      )}
    </div>
  );
}

function StatsGrid({ stats }: { stats: BatchStats }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
      <Stat label="Filas procesadas" value={stats.total} />
      <Stat label="Contactos nuevos" value={stats.contactsCreated} tone="ok" />
      <Stat
        label="Contactos existentes"
        value={stats.contactsMatched}
        tone="muted"
      />
      <Stat label="Touchpoints creados" value={stats.touchpointsCreated} />
      <Stat
        label="Descartados (sin ID)"
        value={stats.skippedNoIdentifier ?? 0}
        tone="warn"
      />
      <Stat
        label="Descartados (tel. inválido)"
        value={stats.skippedInvalidPhone ?? 0}
        tone="warn"
      />
      <Stat
        label="Descartados (filtro)"
        value={stats.skippedFiltered ?? 0}
        tone="muted"
      />
      <Stat label="Fallidas" value={stats.failed} tone="err" />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "muted" | "warn" | "err";
}) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          tone === "ok" && "text-emerald-600",
          tone === "warn" && "text-amber-600",
          tone === "err" && value > 0 && "text-destructive",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value.toLocaleString("es-AR")}
      </div>
    </div>
  );
}

type PreviewStats = {
  phoneOk: number;
  emailOk: number;
  missingIdentifier: number;
  invalidPhone: number;
  filteredOut: number;
  hasPhoneMapping: boolean;
  hasEmailMapping: boolean;
};

function rowMatchesFilter(
  row: Record<string, unknown>,
  filter: { column: string; operator: "in" | "not_in"; values: string[] },
): boolean {
  if (!filter.column || filter.values.length === 0) return true;
  const v = row[filter.column];
  const value = v == null ? "" : String(v).trim().toLowerCase();
  const set = new Set(filter.values.map((x) => x.trim().toLowerCase()));
  return filter.operator === "in" ? set.has(value) : !set.has(value);
}

function computePreview(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping[],
  filter: { column: string; operator: "in" | "not_in"; values: string[] },
): PreviewStats {
  const phoneCol = mapping.find((m) => m.target === "contact_phone")?.column;
  const emailCol = mapping.find((m) => m.target === "contact_email")?.column;
  let phoneOk = 0;
  let emailOk = 0;
  let missing = 0;
  let invalidPhone = 0;
  let filteredOut = 0;
  for (const r of rows) {
    if (!rowMatchesFilter(r, filter)) {
      filteredOut++;
      continue;
    }
    const rawPhone = phoneCol ? String(r[phoneCol] ?? "").trim() : "";
    const p = rawPhone ? normalizePhone(rawPhone) : null;
    const pDigits = p ? p.replace(/[^0-9]/g, "") : "";
    const e = emailCol ? normalizeEmail(String(r[emailCol] ?? "")) : null;

    const phoneValid = !!p && pDigits.length >= 6;
    const phoneIsInvalid = rawPhone.length > 0 && !phoneValid;

    if (phoneValid) phoneOk++;
    if (phoneIsInvalid) invalidPhone++;
    if (e) emailOk++;
    if (!phoneValid && !e) missing++;
  }
  return {
    phoneOk,
    emailOk,
    missingIdentifier: missing,
    invalidPhone,
    filteredOut,
    hasPhoneMapping: !!phoneCol,
    hasEmailMapping: !!emailCol,
  };
}
