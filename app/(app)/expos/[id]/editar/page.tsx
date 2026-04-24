import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ExpoForm } from "../../expo-form";
import { updateExpoAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditExpoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const [{ data: expo }, { data: campaigns }] = await Promise.all([
    admin.from("expos").select("*").eq("id", id).maybeSingle(),
    admin.from("campaigns").select("id, name").order("name").limit(200),
  ]);
  if (!expo) notFound();
  const action = updateExpoAction.bind(null, id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href={`/expos/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Editar expo
        </h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ExpoForm
            action={action}
            initial={expo}
            campaigns={(campaigns ?? []).map((c) => ({
              id: c.id,
              label: c.name,
            }))}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>
    </div>
  );
}
