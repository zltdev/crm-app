import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateCampaignAction } from "../../actions";
import { CampaignForm } from "../../campaign-form";

export const dynamic = "force-dynamic";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!campaign) notFound();

  const action = updateCampaignAction.bind(null, id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href={`/campanas/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Editar campaña
        </h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <CampaignForm
            action={action}
            initial={campaign}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>
    </div>
  );
}
