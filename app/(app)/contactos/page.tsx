import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ContactsTable } from "./contacts-table";

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

async function getCampaignsForDialog() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("campaigns")
    .select("id, name, status")
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [{ rows, total, page, error }, campaigns] = await Promise.all([
    getContacts(params),
    getCampaignsForDialog(),
  ]);
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

      <ContactsTable
        rows={rows}
        totalFiltered={total}
        filters={{ q: q || undefined }}
        campaigns={campaigns}
      />

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
