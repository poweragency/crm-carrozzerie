"use client";

import { useEffect } from "react";
import { ErrorView } from "@/components/ui/ErrorView";
import { reportError } from "@/lib/error-reporting";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { scope: "(app)" });
  }, [error]);

  return <ErrorView digest={error.digest} onRetry={reset} />;
}
