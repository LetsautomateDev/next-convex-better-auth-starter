## Package Manager

**Always use `bun`** - never use npm or npx. Use `bunx` instead of `npx`.

## Tech Stack

### Frontend
- **Framework:** Next.js 16 + React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI (accordion, dialog, dropdown, etc.)
- **Forms:** React Hook Form + Zod 4
- **State:** Convex React client
- **Theming:** next-themes

### Backend
- **BaaS:** Convex (serverless database + functions)
- **Database:** Convex managed (Zod schema validation)
- **Auth:** Better Auth z Convex adapter
- **Email:** Resend + @react-email

### Other
- **Charts:** Recharts
- **Icons:** Lucide React
- **Toasts:** Sonner
- **Dates:** date-fns

## Project Structure

```
repo/
├── app/                    # Next.js App Router
│   ├── api/auth/           # Better Auth API routes
│   ├── auth/               # Auth pages (sign-in, reset-password)
│   ├── providers/          # React Context providers
│   │   ├── convex-client-provider.tsx
│   │   └── rbac-provider.tsx
│   └── middleware.ts       # Route protection
│
├── convex/                 # Backend (Convex)
│   ├── auth.ts             # Better Auth setup
│   ├── schema.ts           # Database schema
│   ├── lib/
│   │   └── rbacGuard.ts    # Secured query/mutation/action wrappers
│   ├── users.ts            # User management
│   ├── rbac.ts             # Role & permission management
│   ├── rbac_internal.ts    # Internal RBAC operations
│   ├── rbac_me.ts          # Current user RBAC info
│   ├── email.ts            # Email utilities
│   ├── emails/             # Email templates (React)
│   └── seed.ts             # Database seeding
│
├── lib/
│   ├── auth-client.ts      # Better Auth client
│   ├── auth-server.ts      # Server-side auth helpers
│   └── utils.ts            # Utilities (cn for Tailwind)
│
├── components/
│   └── ui/                 # Radix UI components
│
└── docs/                   # Documentation
    ├── auth.md             # Authentication docs
    └── rbac.md             # RBAC docs
```

## Key Patterns

### Backend (Convex)

1. **Secured Functions** - Use `securedQuery`, `securedMutation`, `securedAction` for protected endpoints
2. **Internal Functions** - Use `internalQuery`, `internalMutation` for system operations
3. **Zod Schema** - All data validated with Zod via Convex validators

### Frontend

1. **RBAC Context** - Use `useRbac()` hook for permission checks
2. **Conditional Rendering** - Use `<Can permission="...">` component
3. **Convex Queries** - Use `useQuery()` from `convex/react`

## Documentation

- [Authentication](./docs/auth.md) - Login, sessions, password reset
- [RBAC](./docs/rbac.md) - Roles, permissions, secured functions
- [Convex](./docs/convex.md) - Convex guidelines, best practices, validators, queries, mutations

## Environment Variables

```env
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CONVEX_SITE_URL=
SITE_URL=
RESEND_API_KEY=
EMAIL_FROM=
```

## Quick Start

```bash
# Install
bun install

# Dev
bun run dev

# Seed database (first time)
bunx convex run seed:seedRbac
bunx convex run seed:seedFirstAdmin '{"email":"admin@example.com","password":"Test123456!","firstName":"Admin","lastName":"User"}'
```
