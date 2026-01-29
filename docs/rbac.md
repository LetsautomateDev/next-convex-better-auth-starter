# RBAC (Role-Based Access Control)

System kontroli dostępu oparty na rolach i uprawnieniach.

## Architektura

```
User → UserRoles → Roles → RolePermissions → Permissions
```

## Schema bazy danych

### users
```typescript
{
  visitorId: string,      // Better Auth user.id
  email: string,
  firstName: string,
  lastName: string,
  phone?: string,
  status: "invitation_sent" | "active" | "blocked",
  lastLoginAt?: number
}
```

### roles
```typescript
{
  name: string,           // np. "administrator", "user"
  description?: string
}
```

### permissions
```typescript
{
  key: string,            // np. "user.create"
  resource: string,       // np. "user"
  action: string,         // np. "create"
  description?: string
}
```

### role_permissions (many-to-many)
```typescript
{ roleId: Id<"roles">, permissionId: Id<"permissions"> }
```

### user_roles (many-to-many)
```typescript
{ userId: Id<"users">, roleId: Id<"roles"> }
```

## Predefiniowane role i uprawnienia

### Role
| Nazwa | Opis |
|-------|------|
| `administrator` | Pełny dostęp, omija wszystkie sprawdzenia uprawnień |
| `user` | Standardowy użytkownik |

### Uprawnienia
| Klucz | Zasób | Akcja | Opis |
|-------|-------|-------|------|
| `rbac.manage` | rbac | manage | Zarządzanie rolami i uprawnieniami |
| `user.list` | user | list | Podgląd listy użytkowników |
| `user.create` | user | create | Zapraszanie nowych użytkowników |
| `user.update` | user | update | Edycja użytkowników |
| `user.delete` | user | delete | Usuwanie/blokowanie użytkowników |

## Secured Functions (Backend)

### Import

```typescript
import { securedQuery, securedMutation, securedAction } from "./lib/rbacGuard";
```

### securedQuery

Query wymagające autoryzacji i opcjonalnie konkretnego uprawnienia.

```typescript
export const listUsers = securedQuery({
  permission: "user.list",  // Wymagane uprawnienie (opcjonalne)
  args: {
    // Zod validators
  },
  returns: v.array(v.object({...})),
  handler: async (ctx, args, auth) => {
    // auth.authUser - dane z Better Auth
    // auth.appUserId - ID użytkownika w tabeli users
    // auth.roles - tablica ról użytkownika
    // auth.permissions - tablica uprawnień użytkownika

    const users = await ctx.db.query("users").collect();
    return users;
  },
});
```

### securedMutation

Mutacja wymagająca autoryzacji.

```typescript
export const updateUserStatus = securedMutation({
  permission: "user.update",
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("blocked")),
  },
  returns: v.null(),
  handler: async (ctx, args, auth) => {
    await ctx.db.patch(args.userId, { status: args.status });
    return null;
  },
});
```

### securedAction

Akcja (do operacji async jak wysyłanie emaili) wymagająca autoryzacji.

```typescript
export const sendReport = securedAction({
  permission: "reports.send",
  args: {
    reportId: v.id("reports"),
  },
  returns: v.null(),
  handler: async (ctx, args, auth) => {
    // ctx.runQuery, ctx.runMutation, ctx.runAction dostępne
    // Operacje async (email, zewnętrzne API, itp.)
    return null;
  },
});
```

### Bez wymaganego uprawnienia

Jeśli endpoint wymaga tylko zalogowania (bez konkretnego uprawnienia):

```typescript
export const getCurrentUserProfile = securedQuery({
  // Brak "permission" - wymaga tylko zalogowania
  args: {},
  returns: v.object({...}),
  handler: async (ctx, args, auth) => {
    const user = await ctx.db.get(auth.appUserId);
    return user;
  },
});
```

## RbacSnapshot

Obiekt `auth` przekazywany do handlera:

```typescript
type RbacSnapshot = {
  authUser: AuthResult;           // Dane sesji Better Auth
  appUserId: Id<"users">;         // ID w tabeli users
  roles: Array<Doc<"roles">>;     // Role użytkownika
  permissions: Array<Doc<"permissions">>; // Uprawnienia użytkownika
};
```

## Logika sprawdzania uprawnień

1. Sprawdzenie czy user jest zalogowany
2. Sprawdzenie czy user ma rekord w tabeli `users`
3. Załadowanie ról i uprawnień
4. **Administrator omija wszystkie sprawdzenia** - jeśli user ma rolę `administrator`, nie sprawdzamy uprawnień
5. Sprawdzenie czy user ma wymagane uprawnienie

