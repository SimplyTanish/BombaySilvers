# Database

## users

Stores every authenticated user.

Roles

- dealer
- staff
- admin
- super_admin

---

## firms

Dealer companies.

---

## dealers

Dealer profiles.

Stores

- Tier
- Status
- Credit Limit
- Current Balance

---

## products

Product catalogue.

---

## inventory

Bombay Silvers warehouse inventory.

---

## inventory_transactions

Append-only inventory audit trail.

---

## orders

Dealer purchase orders.

---

## order_items

Products belonging to orders.

---

## invoices

Invoices generated after order confirmation.

---

## ledger_entries

Dealer financial ledger.

---

## notifications

System notifications.

---

## referrals

Dealer referral program.

---

## sessions

Tracks active devices and sessions.

---

## audit_logs

Immutable audit trail.