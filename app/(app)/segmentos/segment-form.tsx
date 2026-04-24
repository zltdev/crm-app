"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import type { SegmentFormState } from "./actions";
import {
  SCORE_TYPES,
  SCORE_TYPE_LABELS,
  type SegmentDefinition,
} from "@/lib/crm/segments";
import {
  SOURCE_LABELS,
  TOUCHPOINT_SOURCE_TYPES,
} from "@/app/(app)/touchpoints/nuevo/constants";
import { CONTACT_STATUSES } from "@/lib/crm/contacts";

const INITIAL: SegmentFormState = {};

type Initial = {
  name?: string | null;
  description?: string | null;
  status?: string | null;
  definition?: SegmentDefinition | null;
};

type Option = { id: string; label: string };

export function SegmentForm({
  action,
  initial,
  options,
  submitLabel = "Guardar",
}: {
  action: (
    state: SegmentFormState,
    fd: FormData,
  ) => Promise<SegmentFormState>;
  initial?: Initial;
  options: {
    campaigns: Option[];
    events: Option[];
    expos: Option[];
    forms: Option[];
  };
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL);
  const def = initial?.definition ?? null;

  const [statuses, setStatuses] = useState<string[]>(
    def?.status?.length ? def.status : ["active"],
  );
  const [sourceTypes, setSourceTypes] = useState<string[]>(
    def?.touchpoints.source_types ?? [],
  );
  const [scoreEnabled, setScoreEnabled] = useState<boolean>(!!def?.score);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="def_status" value={statuses.join(",")} />
      <input type="hidden" name="def_tp_types" value={sourceTypes.join(",")} />

      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">
            Nombre <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="Leads calientes sin llamar"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Estado</Label>
            <Select
              id="status"
              name="status"
              defaultValue={initial?.status ?? "active"}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="archived">Archivado</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              name="description"
              defaultValue={initial?.description ?? ""}
              placeholder="Opcional — para qué se usa este segmento"
            />
          </div>
        </div>
      </div>

      <Section title="Filtros de contacto">
        <div className="flex flex-col gap-3">
          <div>
            <Label>Estado del contacto</Label>
            <MultiCheckbox
              options={CONTACT_STATUSES.map((s) => ({ value: s, label: s }))}
              values={statuses}
              onChange={setStatuses}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="def_has_email">Email</Label>
              <Select
                id="def_has_email"
                name="def_has_email"
                defaultValue={def?.has_email ?? "any"}
              >
                <option value="any">Cualquiera</option>
                <option value="yes">Tiene email</option>
                <option value="no">Sin email</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="def_created_from">Creado desde</Label>
              <Input
                id="def_created_from"
                name="def_created_from"
                type="date"
                defaultValue={def?.created_from ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="def_created_to">Creado hasta</Label>
              <Input
                id="def_created_to"
                name="def_created_to"
                type="date"
                defaultValue={def?.created_to ?? ""}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Filtros de touchpoints (opcional)">
        <p className="mb-3 text-xs text-muted-foreground">
          Incluye contactos que tengan touchpoints cumpliendo TODO lo
          siguiente.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Tipos de touchpoint</Label>
            <MultiCheckbox
              options={TOUCHPOINT_SOURCE_TYPES.map((s) => ({
                value: s,
                label: SOURCE_LABELS[s],
              }))}
              values={sourceTypes}
              onChange={setSourceTypes}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <OptionSelect
              name="def_tp_campaign"
              label="Asociado a campaña"
              defaultValue={def?.touchpoints.campaign_id ?? ""}
              options={options.campaigns}
            />
            <OptionSelect
              name="def_tp_event"
              label="Asociado a evento"
              defaultValue={def?.touchpoints.event_id ?? ""}
              options={options.events}
            />
            <OptionSelect
              name="def_tp_expo"
              label="Asociado a expo"
              defaultValue={def?.touchpoints.expo_id ?? ""}
              options={options.expos}
            />
            <OptionSelect
              name="def_tp_form"
              label="Asociado a formulario"
              defaultValue={def?.touchpoints.form_id ?? ""}
              options={options.forms}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="def_tp_min_count">Cantidad mínima</Label>
              <Input
                id="def_tp_min_count"
                name="def_tp_min_count"
                type="number"
                min={0}
                defaultValue={def?.touchpoints.min_count ?? 0}
              />
              <p className="text-xs text-muted-foreground">
                0 o 1 = al menos un touchpoint que cumpla los otros filtros.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="def_tp_within_days">
                En los últimos (días)
              </Label>
              <Input
                id="def_tp_within_days"
                name="def_tp_within_days"
                type="number"
                min={0}
                defaultValue={def?.touchpoints.within_days ?? ""}
                placeholder="Cualquier fecha"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Filtros de score (opcional)">
        <div className="flex items-center gap-2">
          <Checkbox
            id="score_enabled"
            checked={scoreEnabled}
            onChange={(e) => setScoreEnabled(e.target.checked)}
          />
          <Label htmlFor="score_enabled" className="cursor-pointer">
            Filtrar por score
          </Label>
        </div>
        {scoreEnabled && (
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="def_score_type">Tipo</Label>
              <Select
                id="def_score_type"
                name="def_score_type"
                defaultValue={def?.score?.type ?? "total"}
              >
                {SCORE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SCORE_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="def_score_min">Mínimo</Label>
              <Input
                id="def_score_min"
                name="def_score_min"
                type="number"
                step="0.01"
                defaultValue={def?.score?.min ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="def_score_max">Máximo</Label>
              <Input
                id="def_score_max"
                name="def_score_max"
                type="number"
                step="0.01"
                defaultValue={def?.score?.max ?? ""}
              />
            </div>
          </div>
        )}
      </Section>

      <SubmitButton label={submitLabel} />
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

function MultiCheckbox({
  options,
  values,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(v: string) {
    const next = values.includes(v)
      ? values.filter((x) => x !== v)
      : [...values, v];
    onChange(next);
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((o) => {
        const active = values.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors " +
              (active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card hover:bg-muted")
            }
          >
            <Checkbox
              checked={active}
              onChange={() => toggle(o.value)}
              tabIndex={-1}
              className="pointer-events-none"
            />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function OptionSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: Option[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Select id={name} name={name} defaultValue={defaultValue}>
        <option value="">— Cualquiera —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
