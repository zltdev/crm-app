import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UploadForm } from "../_components/upload-form";

export const dynamic = "force-dynamic";

export default function NewImportPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/importar"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nueva importación
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí el tipo de fuente, subí el archivo y después mapeás las
          columnas.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <UploadForm />
        </CardContent>
      </Card>
    </div>
  );
}
