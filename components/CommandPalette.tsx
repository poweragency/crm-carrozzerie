"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  KanbanSquare,
  FolderKanban,
  Users,
  Car,
  CalendarClock,
  Plus,
  Settings,
  LayoutDashboard,
  Loader2,
  CornerDownLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Group = "Pratiche" | "Lead" | "Clienti" | "Veicoli" | "Appuntamenti" | "Azioni";

interface Item {
  id: string;
  group: Group;
  label: string;
  subLabel?: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const STATIC_ACTIONS: Item[] = [
  {
    id: "a-dashboard",
    group: "Azioni",
    label: "Vai a Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "a-leads",
    group: "Azioni",
    label: "Vai a Lead",
    href: "/leads",
    icon: KanbanSquare,
  },
  {
    id: "a-cases",
    group: "Azioni",
    label: "Vai a Pratiche",
    href: "/cases",
    icon: FolderKanban,
  },
  {
    id: "a-calendar",
    group: "Azioni",
    label: "Vai a Calendario",
    href: "/calendar",
    icon: CalendarClock,
  },
  {
    id: "a-settings",
    group: "Azioni",
    label: "Vai a Impostazioni",
    href: "/settings",
    icon: Settings,
  },
  {
    id: "a-new-lead",
    group: "Azioni",
    label: "Nuovo lead",
    href: "/leads?new=1",
    icon: Plus,
  },
];

interface CommandContext {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const Ctx = createContext<CommandContext | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Ctx.Provider value={{ open, setOpen }}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </Ctx.Provider>
  );
}

