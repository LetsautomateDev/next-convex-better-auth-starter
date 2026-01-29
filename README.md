# Entalpi

Next.js + Convex + Better Auth + RBAC boilerplate

## Uruchomienie

```bash
bun install
bun run dev
bunx convex dev
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
| `SITE_URL` | URL frontendu (dla linków w emailach) | `http://localhost:3000` lub `https://app.entalpi.pl` |
| `RESEND_API_KEY` | Klucz API Resend | `re_xxxxxxxxxx` |
| `EMAIL_FROM` | Adres nadawcy emaili | `noreply@mail.entalpi.pl` |

## Inicjalizacja RBAC

Po pierwszym deploymencie uruchom seed:

```bash
bunx convex run seed:seedRbac
```

Utworzy to:
- Role: `administrator`, `user`
- Podstawowe uprawnienia: `rbac.manage`, `user.list`, `user.create`, `user.update`, `user.delete`

## Struktura auth

- `/auth/sign-in` - logowanie
- `/auth/reset-password` - reset hasła
- `/auth/reset-password/confirm` - ustawienie nowego hasła
- `/auth/sign-up` - wyłączone (redirect do sign-in)

Użytkownicy są zapraszani przez administratora (invitation-only system).
