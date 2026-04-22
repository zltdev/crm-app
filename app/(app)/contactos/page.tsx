import Link from "next/link";
import { Plus, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, fullName } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type SearchParams = {
  q?: string;
  page?: string;
};

async function getContacts({ q, page }: SearchParams) {
  const pageNum = Math.max(1, Number(page ?? 1));
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("contacts")
    .select("id, first_name, last_name, phone, email, status, created_at, updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q && q.trim().length > 0) {
    const term = q.trim();
    const like = `%${term}%`;
    query = query.or(
      `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
    );
  }

  const { data, count, error } = await query;
  return {
    rows: data ?? [],
    total: count ?? 0,
    page: pageNum,
    error: error?.message ?? null,
  };
}

function statusVariant(status: string) {
  switch (status) {
    case "active":
      return "success" as const;
    case "blocked":
      return "warning" as const;
    case "deleted":
      return "destructive" as const;
    case "merged":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { rows, total, page, error } = await getContacts(params);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const q = params.q ?? "";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contactos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Base unificada · {total.toLocaleString("es-AR")} contacto
            {total === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href="/contactos/nuevo"
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="h-4 w-4" /> Nuevo contacto
        </Link>
      </header>

      <form method="get" className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, teléfono o email…"
            className="pl-9"
          />
        </div>
        <button
          type="submit"
          className={buttonVariants({ variant: "secondary", size: "default" })}
        >
          Buscar
        </button>
      </form>

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
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {q
                      ? `Sin resultados para "${q}".`
                      : "Aún no hay contactos. Creá el primero."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/contactos/${r.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {fullName(r.first_name, r.last_name)}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">{r.phone}</TableCell>
                    <TableCell>
                      {r.email || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(r.created_at)}
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
                  pathname: "/contactos",
                  query: { ...(q ? { q } : {}), page: page - 1 },
                }}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={{
                  pathname: "/contactos",
                  query: { ...(q ? { q } : {}), page: page + 1 },
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
