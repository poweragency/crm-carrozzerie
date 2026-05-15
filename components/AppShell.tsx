"use client";

import { useState } from "react";
import { Menu, Wrench } from "lucide-react";
import { Sidebar } from "./Sidebar";

interface Props {
  userEmail: string;
  workshopName: string;
  isAdmin: boolean;
  children: React.ReactNode;
}

export function AppShell({ userEmail, workshopName, isAdmin, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar
        userEmail={userEmail}
        workshopName={workshopName}
        isAdmin={isAdmin}
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
            <div className="w-6 h-6 rounded bg-accent flex items-center justify-center shrink-0">
              <Wrench className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <div className="text-sm font-semibold truncate">{workshopName}</div>
          </div>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
