"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCommandPalette } from "./CommandPalette";

// Sequenze g+<x> per navigazione veloce, n per nuovo lead, ? per help (apre palette)
export function GlobalShortcuts() {
  const router = useRouter();
  const { setOpen } = useCommandPalette();

  useEffect(() => {
    let prefix: string | null = null;
    let prefixTimer: ReturnType<typeof setTimeout> | null = null;

    function clearPrefix() {
      prefix = null;
      if (prefixTimer) {
        clearTimeout(prefixTimer);
        prefixTimer = null;
      }
    }

    function inEditable(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (inEditable(e.target)) return;

      const key = e.key.toLowerCase();

      if (prefix === "g") {
        clearPrefix();
        const dest: Record<string, string> = {
          d: "/dashboard",
          l: "/leads",
          c: "/cases",
          a: "/calendar",
          s: "/settings",
        };
        if (dest[key]) {
          e.preventDefault();
          router.push(dest[key]);
        }
        return;
      }

      if (key === "g") {
        prefix = "g";
        prefixTimer = setTimeout(clearPrefix, 800);
        return;
      }

      if (key === "?") {
        e.preventDefault();
        setOpen(true);
        return;
      }

      if (key === "n") {
        e.preventDefault();
        router.push("/leads?new=1");
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearPrefix();
    };
  }, [router, setOpen]);

  return null;
}
