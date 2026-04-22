import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function ContactNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h2 className="text-xl font-semibold">Contacto no encontrado</h2>
      <p className="text-sm text-muted-foreground">
        El contacto que buscás no existe o fue eliminado.
      </p>
      <Link
        href="/contactos"
        className={buttonVariants({ variant: "outline" })}
      >
        Volver a contactos
      </Link>
    </div>
  );
}
