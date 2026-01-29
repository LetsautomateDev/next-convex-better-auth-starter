import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { securedQuery, securedMutation, securedAction } from "./lib/rbacGuard";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { createAuth, authComponent } from "./auth";

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

// ============================================================================
// INVITE USER
// ============================================================================

/**
 * Generuje losowe hasło (64 znaki hex).
 */
function generateRandomPassword(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Zaprasza nowego użytkownika do systemu.
 * Tworzy użytkownika w BetterAuth z losowym hasłem,
 * wysyła email z linkiem do ustawienia hasła.
 */
export const inviteUser = securedAction({
  permission: "user.create",
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    roleId: v.id("roles"),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      userId: v.id("users"),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // 0. Walidacja formatu email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      return { success: false as const, error: "Nieprawidłowy format adresu email" };
    }

    // 1. Sprawdź czy użytkownik z tym emailem już istnieje
    const existingUser = await ctx.runQuery(internal.users.getUserByEmailInternal, {
      email: args.email,
    });
    if (existingUser) {
      return { success: false as const, error: "Użytkownik z tym adresem email już istnieje" };
    }

    const { auth: betterAuth } = await authComponent.getAuth(createAuth, ctx);
    const fullName = `${args.firstName} ${args.lastName}`;
    const randomPassword = generateRandomPassword();

    // 2. Sprawdź czy rola istnieje
    const role = await ctx.runQuery(internal.rbac.getRoleById, {
      roleId: args.roleId,
    });
    if (!role) {
      return { success: false as const, error: "Wybrana rola nie istnieje" };
    }

    // 3. Utwórz użytkownika w BetterAuth
    let result;
    try {
      result = await betterAuth.api.signUpEmail({
        body: {
          email: args.email,
          password: randomPassword,
          name: fullName,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already exists") || message.includes("User already exists")) {
        return { success: false as const, error: "Użytkownik z tym adresem email już istnieje" };
      }
      return { success: false as const, error: "Nie udało się utworzyć użytkownika w systemie autoryzacji" };
    }

    if (!result || !result.user) {
      return { success: false as const, error: "Nie udało się utworzyć użytkownika w systemie autoryzacji" };
    }

    const visitorId = result.user.id;

    // 4. Utwórz użytkownika w Convex z statusem invitation_sent
    const userId: Id<"users"> = await ctx.runMutation(internal.users.createUserInternal, {
      visitorId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      status: "invitation_sent",
    });

    // 5. Przypisz rolę
    await ctx.runMutation(internal.rbac.assignRoleToUserInternal, {
      userId,
      roleId: args.roleId,
    });

    // 6. Wygeneruj link do resetu hasła i wyślij email z zaproszeniem
    try {
      await betterAuth.api.requestPasswordReset({
        body: {
          email: args.email,
          redirectTo: "/auth/reset-password/confirm",
        },
      });
    } catch {
      return { success: false as const, error: "Nie udało się wysłać emaila z zaproszeniem" };
    }

    return { success: true as const, userId };
  },
});
