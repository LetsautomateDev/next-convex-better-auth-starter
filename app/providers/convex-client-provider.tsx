"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client"; 
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"; 

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  console.error("NEXT_PUBLIC_CONVEX_URL is not set!");
}

const convex = new ConvexReactClient(convexUrl!, {
  // Optionally pause queries until the user is authenticated
  // Set to false to allow mutations without authentication
  expectAuth: false, 
});
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}