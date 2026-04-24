import Link from "next/link";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/crm/status-badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getSegments() {
  const admin = createSupabaseAdminClient();
  const { data: segments } = await admin
    .from("segments")
    .select("id, name, description, status, updated_at")
    .order("updated_at", { ascending: false });

  // Contar contactos por segmento
  const ids = (segments ?? []).map((s) => s.id);
  const counts: Record<string, number> = {};
  if (ids.length > 0) {
    await Promise.all(
      ids.map(async (id) => {
        const { count } = await admin
          .from("contact_segments")
          .select("*", { count: "exact", head: true })
          .eq("segment_id", id);
        counts[id] = count ?? 0;
      }),
    );
  }
  return { rows: segments ?? [], counts };
}

export default async function SegmentsPage() {
  const { rows, counts } = await getSegments();
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Segmentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Audiencias guardadas. Definí reglas una vez y reutilizalas para
            campañas.
          </p>
        </div>
        <Link
          href="/segmentos/nuevo"
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </Link>
      </header>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Miembros</TableHead>
                <TableHead>Actualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No hay segmentos todavía. Creá el primero.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/segmentos/${s.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {s.name}
                      </Link>
                      {s.description && (
                        <div className="text-xs text-muted-foreground">
                          {s.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {(counts[s.id] ?? 0).toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(s.updated_at)}
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
