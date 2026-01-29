"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInForm } from "./_components/sign-in-form";
import { useRbac } from "@/app/providers/rbac-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function SignInPage() {
  const router = useRouter();
  const { isLoading, hasSession } = useRbac();

  useEffect(() => {
    if (!isLoading && hasSession) {
      router.replace("/");
    }
  }, [hasSession, isLoading, router]);

  if (isLoading || hasSession) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-zinc-950">
        <Spinner className="size-8 text-white" />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-zinc-950 p-6 md:p-10">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Starter</h1>
        </div>

        <Card className="border-zinc-800 bg-white/95 shadow-xl backdrop-blur-sm">
          <CardContent className="pt-6">
            <SignInForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
