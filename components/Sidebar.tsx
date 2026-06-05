"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  FolderKanban,
  LogOut,
  Wrench,
  Settings,
  Calendar,
  X,
  ShieldCheck,
  Search,
  Users,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { useCommandPalette } from "./CommandPalette";
import { NotificationBell } from "./NotificationBell";
import { isEmployeeRole } from "@/lib/roles";
import type { UserRole } from "@/types/database.types";

const baseNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Lead", icon: KanbanSquare },
  { href: "/customers", label: "Clienti", icon: Users },
  { href: "/cases", label: "Pratiche", icon: FolderKanban },
  { href: "/calendar", label: "Calendario", icon: Calendar },
];

// I dipendenti con mansione vedono la loro coda pratiche, l'anagrafica clienti
// e il calendario consegne (read-only sulle pratiche in scadenza).
const employeeNav = [
  { href: "/cases", label: "Le mie pratiche", icon: FolderKanban },
  { href: "/customers", label: "Clienti", icon: Users },
  { href: "/calendar", label: "Calendario", icon: Calendar },
];

interface Props {
  userId: string;
  userEmail: string;
  workshopName: string;
  logoUrl: string | null;
  isAdmin: boolean;
  role: UserRole;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  userId,
  userEmail,
  workshopName,
  logoUrl,
  isAdmin,
  role,
  open,
  onClose,
}: Props) {
  const isOwner = role === "owner";
  const isEmployee = isEmployeeRole(role);
  const nav = isEmployee ? employeeNav : baseNav;
  const pathname = usePathname();
  const { setOpen: openPalette } = useCommandPalette();

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed lg:static top-0 left-0 w-60 h-screen shrink-0",
          "bg-bg-card border-r border-border flex flex-col z-50",
          "transition-transform duration-200 ease-out lg:transition-none",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="px-5 h-16 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center shrink-0 overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Wrench className="w-4 h-4 text-accent-contrast" strokeWidth={2.5} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-sm font-semibold leading-tight truncate"
              title={workshopName}
            >
              {workshopName}
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 -m-1 text-text-muted hover:text-text"
            aria-label="Chiudi menu"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => openPalette(true)}
            className="w-full flex items-center gap-2 px-3 h-9 rounded-md bg-bg-input border border-border text-sm text-text-subtle hover:border-border-hover hover:text-text-muted transition-colors"
          >
            <Search className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            <span className="flex-1 text-left">Cerca...</span>
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto flex flex-col">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-text-muted hover:text-text hover:bg-bg-hover"
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}

          <div className="mt-auto pt-3 border-t border-border space-y-1">
            {isOwner && (
              <Link
                href="/team"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === "/team" || pathname.startsWith("/team/")
                    ? "bg-accent/10 text-accent"
                    : "text-text-muted hover:text-text hover:bg-bg-hover"
                )}
              >
                <UserCog className="w-4 h-4" strokeWidth={2} />
                Team
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === "/admin" || pathname.startsWith("/admin/")
                    ? "bg-accent/10 text-accent"
                    : "text-text-muted hover:text-text hover:bg-bg-hover"
                )}
              >
                <ShieldCheck className="w-4 h-4" strokeWidth={2} />
                Admin
              </Link>
            )}
          </div>
        </nav>

        {isOwner && (
          <div className="px-3 pt-1 pb-3">
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === "/settings" || pathname.startsWith("/settings/")
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:text-text hover:bg-bg-hover"
              )}
            >
              <Settings className="w-4 h-4" strokeWidth={2} />
              Impostazioni
            </Link>
          </div>
        )}

        <div className="p-3">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-hover text-white text-xs font-semibold flex items-center justify-center shrink-0 shadow-card">
              {(userEmail[0] ?? "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wide text-text-subtle">
                Account
              </div>
              <div className="text-xs text-text-muted truncate" title={userEmail}>
                {userEmail}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <form action="/auth/signout" method="post" className="flex-1">
              <button
                type="submit"
                className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
              >
                <LogOut className="w-4 h-4" strokeWidth={2} />
                Esci
              </button>
            </form>
            <NotificationBell ownerId={userId} />
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}
