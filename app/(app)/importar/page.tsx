import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";
import { SOURCE_KIND_LABELS } from "@/lib/import/types";

export const dynamic = "force-dynamic";

async function getBatches() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("import_batches")
    .select(
      "id, source_name, source_kind, status, row_count, uploaded_at, processed_at, file_name, sheet_name, result_stats",
    )
    .order("uploaded_at", { ascending: false })
    .limit(50);
  return { rows: data ?? [], error: error?.message ?? null };
}

function statusVariant(status: string) {
  switch (status) {
    case "imported":
      return "success" as const;
    case "processing":
      return "warning" as const;
    case "failed":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export default async function ImportListPage() {
  const { rows, error } = await getBatches();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Importar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Carga masiva de contactos desde Excel o CSV, con mapeo contextual
            según el tipo de fuente.
          </p>
        </div>
        <Link
          href="/importar/nuevo"
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="h-4 w-4" /> Nueva importación
        </Link>
      </header>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            Error: {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre / archivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Filas</TableHead>
                <TableHead>Subido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Aún no importaste nada. Probá con el botón
                    &quot;Nueva importación&quot;.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/importar/${r.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {r.source_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {r.file_name}
                        {r.sheet_name ? ` · ${r.sheet_name}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.source_kind ? (
                        <Badge variant="outline">
                          {
                            SOURCE_KIND_LABELS[
                              r.source_kind as keyof typeof SOURCE_KIND_LABELS
                            ]
                          }
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {r.row_count ?? 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(r.uploaded_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
