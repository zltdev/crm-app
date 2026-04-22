"use client";

import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginState } from "./actions";

const INITIAL: LoginState = {};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action] = useActionState(loginAction, INITIAL);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-[#020617] p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="ZLT Desarrollos"
            width={239}
            height={160}
            priority
            className="h-20 w-auto"
          />
          <div className="text-xs uppercase tracking-[0.25em] text-white/50">
            Marketing CRM
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <h1 className="text-base font-medium text-white">Iniciar sesión</h1>
          <p className="mt-1 text-xs text-white/60">
            Acceso restringido al equipo de ZLT.
          </p>

          <form action={action} className="mt-5 flex flex-col gap-4">
            <input type="hidden" name="next" value={nextPath} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-white/80">
                Contraseña
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/30 focus-visible:ring-primary"
                placeholder="••••••••"
              />
            </div>

            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {state.error}
              </div>
            )}

            <SubmitButton />
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} ZLT Desarrollos
        </p>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1 w-full">
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Lock className="h-4 w-4" />
      )}
      Entrar
    </Button>
  );
}

