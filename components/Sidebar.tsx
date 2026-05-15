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
} from "lucide-react";
import { cn } from "@/lib/utils";

const baseNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Lead", icon: KanbanSquare },
  { href: "/cases", label: "Pratiche", icon: FolderKanban },
  { href: "/calendar", label: "Calendario", icon: Calendar },
  { href: "/settings", label: "Impostazioni", icon: Settings },
];

interface Props {
  userEmail: string;
  workshopName: string;
  isAdmin: boolean;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ userEmail, workshopName, isAdmin, open, onClose }: Props) {
  const nav = isAdmin
    ? [...baseNav, { href: "/admin", label: "Admin", icon: ShieldCheck }]
    : baseNav;
  const pathname = usePathname();

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
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4 text-white" strokeWidth={2.5} />
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

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
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
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-hover text-white text-xs font-semibold flex items-center justify-center shrink-0 shadow-card">
              {(userEmail[0] ?? "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wide text-text-subtle">
                Account
              </div>
              <div
                className="text-xs text-text-muted truncate"
                title={userEmail}
              >
                {userEmail}
              </div>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
            >
              <LogOut className="w-4 h-4" strokeWidth={2} />
              Esci
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
