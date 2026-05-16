"use client";

import { useState } from "react";
import { Menu, Wrench } from "lucide-react";
import { Sidebar } from "./Sidebar";

import type { UserRole } from "@/types/database.types";

interface Props {
  userId: string;
  userEmail: string;
  workshopName: string;
  logoUrl: string | null;
  isAdmin: boolean;
  role: UserRole;
  children: React.ReactNode;
}

export function AppShell({
  userId,
  userEmail,
  workshopName,
  logoUrl,
  isAdmin,
  role,
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar
        userId={userId}
        userEmail={userEmail}
        workshopName={workshopName}
        logoUrl={logoUrl}
        isAdmin={isAdmin}
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-3 h-12 px-3 bg-bg-card border-b border-border shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -m-2 text-text hover:text-accent"
            aria-label="Apri menu"
            type="button"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded bg-accent flex items-center justify-center shrink-0 overflow-hidden">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Wrench className="w-3.5 h-3.5 text-accent-contrast" strokeWidth={2.5} />
              )}
            </div>
            <div className="text-sm font-semibold truncate">{workshopName}</div>
          </div>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
