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
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/crm/status-badge";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

type Params = { q?: string; page?: string };

async function getForms({ q, page }: Params) {
  const pageNum = Math.max(1, Number(page ?? 1));
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("forms")
    .select("id, name, slug, source_name, status", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (q && q.trim().length > 0) {
    const like = `%${q.trim()}%`;
    query = query.or(`name.ilike.${like},slug.ilike.${like}`);
  }
  const { data, count, error } = await query;
  return {
    rows: data ?? [],
    total: count ?? 0,
    page: pageNum,
    error: error?.message ?? null,
  };
}

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const { rows, total, page, error } = await getForms(params);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Formularios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total.toLocaleString("es-AR")} formulario{total === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href="/formularios/nuevo"
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </Link>
      </header>

      <form method="get" className="flex gap-2">
        <Input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Buscar por nombre o slug…"
          className="max-w-md"
        />
        <button
          type="submit"
          className={buttonVariants({ variant: "secondary" })}
        >
          Buscar
        </button>
      </form>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No hay formularios. Creá el primero.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/formularios/${r.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {r.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.slug ?? "—"}
                    </TableCell>
                    <TableCell>{r.source_name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={{
                  pathname: "/formularios",
                  query: { ...params, page: page - 1 },
                }}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={{
                  pathname: "/formularios",
                  query: { ...params, page: page + 1 },
                }}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
