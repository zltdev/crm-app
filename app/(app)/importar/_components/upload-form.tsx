"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Bot, CalendarDays, ClipboardList, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SOURCE_KIND_DESCRIPTIONS,
  SOURCE_KIND_LABELS,
  SOURCE_KINDS,
  type SourceKind,
} from "@/lib/import/types";
import { cn } from "@/lib/utils";
import { uploadBatchAction, type UploadState } from "../actions";

const INITIAL: UploadState = {};

const KIND_ICONS: Record<SourceKind, React.ComponentType<{ className?: string }>> =
  {
    agent: Bot,
    form: ClipboardList,
    event: CalendarDays,
    expo: Upload,
  };

export function UploadForm() {
  const [state, action] = useActionState(uploadBatchAction, INITIAL);
  const [kind, setKind] = useState<SourceKind>("agent");
  const [fileName, setFileName] = useState<string>("");

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label>Tipo de fuente</Label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {SOURCE_KINDS.map((k) => {
            const Icon = KIND_ICONS[k];
            const active = kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">{SOURCE_KIND_LABELS[k]}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {SOURCE_KIND_DESCRIPTIONS[k]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <input type="hidden" name="source_kind" value={kind} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="source_name">
          Nombre de esta importación <span className="text-destructive">*</span>
        </Label>
        <Input
          id="source_name"
          name="source_name"
          required
          placeholder='Ej: "Lead_new Q1 2026" o "Expo Oil & Gas 2026"'
        />
        <p className="text-xs text-muted-foreground">
          Va a quedar como <code>source_name</code> en cada touchpoint creado.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sheet_name">Hoja (opcional)</Label>
        <Input
          id="sheet_name"
          name="sheet_name"
          placeholder="Si tu xlsx tiene varias hojas, indicá cuál usar"
        />
        <p className="text-xs text-muted-foreground">
          Si lo dejás vacío, uso la primera hoja del archivo.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file">
          Archivo <span className="text-destructive">*</span>
        </Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".xlsx,.xls,.csv,.ods"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          className="file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
        />
        {fileName && (
          <p className="text-xs text-muted-foreground">Seleccionado: {fileName}</p>
        )}
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Upload className="h-4 w-4" />
      )}
      Subir y continuar
    </Button>
  );
}