export function useCommandPalette() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCommandPalette inside CommandPaletteProvider");
  return ctx;
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dynamic, setDynamic] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setDynamic([]);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setDynamic([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      const like = `%${q}%`;
      const [leads, customers, cases, vehicles, appointments] = await Promise.all([
        supabase
          .from("leads")
          .select("id, full_name, phone, email, status")
          .or(`full_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
          .limit(5),
        supabase
          .from("customers")
          .select("id, full_name, phone, email")
          .or(`full_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
          .limit(5),
        supabase
          .from("cases")
          .select(
            "id, status, customers!inner(full_name), vehicles(make, model, plate)"
          )
          .or(`full_name.ilike.${like},plate.ilike.${like}`, {
            referencedTable: "customers",
          })
          .limit(5),
        supabase
          .from("vehicles")
          .select("id, make, model, plate, customer_id, customers(full_name)")
          .or(`plate.ilike.${like},make.ilike.${like},model.ilike.${like}`)
          .limit(5),
        supabase
          .from("appointments")
          .select("id, title, starts_at, case_id")
          .ilike("title", like)
          .order("starts_at", { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;

      const items: Item[] = [];

      for (const l of leads.data ?? []) {
        items.push({
          id: `lead-${l.id}`,
          group: "Lead",
          label: l.full_name,
          subLabel: [l.phone, l.email].filter(Boolean).join(" · "),
          href: `/leads?id=${l.id}`,
          icon: KanbanSquare,
        });
      }
      for (const c of customers.data ?? []) {
        items.push({
          id: `cust-${c.id}`,
          group: "Clienti",
          label: c.full_name,
          subLabel: [c.phone, c.email].filter(Boolean).join(" · "),
          href: `/cases?customer=${c.id}`,
          icon: Users,
        });
      }
      for (const k of cases.data ?? []) {
        const cust = (k.customers as { full_name?: string } | null)?.full_name ?? "Cliente";
        const veh = k.vehicles as
          | { make?: string | null; model?: string | null; plate?: string | null }
          | null;
        const vehStr = veh
          ? [veh.make, veh.model, veh.plate].filter(Boolean).join(" · ")
          : "";
        items.push({
          id: `case-${k.id}`,
          group: "Pratiche",
          label: cust,
          subLabel: vehStr || k.status,
          href: `/cases/${k.id}`,
          icon: FolderKanban,
        });
      }
      for (const v of vehicles.data ?? []) {
        const cust = (v.customers as { full_name?: string } | null)?.full_name ?? "";
        items.push({
          id: `veh-${v.id}`,
          group: "Veicoli",
          label: `${[v.make, v.model].filter(Boolean).join(" ") || "Veicolo"} · ${v.plate ?? ""}`,
          subLabel: cust,
          href: `/cases?customer=${v.customer_id}`,
          icon: Car,
        });
      }
      for (const a of appointments.data ?? []) {
        items.push({
          id: `app-${a.id}`,
          group: "Appuntamenti",
          label: a.title,
          subLabel: new Date(a.starts_at).toLocaleString("it-IT", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          href: a.case_id ? `/cases/${a.case_id}` : "/calendar",
          icon: CalendarClock,
        });
      }
      setDynamic(items);
      setLoading(false);
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, supabase]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const actions = q
      ? STATIC_ACTIONS.filter((a) => a.label.toLowerCase().includes(q))
      : STATIC_ACTIONS;
    return [...dynamic, ...actions];
  }, [dynamic, query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [items.length]);

  const grouped = useMemo(() => {
    const g = new Map<Group, Item[]>();
    for (const it of items) {
      const arr = g.get(it.group) ?? [];
      arr.push(it);
      g.set(it.group, arr);
    }
    return g;
  }, [items]);

  const flatOrdered = useMemo(() => {
    const order: Group[] = [
      "Pratiche",
      "Lead",
      "Clienti",
      "Veicoli",
      "Appuntamenti",
      "Azioni",
    ];
    const out: Item[] = [];
    for (const g of order) {
      for (const it of grouped.get(g) ?? []) out.push(it);
    }
    return out;
  }, [grouped]);

  function handleSelect(it: Item) {
    onOpenChange(false);
    router.push(it.href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-[12vh] bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-bg-card border border-border rounded-xl shadow-card-hover overflow-hidden animate-slide-up"
      >
        <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
          <Search className="w-4 h-4 text-text-subtle shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIdx((i) => Math.min(i + 1, flatOrdered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const it = flatOrdered[activeIdx];
                if (it) handleSelect(it);
              } else if (e.key === "Escape") {
                onOpenChange(false);
              }
            }}
            placeholder="Cerca lead, clienti, pratiche, targhe..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-text-subtle"
          />
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-text-subtle" />}
          <kbd className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 bg-bg-hover border border-border rounded text-text-muted">
            Esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-1">
          {flatOrdered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-text-subtle">
              {query.trim().length < 2
                ? "Inizia a digitare per cercare..."
                : "Nessun risultato"}
            </div>
          ) : (
            (
              ["Pratiche", "Lead", "Clienti", "Veicoli", "Appuntamenti", "Azioni"] as Group[]
            ).map((g) => {
              const arr = grouped.get(g);
              if (!arr || arr.length === 0) return null;
              return (
                <div key={g} className="py-1">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-subtle font-medium">
                    {g}
                  </div>
                  {arr.map((it) => {
                    const idx = flatOrdered.indexOf(it);
                    const active = idx === activeIdx;
                    const Icon = it.icon;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => handleSelect(it)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-left text-sm",
                          active
                            ? "bg-accent/10 text-accent"
                            : "text-text hover:bg-bg-hover"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0",
                            active ? "text-accent" : "text-text-muted"
                          )}
                          strokeWidth={2}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{it.label}</div>
                          {it.subLabel && (
                            <div className="text-[11px] text-text-subtle truncate">
                              {it.subLabel}
                            </div>
                          )}
                        </div>
                        {active && (
                          <CornerDownLeft className="w-3 h-3 text-accent" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border px-3 py-2 flex items-center gap-3 text-[11px] text-text-subtle">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-bg-hover border border-border rounded">
              ↑↓
            </kbd>
            naviga
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-bg-hover border border-border rounded">
              ↵
            </kbd>
            apri
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-bg-hover border border-border rounded">
              ⌘K
            </kbd>
            apri ovunque
          </span>
        </div>
      </div>
    </div>
  );
}
