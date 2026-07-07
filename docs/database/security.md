# Bombay Silvers — Database Security Architecture

## Overview

Security is implemented in three layers:

1. **Row Level Security (RLS)** — PostgreSQL enforces per-row access at the database level, regardless of what the application layer requests.
2. **Role hierarchy** — Four roles with strictly scoped permissions.
3. **IDOR prevention** — Every dealer-scoped table is filtered through the caller's `dealer_id`, never through a client-supplied value.

---

## Role Hierarchy

```
super_admin
    │
    ├── admin
    │       │
    │       └── staff
    │
    └── dealer
```

| Role | Who | Access level |
|---|---|---|
| `super_admin` | Platform owner | Unrestricted. Can manage all users including admins. |
| `admin` | Operations team | Full read/write on business data. Cannot promote users to `admin` or above. |
| `staff` | Customer support / ops | Read-only on almost everything. Limited write on orders and inventory. |
| `dealer` | Registered bullion dealer | Strictly scoped to their own data only. |

Roles are stored in `public.users.role` and retrieved by the `get_my_role()` security-definer function, which cannot be tampered with by client calls.

---

## IDOR Prevention

**IDOR (Insecure Direct Object Reference)** is the class of vulnerability where a user guesses or enumerates another user's resource ID and accesses it.

All five dealer-owned tables carry explicit IDOR defences:

| Table | Policy column | How it prevents IDOR |
|---|---|---|
| `orders` | `dealer_id` | `dealer_id = get_my_dealer_id()` — even if a dealer sends another dealer's UUID, the DB returns 0 rows. |
| `invoices` | `dealer_id` | Same pattern. Dealer cannot request invoice by ID if it belongs to another dealer. |
| `ledger_entries` | `dealer_id` | Same pattern. |
| `referrals` | `referrer_id` | Dealer only sees referrals they initiated. |
| `notifications` | `user_id` | Scoped to `auth.uid()` directly, not through dealer layer. |
| `order_items` | via `order_id` subquery | Items are filtered through `orders WHERE dealer_id = get_my_dealer_id()`. Cannot reach items of other orders. |

### Why `get_my_dealer_id()` is safe

```sql
CREATE OR REPLACE FUNCTION public.get_my_dealer_id()
RETURNS UUID AS $$
  SELECT id FROM public.dealers WHERE user_id = auth.uid() AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```

- **`auth.uid()`** is injected by Supabase from the verified JWT — it cannot be spoofed by client SQL.
- **`SECURITY DEFINER`** means the function runs under the function owner's privileges, bypassing RLS on the internal lookup without exposing that bypass to the caller.
- **`SET search_path = public`** prevents search-path injection attacks.
- The function returns `NULL` if the user has no dealer row — causing all IDOR-defended policies to return an empty set, not an error.

---

## Append-only Tables

Three tables are **immutable by design** — no UPDATE or DELETE policies exist:

| Table | Why immutable |
|---|---|
| `inventory_transactions` | Complete audit trail of every stock movement. Required for reconciliation. |
| `ledger_entries` | Financial records. Regulatory requirement; must not be altered after creation. |
| `audit_logs` | Security audit trail. Would be self-defeating if auditors could alter it. |

PostgreSQL enforces this automatically: RLS blocks all writes unless an explicit policy grants them. Since no `UPDATE` or `DELETE` policy exists on these tables, those operations fail for all roles including `super_admin` (because `FORCE ROW LEVEL SECURITY` is set).

> For `super_admin` corrections, use direct `psql` access to the database with the `postgres` superuser bypassing RLS — only in emergency situations.

---

## Soft Deletes

Tables that use `deleted_at` instead of physical deletion:

| Table | Reason |
|---|---|
| `users` | Auth records must remain intact for audit trail linkage. |
| `dealers` | Dealer history (orders, ledger) must remain accessible after offboarding. |
| `orders` | Cancelled orders still need to appear in ledger/invoice history. |

All `SELECT` policies on these tables include `AND deleted_at IS NULL` to exclude soft-deleted rows from normal queries. Admins can query deleted rows by bypassing this filter via the service role.

---

## `FORCE ROW LEVEL SECURITY`

Every table has:

```sql
ALTER TABLE public.<table> FORCE ROW LEVEL SECURITY;
```

This means **even the table owner** (the `postgres` role that ran the migrations) is subject to RLS when connected as an application user. Without `FORCE`, a database role that owns the table can bypass all RLS policies, which would be a critical privilege escalation path if Supabase's `postgres` credentials were ever used in application code.

---

## `anon` Role

The Supabase `anon` role is used for unauthenticated requests (public API access):

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
```

No business data is accessible without authentication. The only Supabase features available to `anon` are:
- `auth.signInWithOtp()` — to initiate login
- `auth.verifyOtp()` — to complete login

Everything else requires a valid JWT.

---

## Service Role Usage

Some operations bypass RLS entirely and must be performed using Supabase's **service role key** (never exposed to clients):

| Operation | Why service role |
|---|---|
| Create `dealers` row on registration | Dealer doesn't exist yet → `get_my_dealer_id()` returns NULL |
| Insert `ledger_entries` | Append-only; only trusted server code should create financial records |
| Insert `notifications` | System-generated; users cannot notify themselves |
| Update `orders.status` (confirmed → dispatched → delivered) | Status transitions are server-enforced fulfilment events |
| Update `dealers.status`, `tier`, `credit_limit` | Privileged fields that dealers cannot self-modify |
| Insert `inventory_transactions` | Append-only stock ledger |
| Generate and store `pdf_url` on invoices | Server-side PDF generation |

**The service role key must only exist in server-side environment variables, never in client-side code or the browser.**

---

## Environment Variables Required

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<public anon key>           # safe for client-side
SUPABASE_SERVICE_ROLE_KEY=<service role key>  # server-side ONLY
```

Store these in Replit Secrets. Never commit them to the repository.

---

## Migration Application Order

Three migration files must be applied **in sequence**:

| File | Contents |
|---|---|
| `20260707000001_initial_schema.sql` | Enums, tables, indexes, sequences, `updated_at` triggers, auth user hook |
| `20260707000002_rls_policies.sql` | RLS enable/force, helper functions, all access policies, grant statements |
| `20260707000003_integrity_triggers.sql` | Invoice dealer consistency, append-only locks, dealer field protection, order state machine, inventory sanity |

```bash
# Via Supabase CLI (recommended):
supabase db push

# Or manually via psql:
psql $DATABASE_URL -f supabase/migrations/20260707000001_initial_schema.sql
psql $DATABASE_URL -f supabase/migrations/20260707000002_rls_policies.sql
psql $DATABASE_URL -f supabase/migrations/20260707000003_integrity_triggers.sql
```

**Never skip migration 3.** It contains the database-level append-only triggers for `ledger_entries`, `inventory_transactions`, and `audit_logs`. Without it, those immutability guarantees only exist in RLS policy intent — not in actual DB enforcement.

## Service Role Bypass Pattern

Some server-side operations need to update privileged dealer fields. Use the session-local config flag:

```typescript
// Server-side only — never expose service role key to the client
await supabaseAdmin.rpc('set_config', {
  setting: 'app.bypass_dealer_field_lock',
  value: 'true',
  is_local: true,  // scoped to this transaction only
});
await supabaseAdmin.from('dealers').update({ status: 'active', tier: 'gold' }).eq('id', dealerId);
```

Same pattern for order status transitions using `app.bypass_order_status_lock`.
