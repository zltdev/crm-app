"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ContactPicker } from "./contact-picker";
import type { ContactSearchResult } from "./search-contacts";
import {
  createTouchpointAction,
  type CreateTouchpointState,
} from "./actions";
import {
  SOURCE_LABELS,
  TOUCHPOINT_SOURCE_TYPES,
  type TouchpointSourceType,
} from "./constants";

type Option = { id: string; label: string };

const INITIAL: CreateTouchpointState = {};

export function TouchpointForm({
  initialContact,
  options,
}: {
  initialContact: ContactSearchResult | null;
  options: {
    events: Option[];
    expos: Option[];
    forms: Option[];
    campaigns: Option[];
  };
}) {
  const [state, action] = useActionState(createTouchpointAction, INITIAL);
  const [contactId, setContactId] = useState(initialContact?.id ?? "");
  const [sourceType, setSourceType] =
    useState<TouchpointSourceType>("manual");
  const [occurredAt, setOccurredAt] = useState<string>("");

  // Setear el datetime por default después del mount para evitar mismatch
  // de hydration (server y client generarían "ahora" en momentos distintos).
  useEffect(() => {
    if (occurredAt) return;
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
    setOccurredAt(
      new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 16),
    );
  }, [occurredAt]);

  const needsEvent = sourceType === "event";
  const needsExpo = sourceType === "expo";
  const needsForm = sourceType === "form";

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="contact_id" value={contactId} />

      <div className="flex flex-col gap-1.5">
        <Label>
          Contacto <span className="text-destructive">*</span>
        </Label>
        <ContactPicker
          initial={initialContact}
          onChange={(id) => setContactId(id)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="source_type">
            Tipo de touchpoint <span className="text-destructive">*</span>
          </Label>
          <Select
            id="source_type"
            name="source_type"
            value={sourceType}
            onChange={(e) =>
              setSourceType(
                e.target.value as (typeof TOUCHPOINT_SOURCE_TYPES)[number],
              )
            }
            required
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
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="source_name">Nombre / descripción de la fuente</Label>
        <Input
          id="source_name"
          name="source_name"
          placeholder='Ej: "Landing Invertir en Añelo" o "Llamada comercial 12/03"'
        />
        <p className="text-xs text-muted-foreground">
          Texto libre que queda visible en el historial del contacto.
        </p>
      </div>

      {needsEvent && (
        <OptionSelect
          name="event_id"
          label="Evento"
          required
          options={options.events}
          emptyHint="Todavía no hay eventos cargados."
        />
      )}
      {needsExpo && (
        <OptionSelect
          name="expo_id"
          label="Expo"
          required
          options={options.expos}
          emptyHint="Todavía no hay expos cargadas."
        />
      )}
      {needsForm && (
        <OptionSelect
          name="form_id"
          label="Formulario"
          required
          options={options.forms}
          emptyHint="Todavía no hay formularios cargados."
        />
      )}
      <OptionSelect
        name="campaign_id"
        label="Campaña (opcional)"
        options={options.campaigns}
        emptyHint="Ninguna campaña cargada."
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="Resumen rápido, resultado, próximos pasos…"
        />
        <p className="text-xs text-muted-foreground">
          Se guarda en <code>metadata.notes</code>.
        </p>
      </div>

      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <SubmitButton disabled={!contactId} />
    </form>
  );
}

function OptionSelect({
  name,
  label,
  options,
  emptyHint,
  required,
}: {
  name: string;
  label: string;
  options: Option[];
  emptyHint?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Select id={name} name={name} required={required}>
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

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="self-start">
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      Crear touchpoint
    </Button>
  );
}
