"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSessionToken,
} from "@/lib/auth";
import { env } from "@/lib/env";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!env.appPassword) {
    return {
      error:
        "La app no tiene APP_PASSWORD configurada. Avisá al administrador.",
    };
  }
  if (!env.sessionSecret) {
    return {
      error:
        "La app no tiene APP_SESSION_SECRET configurada. Avisá al administrador.",
    };
  }
  if (password !== env.appPassword) {
    return { error: "Contraseña incorrecta." };
  }

  const token = await signSessionToken(env.sessionSecret);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect(safeNext);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
