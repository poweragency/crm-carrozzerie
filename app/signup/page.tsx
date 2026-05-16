import { redirect } from "next/navigation";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function SignupDisabledPage() {
  // La registrazione self-service è disabilitata: nuove officine
  // vengono create dall'admin tramite il pannello /admin.
  redirect("/login");
}
