import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import { GlobalShortcuts } from "@/components/GlobalShortcuts";
import { SaveAccountBanner } from "@/components/auth/SaveAccountBanner";
import { readSavedAccounts } from "@/lib/auth/saved-accounts";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, workshop:workshops(name, logo_url)")
    .eq("id", user.id)
    .single();

  // Nome e logo del workshop reale (fonte di verità), non più del campo
  // legacy su profiles che per gli staff resta sul default 'La mia carrozzeria'.
  const ws = (
    profile as unknown as {
      workshop?: { name: string; logo_url: string | null } | null;
    }
  )?.workshop;

  const isAdmin = user.app_metadata?.is_admin === true;
  const role = profile?.role ?? "owner";

  // Banner "Salva utente" mostrato solo se l'account corrente non è già nei
  // saved accounts di questo dispositivo (il client lo nasconde anche se
  // l'utente l'ha rifiutato in precedenza via localStorage).
  const savedAccounts = await readSavedAccounts();
  const alreadySaved = savedAccounts.some((a) => a.id === user.id);

  return (
    <CommandPaletteProvider>
      <GlobalShortcuts />
      {!alreadySaved && <SaveAccountBanner userId={user.id} />}
      <AppShell
        userId={user.id}
        userEmail={user.email ?? ""}
        workshopName={ws?.name ?? "La mia carrozzeria"}
        logoUrl={ws?.logo_url ?? null}
        isAdmin={isAdmin}
        role={role}
      >
        {children}
      </AppShell>
    </CommandPaletteProvider>
  );
}
