import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignForm } from "../campaign-form";
import { createCampaignAction } from "../actions";

export default function NewCampaignPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/campanas"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nueva campaña
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <CampaignForm action={createCampaignAction} submitLabel="Crear campaña" />
        </CardContent>
      </Card>
    </div>
  );
}
