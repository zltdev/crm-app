import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { FormForm } from "../form-form";
import { createFormAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewFormPage() {
  const admin = createSupabaseAdminClient();
  const { data: campaigns } = await admin
    .from("campaigns")
    .select("id, name")
    .order("name")
    .limit(200);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/formularios"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nuevo formulario
        </h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <FormForm
            action={createFormAction}
            campaigns={(campaigns ?? []).map((c) => ({
              id: c.id,
              label: c.name,
            }))}
            submitLabel="Crear formulario"
          />
        </CardContent>
      </Card>
    </div>
  );
}
