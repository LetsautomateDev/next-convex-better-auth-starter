# Next.js + Convex + Better Auth Starter

Next.js + Convex + Better Auth + RBAC boilerplate

## Uruchomienie

```bash
bun install
bun run dev
```

## Zmienne środowiskowe

### Next.js (`.env.local`)

```bash
CONVEX_DEPLOYMENT=dev:xxx
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://xxx.convex.site
SITE_URL=http://localhost:3000

# Resend (email)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@twoja-domena.com
```

### Convex (Dashboard → Settings → Environment Variables)

| Zmienna | Opis | Przykład |
|---------|------|----------|
| `SITE_URL` | URL frontendu (dla linków w emailach) | `http://localhost:3000` |
| `RESEND_API_KEY` | Klucz API Resend | `re_xxxxxxxxxx` |
| `EMAIL_FROM` | Adres nadawcy emaili | `noreply@twoja-domena.com` |

## Inicjalizacja RBAC

Po pierwszym deploymencie uruchom seed:

```bash
bunx convex run seed:seedRbac
```

Utworzy to:
- Role: `administrator`, `user`
- Podstawowe uprawnienia: `rbac.manage`, `user.list`, `user.create`, `user.update`, `user.delete`

## Utworzenie pierwszego administratora

System jest oparty na zaproszeniach (invitation-only), więc potrzebujesz ręcznie utworzyć pierwszego administratora:

```bash
bunx convex run seed:seedFirstAdmin '{"email":"admin@example.com","password":"Test123456!","firstName":"Admin","lastName":"User"}'
```

Zamień dane na swoje. Komenda:
1. Uruchomi `seedRbac` (jeśli jeszcze nie było)
2. Utworzy użytkownika w Better Auth
3. Utworzy powiązanego użytkownika w tabeli Convex
4. Przypisze mu rolę `administrator`

Po wykonaniu możesz zalogować się na `/auth/sign-in`.

## Struktura auth

- `/auth/sign-in` - logowanie
- `/auth/reset-password` - reset hasła
- `/auth/reset-password/confirm` - ustawienie nowego hasła

Użytkownicy są zapraszani przez administratora (invitation-only system).
