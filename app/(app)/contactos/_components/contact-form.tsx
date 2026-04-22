"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CONTACT_STATUSES } from "@/lib/crm/contacts";
import type { ActionState } from "../actions";

type Initial = {
  phone?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  status?: string | null;
};

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: Initial;
  submitLabel?: string;
};

const INITIAL_STATE: ActionState = { ok: false };

export function ContactForm({
  action,
  initial,
  submitLabel = "Guardar",
}: Props) {
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="first_name">Nombre</Label>
          <Input
            id="first_name"
            name="first_name"
            defaultValue={initial?.first_name ?? ""}
            placeholder="María"
            autoComplete="given-name"
          />
          <FieldError messages={fieldErrors.first_name} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="last_name">Apellido</Label>
          <Input
            id="last_name"
            name="last_name"
            defaultValue={initial?.last_name ?? ""}
            placeholder="Gómez"
            autoComplete="family-name"
          />
          <FieldError messages={fieldErrors.last_name} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">
            Teléfono <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={initial?.phone ?? ""}
            placeholder="+54 9 341 555 1122"
            required
            autoComplete="tel"
          />
          <FieldError messages={fieldErrors.phone} />
          <p className="text-xs text-muted-foreground">
            Se normaliza automáticamente para dedupe.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
            placeholder="maria@empresa.com"
            autoComplete="email"
          />
          <FieldError messages={fieldErrors.email} />
        </div>
      </div>

      <div className="flex max-w-xs flex-col gap-1.5">
        <Label htmlFor="status">Estado</Label>
        <Select
          id="status"
          name="status"
          defaultValue={initial?.status ?? "active"}
        >
          {CONTACT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <FieldError messages={fieldErrors.status} />
      </div>

      <div className="flex items-center gap-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-xs text-destructive">{messages[0]}</p>;
}
