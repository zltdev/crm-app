"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  SOURCE_LABELS,
  TOUCHPOINT_SOURCE_TYPES,
  type TouchpointSourceType,
} from "../../nuevo/constants";
import type { UpdateTouchpointState } from "../../actions";

type Option = { id: string; label: string };

const INITIAL: UpdateTouchpointState = {};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

type Initial = {
  source_type: string;
  source_name: string | null;
  occurred_at: string;
  campaign_id: string | null;
  event_id: string | null;
  expo_id: string | null;
  form_id: string | null;
  notes: string;
};

export function EditTouchpointForm({
  action,
  initial,
  contactLabel,
  options,
}: {
  action: (
    state: UpdateTouchpointState,
    fd: FormData,
  ) => Promise<UpdateTouchpointState>;
  initial: Initial;
  contactLabel: string;
  options: {
    events: Option[];
    expos: Option[];
    forms: Option[];
    campaigns: Option[];
  };
}) {
  const [state, formAction] = useActionState(action, INITIAL);
  const [sourceType, setSourceType] = useState<TouchpointSourceType>(
    (initial.source_type as TouchpointSourceType) ?? "manual",
  );

  const needsEvent = sourceType === "event";
  const needsExpo = sourceType === "expo";
  const needsForm = sourceType === "form";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Contacto
        </div>
        <div className="font-medium">{contactLabel}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="source_type">
            Tipo <span className="text-destructive">*</span>
          </Label>
          <Select
            id="source_type"
            name="source_type"
            value={sourceType}
            onChange={(e) =>
              setSourceType(e.target.value as TouchpointSourceType)
            }
          >
            {TOUCHPOINT_SOURCE_TYPES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="occurred_at">Fecha y hora</Label>
          <Input
            id="occurred_at"
            name="occurred_at"
            type="datetime-local"
            defaultValue={toLocalInput(initial.occurred_at)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="source_name">Nombre / descripción de la fuente</Label>
        <Input
          id="source_name"
          name="source_name"
          defaultValue={initial.source_name ?? ""}
        />
      </div>

      {needsEvent && (
        <OptionSelect
          name="event_id"
          label="Evento"
          defaultValue={initial.event_id ?? ""}
          options={options.events}
        />
      )}
      {needsExpo && (
        <OptionSelect
          name="expo_id"
          label="Expo"
          defaultValue={initial.expo_id ?? ""}
          options={options.expos}
        />
      )}
      {needsForm && (
        <OptionSelect
          name="form_id"
          label="Formulario"
          defaultValue={initial.form_id ?? ""}
          options={options.forms}
        />
      )}
      <OptionSelect
        name="campaign_id"
        label="Campaña (opcional)"
        defaultValue={initial.campaign_id ?? ""}
        options={options.campaigns}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={initial.notes}
        />
      </div>

      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
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
        <option value="">— Ninguno —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      Guardar cambios
    </Button>
  );
}
