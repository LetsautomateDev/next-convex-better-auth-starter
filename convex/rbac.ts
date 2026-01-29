import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { securedMutation, securedQuery } from "./lib/rbacGuard";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// PUBLIC API (secured)
// ============================================================================

export const listRoles = securedQuery({
  permission: "rbac.manage",
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("roles"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("roles").collect();
  },
});

export const listRolesForInvite = securedQuery({
  permission: "user.create",
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("roles"),
      name: v.string(),
    })
  ),
  handler: async (ctx) => {
    const roles = await ctx.db.query("roles").collect();
    return roles.map((role) => ({
      _id: role._id,
      name: role.name,
    }));
  },
});

export const listPermissions = securedQuery({
  permission: "rbac.manage",
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("permissions"),
      _creationTime: v.number(),
      key: v.string(),
      resource: v.string(),
      action: v.string(),
      description: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("permissions").collect();
  },
});

export const getRolePermissions = securedQuery({
  permission: "rbac.manage",
  args: { roleId: v.id("roles") },
  returns: v.array(v.id("permissions")),
  handler: async (ctx, args) => {
    const rolePerms = await ctx.db
      .query("role_permissions")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();
    return rolePerms.map((rp) => rp.permissionId);
  },
});

export const assignRoleToUser = securedMutation({
  permission: "rbac.manage",
  args: {
    userId: v.id("users"),
    roleId: v.id("roles"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if already assigned
    const existing = await ctx.db
      .query("user_roles")
      .withIndex("by_user_role", (q) =>
        q.eq("userId", args.userId).eq("roleId", args.roleId)
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("user_roles", {
        userId: args.userId,
        roleId: args.roleId,
      });
    }
    return null;
  },
});

export const removeRoleFromUser = securedMutation({
  permission: "rbac.manage",
  args: {
    userId: v.id("users"),
    roleId: v.id("roles"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_roles")
      .withIndex("by_user_role", (q) =>
        q.eq("userId", args.userId).eq("roleId", args.roleId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

// ============================================================================
// INTERNAL API (for system operations)
// ============================================================================

export const getRoleByName = internalQuery({
  args: { name: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("roles"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
  },
});

export const getRoleById = internalQuery({
  args: { roleId: v.id("roles") },
  returns: v.union(
    v.object({
      _id: v.id("roles"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roleId);
  },
});

export const assignRoleToUserInternal = internalMutation({
  args: {
    userId: v.id("users"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_roles")
      .withIndex("by_user_role", (q) =>
        q.eq("userId", args.userId).eq("roleId", args.roleId)
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("user_roles", {
        userId: args.userId,
        roleId: args.roleId,
      });
    }
  },
});

export const createRoleInternal = internalMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("roles"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("roles", {
      name: args.name,
      description: args.description,
    });
  },
});

export const createPermissionInternal = internalMutation({
  args: {
    key: v.string(),
    resource: v.string(),
    action: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("permissions"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("permissions")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("permissions", {
      key: args.key,
      resource: args.resource,
      action: args.action,
      description: args.description,
    });
  },
});

export const assignPermissionToRoleInternal = internalMutation({
  args: {
    roleId: v.id("roles"),
    permissionId: v.id("permissions"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("role_permissions")
      .withIndex("by_role_perm", (q) =>
        q.eq("roleId", args.roleId).eq("permissionId", args.permissionId)
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("role_permissions", {
        roleId: args.roleId,
        permissionId: args.permissionId,
      });
    }
  },
});
