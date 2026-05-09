"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Activity,
  Megaphone,
  CalendarDays,
  Building2,
  ClipboardList,
  Upload,
  Tags,
  LogOut,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/login/actions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/contactos", label: "Contactos", icon: Users },
  { href: "/touchpoints", label: "Touchpoints", icon: Activity },
  { href: "/campanas", label: "Campañas", icon: Megaphone },
  { href: "/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/expos", label: "Expos", icon: Building2 },
  { href: "/formularios", label: "Formularios", icon: ClipboardList },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/segmentos", label: "Segmentos", icon: Tags },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col gap-6 bg-sidebar p-5 text-sidebar-foreground">
      <div>
        <Image
          src="/logo.png"
          alt="ZLT Desarrollos"
          width={239}
          height={160}
          priority
          className="h-10 w-auto"
        />
        <div className="mt-3 text-xs uppercase tracking-[0.2em] text-sidebar-foreground/60">
          Marketing CRM
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon, disabled }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);

          if (disabled) {
            return (
              <div
                key={href}
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/40"
                title="Próximamente"
              >
                <Icon className="h-4 w-4" />
                {label}
                <span className="ml-auto text-[10px] uppercase">soon</span>
              </div>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="rounded-lg bg-sidebar-accent/60 p-3 text-xs text-sidebar-foreground/70">
          Un contacto único puede tener múltiples <b>touchpoints</b>:
          formulario, evento, llamada, WhatsApp, agente o carga manual.
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
