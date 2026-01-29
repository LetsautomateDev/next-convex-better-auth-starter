"use client";
import { SignInForm } from "./_components/sign-in-form";
import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";
export default function Page() {
  const { data, isPending, error } = authClient.useSession();
  if (isPending) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  if (data?.user) {
    return redirect("/");
  }
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignInForm />
      </div>
    </div>
  );
}
