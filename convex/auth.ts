import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { v } from "convex/values";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import {
  sendResetPassword,
  revokeUserSessions,
  sendInvitationEmail,
} from "./email";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    session: {
      expiresIn: 60 * 60 * 8, // 8 hours
      updateAge: 60 * 60, // Refresh every hour
    },
    trustedOrigins: ["http://localhost:3000", "https://*.vercel.app"],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        const actionCtx = requireActionCtx(ctx);

        const appUser = await actionCtx.runQuery(
          internal.users.getUserByVisitorIdInternal,
          { visitorId: user.id }
        );

        // Blocked users cannot reset password
        if (appUser?.status === "blocked") {
          throw new APIError("FORBIDDEN", {
            message:
              "Konto zostało zablokowane. Skontaktuj się z administratorem.",
          });
        }

        if (appUser?.status === "invitation_sent") {
          await sendInvitationEmail(actionCtx, { to: user.email, url });
        } else {
          await sendResetPassword(actionCtx, { to: user.email, url });
        }
      },
      onPasswordReset: async ({ user }) => {
        const actionCtx = requireActionCtx(ctx);

        // Revoke all sessions
        await revokeUserSessions(actionCtx, { authUserId: user.id });

        // Activate user if status was invitation_sent
        await actionCtx.runMutation(internal.users.updateUserStatusByVisitorId, {
          visitorId: user.id,
          status: "active",
        });
      },
    },
    plugins: [convex()],
    hooks: {
      before: createAuthMiddleware(async (middlewareCtx) => {
        // Block login for blocked users
        if (middlewareCtx.path !== "/sign-in/email") {
          return;
        }

        const email = middlewareCtx.body?.email;
        if (!email || typeof email !== "string") {
          return;
        }

        const actionCtx = requireActionCtx(ctx);
        const appUser = await actionCtx.runQuery(
          internal.users.getUserByEmailInternal,
          { email }
        );

        if (appUser?.status === "blocked") {
          throw new APIError("FORBIDDEN", {
            message:
              "Konto zostało zablokowane. Skontaktuj się z administratorem.",
          });
        }
      }),
      after: createAuthMiddleware(async (middlewareCtx) => {
        // Update last login after successful sign-in
        if (middlewareCtx.path !== "/sign-in/email") {
          return;
        }

        const responseContext = middlewareCtx.context;
        const user = responseContext?.user;
        if (!user?.id) {
          return;
        }

        const actionCtx = requireActionCtx(ctx);
        await actionCtx.runMutation(internal.users.updateLastLoginInternal, {
          visitorId: user.id,
        });
      }),
    },
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

export const getCurrentUser = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});
