"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/error-reporting";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { scope: "global" });
  }, [error]);

  return (
    <html lang="it">
      <body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: "#141414",
            border: "1px solid #262626",
            borderRadius: 12,
            padding: 32,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 20, margin: 0, marginBottom: 8 }}>
            Errore critico
          </h1>
          <p style={{ fontSize: 14, color: "#a3a3a3", marginBottom: 20 }}>
            Si è verificato un errore inatteso e l&apos;applicazione non può
            continuare. Ricarica la pagina per riprovare.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 11,
                color: "#737373",
                fontFamily: "monospace",
                marginBottom: 20,
              }}
            >
              ID errore: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: "#f97316",
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
