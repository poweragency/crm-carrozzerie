// Wrapper minimale per error reporting.
// Per attivare Sentry: `npm i @sentry/nextjs` e setta NEXT_PUBLIC_SENTRY_DSN.
// Se mancante, log su console.

type Severity = "info" | "warning" | "error" | "fatal";

type ReportContext = Record<string, unknown>;

export function reportError(error: unknown, context?: ReportContext): void {
  if (typeof window !== "undefined" && (window as unknown as { __SENTRY__?: { captureException: (e: unknown, extra?: unknown) => void } }).__SENTRY__) {
    try {
      (window as unknown as { __SENTRY__: { captureException: (e: unknown, extra?: unknown) => void } }).__SENTRY__.captureException(error, { extra: context });
      return;
    } catch {
      // fallthrough
    }
  }
  console.error("[reportError]", error, context);
}

export function reportMessage(
  message: string,
  severity: Severity = "info",
  context?: ReportContext
): void {
  const fn =
    severity === "error" || severity === "fatal"
      ? console.error
      : severity === "warning"
        ? console.warn
        : console.log;
  fn(`[${severity}]`, message, context ?? "");
}