```typescript
// convex/lib/rbacGuard.ts
export async function requirePermission(ctx, permissionKey) {
  const snapshot = await requireAuth(ctx);

  // Administrator bypass
  if (isAdministrator(snapshot)) {
    return snapshot;
  }

  if (!snapshot.permissions.some(p => p.key === permissionKey)) {
    throw new Error(`FORBIDDEN: missing permission "${permissionKey}"`);
  }

  return snapshot;
}
```

## RBAC na Frontendzie

### RbacProvider

Wrap aplikacji w `RbacProvider`:

```tsx
// app/layout.tsx
import { RbacProvider } from "./providers/rbac-provider";

export default function RootLayout({ children }) {
  return (
    <ConvexClientProvider>
      <RbacProvider>
        {children}
      </RbacProvider>
    </ConvexClientProvider>
  );
}
```

### useRbac Hook

```tsx
import { useRbac } from "@/app/providers/rbac-provider";

function MyComponent() {
  const {
    isLoading,
    rbacStatus,      // "loading" | "authed" | "noAppUser" | "blocked"
    sessionUser,     // Dane sesji
    appUserId,       // ID w tabeli users
    roles,           // Tablica ról
    permissions,     // Tablica uprawnień
    can,             // Funkcja sprawdzająca uprawnienie
  } = useRbac();

  if (isLoading) return <Loading />;
  if (rbacStatus === "blocked") return <BlockedMessage />;
  if (rbacStatus !== "authed") return <LoginPrompt />;

  return (
    <div>
      {can("user.create") && (
        <button>Dodaj użytkownika</button>
      )}
    </div>
  );
}
```

### useCan Hook

Skrócona forma do sprawdzania pojedynczego uprawnienia:

```tsx
import { useCan } from "@/app/providers/rbac-provider";

function DeleteButton() {
  const canDelete = useCan("user.delete");

  if (!canDelete) return null;

  return <button>Usuń</button>;
}
```

### Can Component

Deklaratywne sprawdzanie uprawnień:

```tsx
import { Can } from "@/app/providers/rbac-provider";

function UserManagement() {
  return (
    <div>
      <Can permission="user.list">
        <UserList />
      </Can>

      <Can permission="user.create" fallback={<NoAccessMessage />}>
        <CreateUserButton />
      </Can>
    </div>
  );
}
```

## Dodawanie nowych uprawnień

1. Dodaj uprawnienie do seed'a (`convex/seed.ts`):

```typescript
const permissions = [
  // Istniejące...
  { key: "product.create", resource: "product", action: "create" },
  { key: "product.list", resource: "product", action: "list" },
];
```

2. Uruchom seed:
```bash
bunx convex run seed:seedRbac
```

3. Użyj w secured function:
```typescript
export const createProduct = securedMutation({
  permission: "product.create",
  // ...
});
```

4. Przypisz uprawnienia do roli przez panel admin lub seed.

## Przykład kompletnego flow

### Backend (convex/products.ts)
```typescript
import { v } from "convex/values";
import { securedQuery, securedMutation } from "./lib/rbacGuard";

export const listProducts = securedQuery({
  permission: "product.list",
  args: {},
  returns: v.array(v.object({
    _id: v.id("products"),
    name: v.string(),
    price: v.number(),
  })),
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

export const createProduct = securedMutation({
  permission: "product.create",
  args: {
    name: v.string(),
    price: v.number(),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("products", args);
  },
});
```

### Frontend
```tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Can, useRbac } from "@/app/providers/rbac-provider";

export function ProductsPage() {
  const { isLoading, rbacStatus } = useRbac();
  const products = useQuery(api.products.listProducts);
  const createProduct = useMutation(api.products.createProduct);

  if (isLoading) return <Loading />;
  if (rbacStatus !== "authed") return <LoginPrompt />;

  return (
    <div>
      <h1>Produkty</h1>

      <Can permission="product.create">
        <button onClick={() => createProduct({ name: "Nowy", price: 100 })}>
          Dodaj produkt
        </button>
      </Can>

      <ul>
        {products?.map(p => (
          <li key={p._id}>{p.name} - {p.price} PLN</li>
        ))}
      </ul>
    </div>
  );
}
```

## Błędy

| Kod | Opis |
|-----|------|
| `UNAUTHORIZED` | Brak sesji / niezalogowany |
| `USER_RECORD_NOT_FOUND` | Brak rekordu w tabeli users |
| `FORBIDDEN: missing permission "xxx"` | Brak wymaganego uprawnienia |
