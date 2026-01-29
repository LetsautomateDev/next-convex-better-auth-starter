import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
