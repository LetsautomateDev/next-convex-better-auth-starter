import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAppUserIdOrNull, loadUserSnapshot } from "./lib/rbacGuard";

export const getMyRbac = query({
  args: {},
  returns: v.object({
    isAuthenticated: v.boolean(),
    isBlocked: v.boolean(),
    user: v.union(
      v.null(),
      v.object({
        appUserId: v.id("users"),
        roles: v.array(
          v.object({
            _id: v.id("roles"),
            _creationTime: v.number(),
            name: v.string(),
            description: v.optional(v.string()),
          })
        ),
        permissions: v.array(
          v.object({
            _id: v.id("permissions"),
            _creationTime: v.number(),
            key: v.string(),
            resource: v.string(),
            action: v.string(),
            description: v.optional(v.string()),
          })
        ),
      })
    ),
  }),
  handler: async (ctx) => {
    const appUserId = await getAppUserIdOrNull(ctx);
    if (!appUserId) {
      return {
        isAuthenticated: false,
        isBlocked: false,
        user: null,
      };
    }

    // Check if user is blocked
    const appUser = await ctx.db.get(appUserId);
    if (appUser?.status === "blocked") {
      return {
        isAuthenticated: false,
        isBlocked: true,
        user: null,
      };
    }

    const snapshot = await loadUserSnapshot(ctx, appUserId);

    return {
      isAuthenticated: true,
      isBlocked: false,
      user: {
        appUserId,
        roles: snapshot.roles,
        permissions: snapshot.permissions,
      },
    };
  },
});
