# dor-cellular — CLAUDE.md

## What this project is

A full-stack store management app for **"דור הסלולר"** — a small phone/electronics shop owned by one person.
Built with: **React 18 + Vite + Redux Toolkit** (frontend) · **Express.js + MongoDB + Mongoose** (backend).
Deployed on Render (free tier). Frontend builds to `backend/public/`.

---

## Business rules — read before touching anything

- **No stock/inventory tracking anywhere.** Products have no stock count, no min-stock alerts, no low-stock filters.
- **No payment processing.** The owner calls or WhatsApps each customer to arrange price and delivery. There is no checkout payment.
- **No POS terminal** — orders come from the storefront, not from a cashier screen.
- **Orders are simple:** status is `new` → `handled`. "Handled" is stored in `localStorage` only (key: `dor_cellular_handled_orders`), not in the backend.
- **Email on new order:** fire-and-forget via nodemailer. Never blocks the order flow.
- **WhatsApp is the main communication channel.** Every relevant action (new order, repair ready, contact) has a WhatsApp link.
- **Primary usage is mobile** (375px+). Always design mobile-first.

---

## Roles

| Role | Access |
|------|--------|
| `admin` | Everything |
| `employee` | View products, orders, repairs, customers. Edit repair status. No suppliers, users, settings, delete actions. |
| `manager`, `salesperson`, `technician` | Legacy roles — exist in DB, do not create new ones via UI |

When creating users in the Users page, offer only `admin` / `employee`.

---

## Pages and routes

| Route | Page | Who sees it |
|-------|------|-------------|
| `/` or `/shop` | Storefront (public) | Everyone |
| `/track` | RepairTracker (public) | Everyone |
| `/login` | Login | Everyone |
| `/dashboard` | Dashboard | All authenticated |
| `/products` | Products | All authenticated |
| `/orders` | Orders | All authenticated |
| `/repairs` | Repairs | All authenticated |
| `/customers` | Customers | All authenticated |
| `/suppliers` | Suppliers | admin only |
| `/users` | Users | admin only |
| `/settings` | Settings | admin only |
| `/profile` | Profile | All authenticated |

**Removed from nav (files kept):** Reports, Notifications, Branches, AuditLogs, AIAssistant, POS.

---

## Design system

- **Default theme:** Dark Violet (`--bg: #0c0c1e`, `--brand-primary: #8b5cf6`, `--brand-accent: #f59e0b`)
- **Light theme:** Pearl — the sidebar is **always dark** (`--sidebar-bg: #1a0f40`) even in light mode
- **Deep Blue theme:** available as third option
- Sidebar text uses `--sidebar-text` / `--sidebar-text-muted` (not `--text`/`--text-muted`) because sidebar is always dark
- `--surface-1` is defined — equal to `--surface`. Used by cart drawer, Quick View modal, WhatsApp FAB tooltip.
- Theme is stored in Redux (`settingsSlice`) → persisted to `localStorage`

### CSS file locations
- `frontend/src/styles/_variables.scss` — all CSS custom properties (colors, shadows)
- `frontend/src/styles/main.scss` — all component styles

---

## Key frontend state

| Store | Key selectors |
|-------|---------------|
| `authSlice` | `selectCurrentUser` |
| `settingsSlice` | `selectTheme`, `selectCustomColors`, `selectStoreInfo`, `selectStoreWhatsApp` |
| `productsSlice` | `selectAllProducts`, `selectProductsStatus` |
| `uiSlice` | `selectLanguage`, `selectToasts` |

Store info (business name, phone, whatsapp, address, email) lives in `settingsSlice` → `localStorage`. Default: `{ name: 'דור הסלולר', phone: '052-6098000', whatsapp: '9720526098000', address: 'בית הכרם 30' }`.

---

## Key backend structure

```
backend/
  src/
    controllers/    orders, products, repairs, auth, customers, suppliers
    routes/         auth, orders, products, repairs, customers, suppliers, public
    services/       email.service.js (nodemailer, fire-and-forget)
    middleware/     auth, rbac, audit, validate
    models/         User, Product, Order, Repair, Customer, Supplier, Category, Branch
    config/         env.js (reads all env vars)
```

### Important backend endpoints
- `GET /api/public/repairs/:ticketId` — public, no auth, returns repair status only (no PII)
- `GET /api/products/:id/qr` — generates QR PNG (qrcode library) — still exists in backend but removed from frontend UI
- `POST /api/products/bulk-import` — CSV import (send JSON rows)
- `PATCH /api/auth/users/:id` — admin-only, updates role/isActive

---

## Environment variables

