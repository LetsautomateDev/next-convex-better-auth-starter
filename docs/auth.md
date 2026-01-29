# Authentication

System autoryzacji oparty na **Better Auth** z adapterem Convex.

## Konfiguracja

Główne pliki:
- `convex/auth.ts` - konfiguracja Better Auth (server)
- `convex/auth.config.ts` - providers config
- `lib/auth-client.ts` - klient Better Auth (frontend)
- `lib/auth-server.ts` - server-side helpers

## Metody logowania

### Email + Password
Podstawowa metoda. Użytkownicy muszą być najpierw zaproszeni przez admina.

### Invitation Flow
1. Admin tworzy usera ze statusem `invitation_sent`
2. System wysyła email z linkiem do ustawienia hasła
3. User klika link i ustawia hasło
4. Status zmienia się na `active`

## Statusy użytkownika

| Status | Opis |
|--------|------|
| `invitation_sent` | Zaproszony, nie ustawił jeszcze hasła |
| `active` | Aktywny, pełny dostęp |
| `blocked` | Zablokowany, nie może się zalogować |

## Sesje

- Czas życia: **8 godzin**
- Auto-refresh: co **1 godzinę**
- Przechowywanie: HTTP-only cookies

## Reset hasła

```typescript
// Frontend - wysłanie emaila
await authClient.forgetPassword({
  email: "user@example.com",
  redirectTo: "/auth/reset-password",
});

// Frontend - ustawienie nowego hasła (po kliknięciu w link)
await authClient.resetPassword({
  newPassword: "NoweHasło123!",
  token: tokenFromUrl,
});
```

Po resecie hasła wszystkie sesje użytkownika są unieważniane.

## Użycie na frontendzie

### Hook sesji

```tsx
import { authClient } from "@/lib/auth-client";

function MyComponent() {
  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) return <Loading />;
  if (error || !session) return <LoginPrompt />;

  return <div>Zalogowany jako: {session.user.email}</div>;
}
```

### Logowanie

```tsx
import { authClient } from "@/lib/auth-client";

async function handleLogin(email: string, password: string) {
  const result = await authClient.signIn.email({
    email,
    password,
  });

  if (result.error) {
    // Obsługa błędu (np. 403 = blocked)
    console.error(result.error);
  }
}
```

### Wylogowanie

```tsx
await authClient.signOut();
```

## Server-side auth

```typescript
// lib/auth-server.ts
import { auth } from "@/convex/auth";
import { headers } from "next/headers";

export async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}
```

## Middleware (ochrona route'ów)

```typescript
// app/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard"],
};
```

**Uwaga:** Middleware sprawdza tylko obecność cookie. Właściwa autoryzacja powinna być w każdym chronionym komponencie/API.

## Auth hooks (server-side)

W `convex/auth.ts` są zdefiniowane hooki:

### Before Sign In
```typescript
hooks: {
  before: [
    {
      matcher: (ctx) => ctx.path === "/sign-in/email",
      handler: async (ctx) => {
        // Blokuje logowanie dla zablokowanych użytkowników
        const user = await ctx.context.runQuery(
          internal.users.getUserByEmailInternal,
          { email: ctx.body?.email }
        );
        if (user?.status === "blocked") {
          throw new APIError("FORBIDDEN", { message: "User blocked" });
        }
      },
    },
  ],
}
```

### After Sign In
```typescript
hooks: {
  after: [
    {
      matcher: (ctx) => ctx.path === "/sign-in/email",
      handler: async (ctx) => {
        // Aktualizuje lastLoginAt
        await ctx.context.runMutation(
          internal.users.updateLastLoginInternal,
          { visitorId: ctx.context.newSession?.userId }
        );
      },
    },
  ],
}
```

## Pliki konfiguracyjne

### convex/auth.config.ts
```typescript
export default {
  providers: [
    {
      id: "credentials",
      // ... konfiguracja
    },
  ],
};
```

### .env
```env
SITE_URL=http://localhost:3000
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@yourdomain.com
```
