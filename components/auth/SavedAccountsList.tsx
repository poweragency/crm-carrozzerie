"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SavedAccountPublic } from "@/lib/auth/saved-accounts";

interface Props {
  accounts: SavedAccountPublic[];
}

export function SavedAccountsList({ accounts }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  if (accounts.length === 0) return null;

  async function handleSwitch(id: string) {
    setSwitchingId(id);
    try {
      const res = await fetch(`/api/auth/switch/${id}`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Sessione scaduta", {
            description: "Devi rifare il login con email e password.",
          });
          startTransition(() => router.refresh());
          return;
        }
        toast.error("Switch non riuscito", {
          description: `${res.status}: ${json.error ?? "errore sconosciuto"}`,
        });
        return;
      }
      // Hard reload: assicura che la richiesta successiva includa i Set-Cookie
      // appena scritti dalla response. router.push (RSC fetch) puo' partire
      // prima che il browser abbia committato i cookie, mandandoci di nuovo
      // su /login per assenza di sessione.
      window.location.href = json.redirect ?? "/dashboard";
    } finally {
      setSwitchingId(null);
    }
  }

  async function handleRemove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/auth/saved-accounts/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="mb-5">
      <div className="text-xs font-medium text-text-muted mb-2 px-1">
        Account su questo dispositivo
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {accounts.map((a) => {
          const initials =
            (a.full_name ?? a.email)
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? "")
              .join("") || "?";
          const isSwitching = switchingId === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => handleSwitch(a.id)}
              disabled={pending || isSwitching}
              className={cn(
                "relative shrink-0 w-24 p-2 rounded-lg border border-border bg-bg-elevated",
                "hover:border-accent/60 hover:bg-bg-hover transition-colors text-center group",
                "disabled:opacity-60"
              )}
              title={a.email}
            >
              <div className="relative mx-auto">
                {a.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.avatar_url}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover mx-auto"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-accent/20 text-accent flex items-center justify-center mx-auto font-semibold">
                    {initials}
                  </div>
                )}
                <span
                  onClick={(e) => handleRemove(a.id, e)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-bg-card border border-border opacity-0 group-hover:opacity-100 flex items-center justify-center text-text-muted hover:text-status-danger hover:border-status-danger transition cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`Rimuovi ${a.email}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRemove(a.id, e as unknown as React.MouseEvent);
                    }
                  }}
                >
                  <X className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-2 text-[11px] font-medium truncate">
                {a.full_name?.split(" ")[0] ?? a.email.split("@")[0]}
              </div>
              <div className="text-[10px] text-text-subtle truncate">{a.email}</div>
              {isSwitching && (
                <div className="absolute inset-0 rounded-lg bg-bg/70 flex items-center justify-center text-[10px] text-text-muted">
                  Accesso...
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="text-[10px] text-text-subtle px-1 mt-1">
        Clicca su un account per accedere senza ridigitare la password.
      </div>
    </div>
  );
}
