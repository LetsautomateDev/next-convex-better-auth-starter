import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requirePermission } from "./lib/rbacGuard";

const roleValidator = v.object({
  _id: v.id("roles"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
});

const permissionValidator = v.object({
  _id: v.id("permissions"),
  _creationTime: v.number(),
  key: v.string(),
  resource: v.string(),
  action: v.string(),
  description: v.optional(v.string()),
});

export const authorize = internalQuery({
  args: {
    permission: v.optional(v.string()),
  },
  returns: v.object({
    appUserId: v.id("users"),
    roles: v.array(roleValidator),
    permissions: v.array(permissionValidator),
  }),
  handler: async (ctx, args) => {
    const snapshot =
      args.permission === undefined
        ? await requireAuth(ctx)
        : await requirePermission(ctx, args.permission);

    return {
      appUserId: snapshot.appUserId,
      roles: snapshot.roles,
      permissions: snapshot.permissions,
    };
  },
});
