// Validazione env all'avvio del server (fail-fast).
// Next.js chiama register() una volta sola all'avvio del runtime server.
// Vedi: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
import { z } from "zod";

export async function register() {
  // Solo runtime Node (non Edge): le env server-only vivono qui.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Variabili indispensabili: senza queste l'app non può funzionare affatto.
  const required = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z
      .string()
      .url("NEXT_PUBLIC_SUPABASE_URL deve essere un URL valido"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z
      .string()
      .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY mancante"),
  });

  const parsed = required.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `  - ${i.message}`).join("\n");
    throw new Error(
      `[env] Variabili d'ambiente obbligatorie mancanti o non valide:\n${msg}`
    );
  }

  // Variabili opzionali: l'app parte comunque ma alcune feature sono disattivate.
  // Le segnaliamo (warning) per non far scoprire la mis-config solo a runtime.
  const optional: string[] = [];
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    optional.push(
      "SUPABASE_SERVICE_ROLE_KEY (webhook FB, gestione admin/team disabilitati)"
    );
  if (!process.env.FB_APP_SECRET)
    optional.push("FB_APP_SECRET (il webhook Facebook rifiuterà le richieste)");
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
    optional.push(
      "RESEND_API_KEY/RESEND_FROM_EMAIL (invio email al cliente disattivato)"
    );
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)
    optional.push(
      "UPSTASH_REDIS_REST_* (rate limiting in-memory per-istanza, non distribuito)"
    );

  if (optional.length > 0) {
    console.warn(
      "[env] Variabili opzionali non impostate:\n" +
        optional.map((w) => `  - ${w}`).join("\n")
    );
  }
}
