"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
};

type ConfirmContextValue = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}

type DialogState = {
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ opts, resolve });
    });
  }, []);

  useEffect(() => {
    if (!state) return;
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function close(value: boolean) {
    if (!state) return;
    state.resolve(value);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => close(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-bg-card border border-border rounded-xl shadow-card-hover overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 p-5 pb-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  state.opts.variant === "danger"
                    ? "bg-red-500/15 text-red-400"
                    : "bg-accent/15 text-accent"
                )}
              >
                <AlertTriangle className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-text">
                  {state.opts.title}
                </h2>
                {state.opts.description && (
                  <p className="text-sm text-text-muted mt-1.5 whitespace-pre-line">
                    {state.opts.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => close(false)}
                className="text-text-subtle hover:text-text -m-1 p-1 shrink-0"
                aria-label="Chiudi"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 bg-bg/30 border-t border-border">
              <button
                ref={cancelRef}
                onClick={() => close(false)}
                className="btn-secondary"
                type="button"
              >
                {state.opts.cancelLabel ?? "Annulla"}
              </button>
              <button
                onClick={() => close(true)}
                className={cn(
                  "inline-flex items-center justify-center gap-2 font-medium text-sm px-4 py-2 rounded-md transition-colors text-white",
                  state.opts.variant === "danger"
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-accent hover:bg-accent-hover"
                )}
                type="button"
                autoFocus
              >
                {state.opts.confirmLabel ?? "Conferma"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
