"use client";

import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <LayoutDashboard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-base text-muted-foreground">
            Witaj w systemie
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Dashboard w przygotowaniu...
      </div>
    </div>
  );
}
