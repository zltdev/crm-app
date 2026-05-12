"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
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
  { href: "/campanas", label: "Campanas", icon: Megaphone },
  { href: "/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/expos", label: "Expos", icon: Building2 },
  { href: "/formularios", label: "Formularios", icon: ClipboardList },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/segmentos", label: "Segmentos", icon: Tags },
];

const STORAGE_KEY = "sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "flex flex-col gap-4 bg-sidebar text-sidebar-foreground transition-all duration-200 ease-in-out",
        collapsed ? "w-[68px] p-3" : "w-64 p-5",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        {!collapsed && (
          <div className="min-w-0">
            <Image
              src="/logo.png"
              alt="ZLT Desarrollos"
              width={239}
              height={160}
              priority
              className="h-10 w-auto"
            />
            <div className="mt-2 text-xs uppercase tracking-[0.2em] text-sidebar-foreground/60">
              Marketing CRM
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto text-lg font-bold tracking-tight">Z</div>
        )}
      </div>

      {/* Toggle button */}
      {mounted && (
        <button
          onClick={toggle}
          className="flex items-center justify-center rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          title={collapsed ? "Expandir" : "Contraer"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Nav */}
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
                className={cn(
                  "flex cursor-not-allowed items-center rounded-md text-sm text-sidebar-foreground/40",
                  collapsed
                    ? "justify-center p-2"
                    : "gap-3 px-3 py-2",
                )}
                title={label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    {label}
                    <span className="ml-auto text-[10px] uppercase">soon</span>
                  </>
                )}
              </div>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-md text-sm transition-colors",
                collapsed
                  ? "justify-center p-2"
                  : "gap-3 px-3 py-2",
                active
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="mt-auto flex flex-col gap-3">
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent/60 p-3 text-xs text-sidebar-foreground/70">
            Un contacto unico puede tener multiples <b>touchpoints</b>:
            formulario, evento, llamada, WhatsApp, agente o carga manual.
          </div>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            className={cn(
              "flex w-full items-center rounded-md text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed
                ? "justify-center p-2"
                : "gap-3 px-3 py-2",
            )}
            title={collapsed ? "Cerrar sesion" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && "Cerrar sesion"}
          </button>
        </form>
      </div>
    </aside>
  );
}
