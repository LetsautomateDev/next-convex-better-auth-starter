"use client";

import { Suspense } from "react";
import { ConfirmResetForm } from "./_components/confirm-reset-form";
import { Card, CardContent } from "@/components/ui/card";

export default function ConfirmResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <div className="flex min-h-svh flex-col items-center justify-center bg-zinc-950 p-6 md:p-10">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center justify-center text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Entalpi</h1>
          </div>

          <Card className="border-zinc-800 bg-white/95 shadow-xl backdrop-blur-sm">
            <CardContent className="pt-6">
              <ConfirmResetForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </Suspense>
  );
}
