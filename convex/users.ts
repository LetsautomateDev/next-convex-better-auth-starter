import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { securedQuery, securedMutation } from "./lib/rbacGuard";
import { Id } from "./_generated/dataModel";

// ============================================================================
// PUBLIC API (secured)
// ============================================================================

export const listUsers = securedQuery({
  permission: "user.list",
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      email: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      phone: v.optional(v.string()),
      status: v.union(
        v.literal("invitation_sent"),
        v.literal("active"),
        v.literal("blocked")
      ),
      lastLoginAt: v.optional(v.number()),
      roles: v.array(
        v.object({
          _id: v.id("roles"),
          name: v.string(),
        })
      ),
    })
  ),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const userRoles = await ctx.db
          .query("user_roles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        const roles: Array<{ _id: Id<"roles">; name: string }> = [];
        for (const userRole of userRoles) {
          const role = await ctx.db.get(userRole.roleId);
          if (role) {
            roles.push({ _id: role._id, name: role.name });
          }
        }

        return {
          _id: user._id,
          _creationTime: user._creationTime,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          status: user.status,
          lastLoginAt: user.lastLoginAt,
          roles,
        };
      })
    );

    return usersWithRoles;
  },
});

export const getCurrentUserProfile = securedQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      email: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      phone: v.optional(v.string()),
      status: v.string(),
      roles: v.array(v.string()),
      permissions: v.array(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, _args, auth) => {
    const user = await ctx.db.get(auth.appUserId);
    if (!user) return null;

    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
      roles: auth.roles.map((r) => r.name),
      permissions: auth.permissions.map((p) => p.key),
    };
  },
});

export const updateUserStatus = securedMutation({
  permission: "user.update",
  args: {
    userId: v.id("users"),
    status: v.union(
      v.literal("active"),
      v.literal("blocked")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { status: args.status });
    return null;
  },
});

// ============================================================================
// INTERNAL API (for auth hooks and system operations)
// ============================================================================

export const getUserByVisitorIdInternal = internalQuery({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_visitorId", (q) => q.eq("visitorId", args.visitorId))
      .unique();
  },
});

export const getUserByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const createUserInternal = internalMutation({
  args: {
    visitorId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    status: v.union(
      v.literal("invitation_sent"),
      v.literal("active"),
      v.literal("blocked")
    ),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      visitorId: args.visitorId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      status: args.status,
    });
  },
});

export const updateLastLoginInternal = internalMutation({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_visitorId", (q) => q.eq("visitorId", args.visitorId))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, { lastLoginAt: Date.now() });
    }
  },
});

export const updateUserStatusByVisitorId = internalMutation({
  args: {
    visitorId: v.string(),
    status: v.union(
      v.literal("invitation_sent"),
      v.literal("active"),
      v.literal("blocked")
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_visitorId", (q) => q.eq("visitorId", args.visitorId))
      .unique();

    if (user && user.status === "invitation_sent") {
      await ctx.db.patch(user._id, { status: args.status });
    }
  },
});

// ============================================================================
// PUBLIC QUERIES (unsecured - for auth flow)
// ============================================================================

/**
 * Sprawdza czy użytkownik z podanym emailem jest zablokowany.
 * Używane przed reset hasła.
 */
export const isUserBlockedByEmail = query({
  args: { email: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    return user?.status === "blocked";
  },
});
