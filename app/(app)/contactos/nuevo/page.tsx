import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "../_components/contact-form";
import { createContact } from "../actions";

export default function NewContactPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/contactos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nuevo contacto
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El teléfono es el identificador principal para dedupe.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ContactForm action={createContact} submitLabel="Crear contacto" />
        </CardContent>
      </Card>
    </div>
  );
}
