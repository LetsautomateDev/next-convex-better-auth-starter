"use client";

import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data, isPending, error } = authClient.useSession();
  if (isPending) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  if (!data?.user) {
    return redirect("/auth/sign-in");
  }
  return <div>Welcome {data?.user?.name} <Button onClick={() => authClient.signOut()}>Sign Out</Button></div>;
}
