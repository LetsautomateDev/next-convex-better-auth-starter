import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Application users table - maps to Better Auth users via visitorId
  users: defineTable({
    visitorId: v.string(), // Better Auth user.id - the critical link
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    avatarId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("invitation_sent"),
      v.literal("active"),
      v.literal("blocked")
    ),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_visitorId", ["visitorId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  // Permissions define granular actions on resources
  permissions: defineTable({
    key: v.string(), // e.g. "product.create"
    resource: v.string(), // e.g. "product"
    action: v.string(), // e.g. "create"
    description: v.optional(v.string()),
  })
    .index("by_key", ["key"])
    .index("by_resource", ["resource"]),

  // Roles group permissions together
  roles: defineTable({
    name: v.string(), // e.g. "administrator", "editor"
    description: v.optional(v.string()),
  }).index("by_name", ["name"]),

  // Many-to-many: roles to permissions
  role_permissions: defineTable({
    roleId: v.id("roles"),
    permissionId: v.id("permissions"),
  })
    .index("by_role", ["roleId"])
    .index("by_permission", ["permissionId"])
    .index("by_role_perm", ["roleId", "permissionId"]),

  // Many-to-many: users to roles
  user_roles: defineTable({
    userId: v.id("users"),
    roleId: v.id("roles"),
  })
    .index("by_user", ["userId"])
    .index("by_role", ["roleId"])
    .index("by_user_role", ["userId", "roleId"]),
});
