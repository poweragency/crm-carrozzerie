"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  KanbanSquare,
  CalendarClock,
  FolderKanban,
  Euro,
  Info,
  CheckCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types/database.types";

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  new_lead: KanbanSquare,
  appointment_soon: CalendarClock,
  case_status_change: FolderKanban,
  invoice_paid: Euro,
  system: Info,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s fa`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h fa`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}g fa`;
  return new Date(iso).toLocaleDateString("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "short",
  });
}

export function NotificationBell({ ownerId }: { ownerId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !n.read).length;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!mounted) return;
      setItems(data ?? []);
      setLoading(false);
    })();

    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `owner_id=eq.${ownerId}`,
        },
        (payload) => {
          const row = payload.new as Notification;
          setItems((prev) => [row, ...prev].slice(0, 50));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `owner_id=eq.${ownerId}`,
        },
        (payload) => {
          const row = payload.new as Notification;
          setItems((prev) => prev.map((n) => (n.id === row.id ? row : n)));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, ownerId]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAllRead() {
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).in("id", ids);
  }

  async function markOneRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifiche"
        className="inline-flex items-center justify-center w-9 h-9 rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors relative"
      >
        <Bell className="w-4 h-4" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-accent text-accent-contrast text-[9px] font-semibold flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed lg:absolute left-2 right-2 lg:left-0 lg:right-auto bottom-16 lg:bottom-full lg:mb-2 lg:w-80 bg-bg-card border border-border rounded-lg shadow-card-hover overflow-hidden animate-fade-in z-50">
          <div className="px-4 h-10 border-b border-border flex items-center justify-between">
            <div className="text-sm font-semibold">Notifiche</div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] text-text-muted hover:text-accent inline-flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                Segna tutte
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-xs text-text-subtle">
                Caricamento...
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-text-subtle">
                Nessuna notifica
              </div>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type];
                const inner = (
                  <div
                    className={cn(
                      "px-4 py-3 flex gap-3 border-b border-border last:border-b-0 transition-colors",
                      !n.read && "bg-accent/5"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full shrink-0 flex items-center justify-center",
                        n.read
                          ? "bg-bg-hover text-text-muted"
                          : "bg-accent/10 text-accent"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{n.title}</div>
                      {n.body && (
                        <div className="text-[11px] text-text-muted truncate mt-0.5">
                          {n.body}
                        </div>
                      )}
                      <div className="text-[10px] text-text-subtle mt-1">
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent self-center shrink-0" />
                    )}
                  </div>
                );
                if (n.link) {
                  return (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => {
                        markOneRead(n.id);
                        setOpen(false);
                      }}
                      className="block hover:bg-bg-hover"
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markOneRead(n.id)}
                    className="w-full text-left hover:bg-bg-hover"
                  >
                    {inner}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
