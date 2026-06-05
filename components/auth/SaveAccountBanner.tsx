"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  userId: string;
}

const skipKey = (id: string) => `crm-saved-skip-${id}`;

export function SaveAccountBanner({ userId }: Props) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem(skipKey(userId))) return;
      setShow(true);
    } catch {
      setShow(true);
    }
  }, [userId]);

  if (!show) return null;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/save-current", { method: "POST" });
      if (!res.ok) {
        toast.error("Salvataggio non riuscito");
        return;
      }
      toast.success("Account salvato su questo dispositivo");
      setShow(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function handleDismiss() {
    try {
      window.localStorage.setItem(skipKey(userId), "1");
    } catch {
      // localStorage non disponibile (es. browser privato strict): nascondi
      // solo per la sessione corrente.
    }
    setShow(false);
  }

  return (
    <div className="bg-accent/10 border-b border-accent/30 px-4 py-2 flex items-center gap-3 text-sm">
      <BookmarkPlus className="w-4 h-4 text-accent shrink-0" />
      <span className="flex-1 text-text">
        Salva questo account sul dispositivo per accedere senza ridigitare la password.
      </span>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="btn-primary py-1 px-3 text-xs"
      >
        {saving ? "..." : "Salva utente"}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="p-1 text-text-muted hover:text-text"
        aria-label="Nascondi"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
