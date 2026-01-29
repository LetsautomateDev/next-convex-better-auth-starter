import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { nextCookies } from "better-auth/next-js";


export const authClient = createAuthClient({
    plugins: [convexClient(), nextCookies()],
});