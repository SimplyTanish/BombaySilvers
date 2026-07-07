# Bombay Silvers — Dealer Terminal

A Bloomberg-terminal-style dealer platform UI for Bombay Silvers, a bullion wholesaler. Built as a frontend-only mockup with no backend wired up.

## Stack

- **React 19** + **TanStack Router** (file-based routing via `src/routes/`)
- **Vite** (via `@lovable.dev/vite-tanstack-config`)
- **Tailwind CSS v4**
- **shadcn/ui** component library (Radix primitives)
- **TanStack Query** for data-fetching patterns (no live API yet)

## Running the app

```
npm run dev
```

Dev server runs on port 5173.

## Project structure

```
src/
  routes/         # File-based routes (TanStack Router)
    index.tsx     # Landing/gallery page
    dashboard.tsx # Live rates & positions
    inventory.tsx # Bars, coins, purity
    orders.tsx    # Order placement & tracking
    ledger.tsx    # Balance & statements
    invoices.tsx  # PDF invoice history
    login.tsx     # Mobile-first sign in
    otp.tsx       # 6-digit OTP challenge
    onboarding.tsx# Dealer firm & profile setup
    kyc.tsx       # PAN · GST · document upload
    admin.tsx     # Admin dashboard
    referrals.tsx # Dealer network referrals
    security.tsx  # Devices · sessions · audit
    settings.tsx  # Account settings
  components/     # Shared components (AppShell, shadcn/ui)
  hooks/          # Custom hooks
  lib/            # Utilities and error handling
```

## Notes

- All data is mocked/static — no backend is connected
- Vite server configured for `host: "0.0.0.0"` to work in Replit's proxied preview

## User preferences

<!-- User preferences will be recorded here -->
