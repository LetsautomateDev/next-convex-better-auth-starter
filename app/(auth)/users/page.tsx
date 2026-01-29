"use client";

import { UserCog } from "lucide-react";
import { Can } from "@/app/providers/rbac-provider";
import { UsersTable } from "./_components/users-table";

export default function UsersPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <UserCog className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Użytkownicy</h1>
          <p className="text-base text-muted-foreground">
            Zarządzaj użytkownikami systemu
          </p>
        </div>
      </div>

      <Can
        permission="user.list"
        fallback={
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center text-destructive">
            Nie masz uprawnień do przeglądania listy użytkowników
          </div>
        }
      >
        <UsersTable />
      </Can>
    </div>
  );
}
