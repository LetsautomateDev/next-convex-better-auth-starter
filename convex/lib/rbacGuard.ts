import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { action, mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { authComponent } from "../auth";
import type {
  PropertyValidators,
  ObjectType,
  Validator,
} from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rbacInternalModule: Record<string, any> = internal as any;

type AuthCtx = QueryCtx | MutationCtx;

type AuthResult = NonNullable<
  Awaited<ReturnType<typeof authComponent.safeGetAuthUser>>
>;

export type RbacSnapshot = {
  authUser: AuthResult;
  appUserId: Id<"users">;
  roles: Array<Doc<"roles">>;
  permissions: Array<Doc<"permissions">>;
};

const ADMINISTRATOR_ROLE = "administrator";

const unauthorizedError = () => new Error("UNAUTHORIZED");
const forbiddenError = (permission: string) =>
  new Error(`FORBIDDEN: missing permission "${permission}"`);

function isAdministrator(snapshot: Pick<RbacSnapshot, "roles">): boolean {
  return snapshot.roles.some((role) => role.name === ADMINISTRATOR_ROLE);
}

export async function getAuthUserOrNull(ctx: AuthCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  return user ?? null;
}

export async function getAppUserIdOrNull(ctx: AuthCtx) {
  const authUser = await getAuthUserOrNull(ctx);
  if (!authUser) {
    return null;
  }

  const appUser = await ctx.db
    .query("users")
    .withIndex("by_visitorId", (q) => q.eq("visitorId", authUser._id))
    .unique();

  return appUser?._id ?? null;
}

export async function loadUserSnapshot(
  ctx: AuthCtx,
  userId: Id<"users">
): Promise<Pick<RbacSnapshot, "roles" | "permissions">> {
  const roles = await loadRolesForUser(ctx, userId);
  const permissions = await loadPermissionsForRoles(
    ctx,
    roles.map((r) => r._id)
  );
  return { roles, permissions };
}

export async function requireAuth(ctx: AuthCtx): Promise<RbacSnapshot> {
  const authUser = await getAuthUserOrNull(ctx);
  if (!authUser) {
    throw unauthorizedError();
  }

  const appUserId = await getAppUserIdOrNull(ctx);
  if (!appUserId) {
    throw new Error("USER_RECORD_NOT_FOUND");
  }

  const { roles, permissions } = await loadUserSnapshot(ctx, appUserId);
  return { authUser, appUserId, roles, permissions };
}

export async function requirePermission(
  ctx: AuthCtx,
  permissionKey: string
): Promise<RbacSnapshot> {
  const snapshot = await requireAuth(ctx);
  // Administrator role bypasses all permission checks
  if (isAdministrator(snapshot)) {
    return snapshot;
  }
  if (!snapshot.permissions.some((perm) => perm.key === permissionKey)) {
    throw forbiddenError(permissionKey);
  }
  return snapshot;
}

type SecuredQueryDefinition<Args extends PropertyValidators, Returns> = {
  args: Args;
  returns: Validator<Returns, "required", string>;
  permission?: string;
  handler: (
    ctx: QueryCtx,
    args: ObjectType<Args>,
    auth: RbacSnapshot
  ) => Returns | Promise<Returns>;
};

type SecuredMutationDefinition<Args extends PropertyValidators, Returns> = {
  args: Args;
  returns: Validator<Returns, "required", string>;
  permission?: string;
  handler: (
    ctx: MutationCtx,
    args: ObjectType<Args>,
    auth: RbacSnapshot
  ) => Returns | Promise<Returns>;
};

type SecuredActionDefinition<Args extends PropertyValidators, Returns> = {
  args: Args;
  returns: Validator<Returns, "required", string>;
  permission?: string;
  handler: (
    ctx: ActionCtx,
    args: ObjectType<Args>,
    auth: RbacSnapshot
  ) => Returns | Promise<Returns>;
};

export function securedQuery<Args extends PropertyValidators, Returns>(
  definition: SecuredQueryDefinition<Args, Returns>
) {
  const { permission, handler, args, returns } = definition;
  return query({
    args,
    returns,
    handler: async (ctx: QueryCtx, handlerArgs: ObjectType<Args>) => {
      const auth =
        permission === undefined
          ? await requireAuth(ctx)
          : await requirePermission(ctx, permission);
      return handler(ctx, handlerArgs, auth);
    },
  } as unknown as Parameters<typeof query>[0]);
}

export function securedMutation<Args extends PropertyValidators, Returns>(
  definition: SecuredMutationDefinition<Args, Returns>
) {
  const { permission, handler, args, returns } = definition;
  return mutation({
    args,
    returns,
    handler: async (ctx: MutationCtx, handlerArgs: ObjectType<Args>) => {
      const auth =
        permission === undefined
          ? await requireAuth(ctx)
          : await requirePermission(ctx, permission);
      return handler(ctx, handlerArgs, auth);
    },
  } as unknown as Parameters<typeof mutation>[0]);
}

export function securedAction<Args extends PropertyValidators, Returns>(
  definition: SecuredActionDefinition<Args, Returns>
) {
  const { permission, handler, args, returns } = definition;
  return action({
    args,
    returns,
    handler: async (ctx: ActionCtx, handlerArgs: ObjectType<Args>) => {
      const authorizeRef = rbacInternalModule?.rbac_internal?.authorize;
      if (!authorizeRef) {
        throw new Error("RBAC authorize internal query not registered");
      }

      const baseAuth = await ctx.runQuery(
        authorizeRef,
        permission === undefined ? {} : { permission }
      );

      const authUser = await authComponent.safeGetAuthUser(ctx);
      if (!authUser) {
        throw unauthorizedError();
      }

      const auth: RbacSnapshot = {
        authUser,
        ...baseAuth,
      };

      return handler(ctx, handlerArgs, auth);
    },
  } as unknown as Parameters<typeof action>[0]);
}

async function loadRolesForUser(ctx: AuthCtx, userId: Id<"users">) {
  const roleAssignments = await ctx.db
    .query("user_roles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const roles: Array<Doc<"roles">> = [];
  for (const assignment of roleAssignments) {
    const role = await ctx.db.get(assignment.roleId);
    if (role) {
      roles.push(role);
    }
  }

  return roles;
}

async function loadPermissionsForRoles(
  ctx: AuthCtx,
  roleIds: Array<Id<"roles">>
) {
  const permissionMap = new Map<Id<"permissions">, Doc<"permissions">>();

  for (const roleId of roleIds) {
    const rolePermissions = await ctx.db
      .query("role_permissions")
      .withIndex("by_role", (q) => q.eq("roleId", roleId))
      .collect();

    for (const relation of rolePermissions) {
      if (!permissionMap.has(relation.permissionId)) {
        const permission = await ctx.db.get(relation.permissionId);
        if (permission) {
          permissionMap.set(permission._id, permission);
        }
      }
    }
  }

  return Array.from(permissionMap.values());
}
