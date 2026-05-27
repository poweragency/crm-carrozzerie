import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) notFound();

  // Solo l'owner del workshop accede alle Impostazioni (dati fiscali, FB Ads,
  // logo, ecc.). I dipendenti non vedono nemmeno la voce nel menu, ma blocchiamo
  // anche l'accesso diretto via URL.
  if (profile.role !== "owner") redirect("/dashboard");

  return <SettingsForm initialProfile={profile} userEmail={user.email ?? ""} />;
}