Set in Render dashboard (`sync: false`):
- `MONGO_URI` — MongoDB Atlas connection string
- `FRONTEND_URL` — Render service URL (used for QR links)
- `OWNER_EMAIL` — email that receives new order notifications
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — nodemailer config (optional; email silently skipped if not set)
- `ANTHROPIC_API_KEY` — kept in render.yaml but not used

Auto-generated:
- `JWT_SECRET`, `JWT_REFRESH_SECRET`

---

## i18n

Two languages: Hebrew (`he.json`) and English (`en.json`) in `frontend/src/i18n/`.
Hebrew is RTL — the app uses `<html dir="rtl">` when Hebrew is active.
Always add new strings to both files.

---

## What NOT to add

- Stock / inventory quantities on products
- Payment processing or credit card integration
- POS terminal (the `/pos` route is removed from nav)
- Reports page (removed from nav)
- Socket.io / real-time notifications (removed)
- Multiple branches management
- QR code button on Products page (backend endpoint kept, frontend removed)
- `purchasePrice` or `minStockAlert` fields on product forms

---

## Claude Autonomous Workflow Layer (IMPORTANT)

This section defines how Claude should behave when working on this project.

Claude must operate like a senior full-stack engineer responsible for maintaining a production system.

---

## 1. First step in any task

Before making any change, Claude must:

- Read relevant files first
- Understand existing architecture
- Identify business rules constraints (VERY IMPORTANT for this project)
- Identify risk areas (orders, backend APIs, DB models)

Claude must NEVER assume missing behavior — only infer from code.

---

## 2. Safe change policy (critical for this project)

Because this is a real business system:

- Never break order flow
- Never modify backend API responses without explicit reason
- Never introduce payment or stock logic (explicit business rule)
- Never change DB schema unless required and explained
- Prefer additive changes over destructive changes

---

## 3. Business logic priority (highest priority)

Claude must always respect:

- No inventory system exists and must NOT be introduced
- Orders are simple and lightweight
- WhatsApp is the primary communication channel
- Email is fire-and-forget only
- Frontend is mobile-first (shop runs on phones)
- Admin simplicity is more important than feature richness

If a suggestion conflicts with these rules → discard it.

---

## 4. Autonomous Review Behavior

Whenever Claude is asked to modify code, it must automatically perform:

1. Impact analysis
   - What files will be affected?
   - Does it touch backend order flow?
   - Does it affect DB models?

2. Risk classification:
   - LOW risk → safe UI or styling change
   - MEDIUM risk → frontend logic or API usage
   - HIGH risk → backend, orders, authentication, database

3. Safety check:
   - Ensure no business rules are violated
   - Ensure no unnecessary refactor is introduced

---

## 5. Default mindset

Claude should behave like:

- Senior engineer
- Working alone on production system
- Responsible for system stability
- Not allowed to be “creative” in business logic
- Allowed to be creative only in UI, refactors, and optimizations

---

## 6. Refactor rules (VERY STRICT)

- No large-scale refactors without explicit request
- Refactors must be incremental
- Behavior must remain identical after refactor
- If unsure → do NOT refactor

---

## 7. Debugging protocol

When debugging:

- Reproduce issue mentally from code
- Trace request flow:
  frontend → API → controller → service → DB
- Identify minimal fix
- Avoid redesigning system to fix small bugs

---

## 8. Output expectation

When Claude suggests changes:

It must always include:

- What is being changed
- Why it is needed
- Risk level
- What might break
- Minimal safe implementation

---

## 9. Forbidden behavior (strict)

Claude must NOT:

- Introduce payments
- Introduce inventory logic
- Add unnecessary backend complexity
- Over-engineer solutions
- Change business model assumptions
- Modify WhatsApp-based workflow

---

## Agent Execution Mode (VERY IMPORTANT)

All Claude agents in this project must operate in "Approval Mode".

This means:

- Agents are allowed to analyze code freely
- Agents are allowed to suggest changes
- Agents are allowed to propose refactors
- Agents are allowed to generate full implementations

BUT:

## STRICT RULE

Agents are NOT allowed to modify any codebase files automatically.

They must always:

1. Explain the issue
2. Propose a solution
3. Show exact code changes
4. WAIT for user approval before applying changes

---

## Change Policy

Any modification to:
- backend
- database
- authentication
- orders flow
- business logic

must ALWAYS require explicit user confirmation before execution.

---

## Safe Areas (no approval needed for suggestions only)

- UI improvements
- styling suggestions
- performance suggestions
- refactor proposals (not execution)

---

## Execution Rule

Claude must behave as:

"Senior engineer who prepares production-ready patches, but never deploys them without approval."