import { internalMutation, internalAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { createAuth } from "./auth";

/**
 * Seed the database with initial roles and permissions.
 * Run this once after deploying: bunx convex run seed:seedRbac
 */
export const seedRbac = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ adminRoleId: Id<"roles">; userRoleId: Id<"roles">; permissionCount: number }> => {
    // Create roles
    const existingAdmin = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "administrator"))
      .unique();

    const adminRoleId =
      existingAdmin?._id ??
      (await ctx.db.insert("roles", {
        name: "administrator",
        description: "Full system access - bypasses all permission checks",
      }));

    const existingUser = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "user"))
      .unique();

    const userRoleId =
      existingUser?._id ??
      (await ctx.db.insert("roles", {
        name: "user",
        description: "Standard user with basic permissions",
      }));

    // Define permissions
    const permissionDefinitions = [
      { key: "rbac.manage", resource: "rbac", action: "manage", description: "Manage roles and permissions" },
      { key: "user.list", resource: "user", action: "list", description: "View list of users" },
      { key: "user.create", resource: "user", action: "create", description: "Invite new users" },
      { key: "user.update", resource: "user", action: "update", description: "Edit user details" },
      { key: "user.delete", resource: "user", action: "delete", description: "Delete or block users" },
    ];

    // Create all permissions
    const permissionIds: Record<string, Id<"permissions">> = {};
    for (const perm of permissionDefinitions) {
      const existing = await ctx.db
        .query("permissions")
        .withIndex("by_key", (q) => q.eq("key", perm.key))
        .unique();

      permissionIds[perm.key] = existing?._id ?? (await ctx.db.insert("permissions", perm));
    }

    // Assign user.list to "user" role
    const userListPermId = permissionIds["user.list"];
    if (userListPermId) {
      const existingAssignment = await ctx.db
        .query("role_permissions")
        .withIndex("by_role_perm", (q) =>
          q.eq("roleId", userRoleId).eq("permissionId", userListPermId)
        )
        .unique();

      if (!existingAssignment) {
        await ctx.db.insert("role_permissions", {
          roleId: userRoleId,
          permissionId: userListPermId,
        });
      }
    }

    console.log("RBAC seed completed!");
    console.log(`Created roles: administrator, user`);
    console.log(`Created ${permissionDefinitions.length} permissions`);

    return {
      adminRoleId,
      userRoleId,
      permissionCount: permissionDefinitions.length,
    };
  },
});

/**
 * Helper mutation to create app user and assign admin role.
 * Called by seedFirstAdmin action.
 */
export const createAppUserWithAdminRole = internalMutation({
  args: {
    visitorId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      console.log(`User ${args.email} already exists in app users table`);
      return existing._id;
    }

    // Create app user
    const userId = await ctx.db.insert("users", {
      visitorId: args.visitorId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      status: "active",
    });

    // Get administrator role
    const adminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "administrator"))
      .unique();

    if (!adminRole) {
      throw new Error("Administrator role not found. Run seedRbac first.");
    }

    // Assign admin role
    await ctx.db.insert("user_roles", {
      userId,
      roleId: adminRole._id,
    });

    console.log(`Created admin user: ${args.email}`);
    return userId;
  },
});

/**
 * Seed the first administrator user.
 * Run: bunx convex run seed:seedFirstAdmin '{"email":"admin@example.com","password":"SecurePassword123!","firstName":"Admin","lastName":"User"}'
 */
export const seedFirstAdmin = internalAction({
  args: {
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // First ensure RBAC is seeded
    await ctx.runMutation(internal.seed.seedRbac, {});

    // Create Better Auth user via sign-up
    const auth = createAuth(ctx);

    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: args.email,
          password: args.password,
          name: `${args.firstName} ${args.lastName}`,
        },
      });

      if (!result.user) {
        return { success: false, message: "Failed to create Better Auth user" };
      }

      // Create app user and assign admin role
      await ctx.runMutation(internal.seed.createAppUserWithAdminRole, {
        visitorId: result.user.id,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
      });

      return {
        success: true,
        message: `Admin user ${args.email} created successfully. You can now sign in.`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      // If user already exists in Better Auth, try to link to app user
      if (message.includes("already exists") || message.includes("User already exists")) {
        return {
          success: false,
          message: `User ${args.email} already exists in Better Auth. If you need to reset, delete the user from the database first.`,
        };
      }

      return { success: false, message };
    }
  },
});
