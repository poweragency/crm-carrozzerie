import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import { GlobalShortcuts } from "@/components/GlobalShortcuts";

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

  return (
    <CommandPaletteProvider>
      <GlobalShortcuts />
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
