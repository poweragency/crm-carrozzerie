"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  disabledHint?: string;
  searchable?: boolean;
  /** Pulsante in cima al menu, opzionale, es. "+ Crea nuovo cliente". */
  createAction?: {
    label: string;
    onClick: () => void;
  };
  emptyLabel?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Seleziona...",
  disabled = false,
  disabledHint,
  searchable = true,
  createAction,
  emptyLabel = "Nessun risultato",
  className,
  id,
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    // Filtra solo per label (nome cliente / marca+modello veicolo).
    // Il subLabel (email, telefono) viene mostrato ma non indicizzato.
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, searchable]);

  useEffect(() => {
    setActiveIdx(0);
  }, [filtered.length]);

  function selectOption(opt: ComboboxOption) {
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIdx];
      if (opt) selectOption(opt);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        title={disabled ? disabledHint : undefined}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2 px-3 h-10 rounded-md border border-border bg-bg-input text-left text-sm transition-colors",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:border-border-hover focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
          open && !disabled && "border-accent ring-1 ring-accent"
        )}
      >
        <div className="min-w-0 flex-1">
          {selected ? (
            <>
              <div className="truncate">{selected.label}</div>
              {selected.subLabel && (
                <div className="text-[11px] text-text-subtle truncate -mt-0.5">
                  {selected.subLabel}
                </div>
              )}
            </>
          ) : (
            <span className="text-text-subtle">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-text-subtle shrink-0 transition-transform",
            open && "rotate-180"
          )}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-bg-card border border-border rounded-md shadow-card-hover overflow-hidden animate-fade-in">
          {createAction && (
            <button
              type="button"
              onClick={() => {
                createAction.onClick();
                setOpen(false);
                setQuery("");
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-accent hover:bg-accent/10 transition-colors border-b border-border"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span className="font-medium">{createAction.label}</span>
            </button>
          )}

          {searchable && options.length > 0 && (
            <div className="px-2 py-2 border-b border-border">
              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 text-text-subtle absolute left-2 top-1/2 -translate-y-1/2"
                  strokeWidth={2}
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Cerca..."
                  className="w-full bg-bg-input border border-border rounded-md pl-7 pr-2 h-8 text-sm placeholder:text-text-subtle focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          <div
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
            onKeyDown={handleKeyDown}
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-text-subtle">
                {emptyLabel}
              </div>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                const isActive = i === activeIdx;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => selectOption(opt)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                      isActive ? "bg-bg-hover" : "hover:bg-bg-hover",
                      isSelected && "text-accent"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{opt.label}</div>
                      {opt.subLabel && (
                        <div className="text-[11px] text-text-subtle truncate mt-0.5">
                          {opt.subLabel}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check
                        className="w-3.5 h-3.5 text-accent shrink-0"
                        strokeWidth={2.5}
                      />
                    )}
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
