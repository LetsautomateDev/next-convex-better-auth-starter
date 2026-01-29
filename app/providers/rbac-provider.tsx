"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import type { Id } from "@/convex/_generated/dataModel";

type PermissionKey = string;
type RbacStatus = "loading" | "authed" | "noAppUser" | "blocked";

type Role = {
  _id: string;
  _creationTime: number;
  name: string;
  description?: string;
};

type Permission = {
  _id: string;
  _creationTime: number;
  key: string;
  resource: string;
  action: string;
  description?: string;
};

type SessionUser = ReturnType<typeof authClient.useSession>["data"];

type RbacContextValue = {
  isLoading: boolean;
  hasSession: boolean;
  hasSessionError: boolean;
  isBlocked: boolean;
  rbacStatus: RbacStatus;
  sessionUser: SessionUser | null;
  appUserId: Id<"users"> | null;
  roles: Role[];
  permissions: Permission[];
  can: (permission: PermissionKey) => boolean;
};

const RbacContext = createContext<RbacContextValue | undefined>(undefined);

const STALE_SESSION_TIMEOUT_MS = 3000;

function useStaleSessionDetection(
  hasClientSession: boolean,
  isSessionPending: boolean,
  serverAuth: { isAuthenticated: boolean; isBlocked: boolean } | undefined
): boolean {
  const [isStale, setIsStale] = useState(false);

  const hasMismatch =
    hasClientSession &&
    !isSessionPending &&
    serverAuth !== undefined &&
    !serverAuth.isAuthenticated &&
    !serverAuth.isBlocked;

  useEffect(() => {
    if (!hasMismatch) {
      setIsStale(false);
      return;
    }

    const timer = setTimeout(() => setIsStale(true), STALE_SESSION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [hasMismatch]);

  return isStale;
}

export function RbacProvider({ children }: { children: ReactNode }) {
  const {
    data: sessionData,
    isPending: sessionPending,
    error: sessionError,
  } = authClient.useSession();

  const rbac = useQuery(api.rbac_me.getMyRbac, {});

  const hasClientSession = Boolean(sessionData?.user);
  const hasSessionError = Boolean(sessionError);
  const hasSession = hasClientSession && !hasSessionError;
  const isSessionLoading = sessionPending && !hasSessionError;

  const isStaleSession = useStaleSessionDetection(
    hasClientSession,
    sessionPending,
    rbac
  );

  const effectiveSessionError = hasSessionError || isStaleSession;

  const isBlocked = rbac?.isBlocked ?? false;
  const isRbacLoading = rbac === undefined;

  const roles = rbac?.user?.roles ?? [];
  const permissions = rbac?.user?.permissions ?? [];
  const isAdministrator = roles.some((role) => role.name === "administrator");

  const can = useCallback(
    (permissionKey: PermissionKey) =>
      isAdministrator ||
      permissions.some((permission) => permission.key === permissionKey),
    [isAdministrator, permissions]
  );

  const rbacStatus: RbacStatus = effectiveSessionError
    ? "noAppUser"
    : isSessionLoading || isRbacLoading
      ? "loading"
      : isBlocked
        ? "blocked"
        : rbac?.isAuthenticated && rbac.user
          ? "authed"
          : "noAppUser";

  const isLoading =
    !effectiveSessionError && (isSessionLoading || isRbacLoading);

  const contextValue = useMemo<RbacContextValue>(
    () => ({
      isLoading,
      hasSession,
      hasSessionError: effectiveSessionError,
      isBlocked,
      rbacStatus,
      sessionUser: sessionData ?? null,
      appUserId: rbac?.user?.appUserId ?? null,
      roles,
      permissions,
      can,
    }),
    [
      isLoading,
      hasSession,
      effectiveSessionError,
      isBlocked,
      rbacStatus,
      sessionData,
      rbac?.user?.appUserId,
      roles,
      permissions,
      can,
    ]
  );

  return (
    <RbacContext.Provider value={contextValue}>{children}</RbacContext.Provider>
  );
}

export function useRbac() {
  const ctx = useContext(RbacContext);
  if (!ctx) {
    throw new Error("useRbac must be used within RbacProvider");
  }
  return ctx;
}

export function useCan(permission: PermissionKey) {
  const { can } = useRbac();
  return can(permission);
}

export function Can({
  permission,
  fallback = null,
  children,
}: {
  permission: PermissionKey;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const allowed = useCan(permission);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
