"use client";

import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useRbac } from "@/app/providers/rbac-provider";
import { Spinner } from "@/components/ui/spinner";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { TopBar } from "@/components/shared/top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data, isPending } = authClient.useSession();
  const { isLoading, isBlocked } = useRbac();

  if (isPending || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data?.user) {
    return redirect("/auth/sign-in");
  }

  if (isBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">
            Konto zablokowane
          </h1>
          <p className="mt-2 text-muted-foreground">
            Twoje konto zostało zablokowane. Skontaktuj się z administratorem.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
