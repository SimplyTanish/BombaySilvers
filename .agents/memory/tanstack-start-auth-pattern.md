---
name: TanStack Start auth pattern
description: How auth guard and Supabase session management is wired in this project.
---

# TanStack Start + Supabase Auth Pattern

## The rule
Auth guard lives in `AppShell` (client-side `useEffect`). All authenticated routes use `AppShell`. Unauthenticated routes (login, otp, onboarding, kyc) do not.

## Why
Server-side `beforeLoad` guards with Supabase require cookie-based session handling (`@supabase/ssr`) which is a larger migration. For an internal dealer terminal, client-side guard in the shell component is sufficient and much simpler.

## How to apply

**Auth hook** (`src/hooks/use-auth.tsx`):
- Calls `supabase.auth.getSession()` on mount
- Subscribes to `onAuthStateChange` to stay in sync
- Returns `{ session, user, loading, signOut }`

**AppShell guard** (`src/components/AppShell.tsx`):
```tsx
const { session, user, loading, signOut } = useAuth();
useEffect(() => {
  if (!loading && !session) {
    navigate({ to: "/login" });
  }
}, [loading, session, navigate]);

if (loading || !session) return <div className="min-h-screen bg-background" />;
```

**Login flow** (`src/routes/login.tsx`):
- `supabase.auth.signInWithOtp({ phone: "+91" + cleaned })`
- Navigates to `/otp?phone=+91xxx&trust=true`

**OTP flow** (`src/routes/otp.tsx`):
- Reads `phone` and `trust` from `Route.useSearch()` (validated via `validateSearch`)
- `supabase.auth.verifyOtp({ phone, token, type: "sms" })`
- Navigates to `/dashboard` on success

**Sign-out**: called from sidebar Sign out button; navigates to `/login`.
