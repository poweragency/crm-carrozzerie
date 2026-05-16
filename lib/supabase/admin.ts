import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Server-side admin client (service_role).
 * Usato solo nei webhook server-side dove non c'è una sessione utente.
 * NON usare mai questo lato client.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient può essere chiamato solo lato server. " +
        "Se ne vedi questo errore lato client, c'è un import errato."
    );
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY non impostata");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
