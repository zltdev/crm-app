"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { FormFormState } from "./actions";
import { FORM_STATUSES, FORM_STATUS_LABELS } from "./constants";

const INITIAL: FormFormState = {};

type Initial = {
  name?: string | null;
  slug?: string | null;
  source_name?: string | null;
  status?: string | null;
  campaign_id?: string | null;
};

export function FormForm({
  action,
  initial,
  campaigns,
  submitLabel = "Guardar",
}: {
  action: (state: FormFormState, fd: FormData) => Promise<FormFormState>;
  initial?: Initial;
  campaigns: Array<{ id: string; label: string }>;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">
          Nombre <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial?.name ?? ""}
          required
          placeholder="Landing Invertir en Añelo"
        />
        <FieldError messages={fe.name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={initial?.slug ?? ""}
          placeholder="invertir-en-anelo"
        />
        <p className="text-xs text-muted-foreground">
          Identificador único, en minúsculas con guiones (ej:{" "}
          <code>invertir-en-anelo</code>).
        </p>
        <FieldError messages={fe.slug} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="source_name">Nombre de origen</Label>
        <Input
          id="source_name"
          name="source_name"
          defaultValue={initial?.source_name ?? ""}
          placeholder="Meta Ads · Invertir"
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
            {FORM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {FORM_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="campaign_id">Campaña</Label>
          <Select
            id="campaign_id"
            name="campaign_id"
            defaultValue={initial?.campaign_id ?? ""}
          >
            <option value="">— Sin campaña —</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <SubmitButton label={submitLabel} />
    </form>
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

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-xs text-destructive">{messages[0]}</p>;
}
