"use client";

import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export function ErrorView({
  title = "Qualcosa è andato storto",
  description,
  digest,
  onRetry,
}: {
  title?: string;
  description?: string;
  digest?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card max-w-md w-full p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        <p className="text-sm text-text-muted mb-4">
          {description ??
            "Si è verificato un errore inatteso. Riprova; se persiste, controlla la console o ricarica la pagina."}
        </p>
        {digest && (
          <p className="text-[11px] text-text-subtle font-mono mb-4">
            ID errore: {digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-2">
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-primary">
              <RefreshCcw className="w-4 h-4" />
              Riprova
            </button>
          )}
          <Link href="/dashboard" className="btn-secondary">
            <Home className="w-4 h-4" />
            Vai alla dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
