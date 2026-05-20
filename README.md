# Dor-Store — Mobile Phone Retail Management

Full-stack management platform for a cellular/mobile phone store. Covers inventory, POS, repair lab,
customer CRM, suppliers & purchase orders, reports, real-time notifications, multi-branch, and
Hebrew/English UI with RTL/LTR support.

## Stack

- **Backend:** Node.js + Express, MongoDB (Mongoose), JWT auth + bcryptjs, Joi validation,
  Helmet/CORS/rate-limit, Socket.io, Swagger UI, pdfkit, qrcode, Winston logging.
- **Frontend:** React 18, Vite, react-router, react-i18next (HE/EN), Recharts, Axios, Socket.io client, SASS.
- **Architecture:** routes → controllers → services → mongoose models. Middleware for auth, RBAC,
  validation, error handling, audit logging.

## Project layout

```
dor-store/
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── seed/seed.js
│   └── src/
│       ├── app.js
│       ├── config/{env,db,swagger}.js
│       ├── middleware/{auth,rbac,validate,error,logger,audit}.js
│       ├── models/{User,Branch,Category,Product,StockMovement,Customer,
│       │           Supplier,PurchaseOrder,Order,Repair,Notification,AuditLog}.js
│       ├── services/...  (one per domain + pdf/qr/sms helpers)
│       ├── controllers/...
│       ├── validators/...
│       ├── routes/...
│       ├── sockets/index.js
│       └── utils/{logger,ApiError,asyncHandler,pagination}.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx, App.jsx
        ├── api/client.js
        ├── context/{Auth,Language}Context.jsx
        ├── i18n/{index.js, en.json, he.json}
        ├── components/{Layout,ProtectedRoute}.jsx
        ├── pages/{Login,Dashboard,POS,Products,Orders,Repairs,Customers,
        │           Suppliers,Reports,Notifications,Branches,Users}.jsx
        └── styles/{main,_variables}.scss
```

## Quick start

### Prerequisites

- Node.js 18+
- MongoDB 6+ (a single-node replica set is required for transactions used in stock adjust + orders;
  see "Transactions" below)

### Backend

```bash
cd backend
cp .env.example .env        # tweak MONGO_URI / JWT_SECRET if needed
npm install
npm run seed                # creates test users, branches, suppliers, products
npm run dev                 # http://localhost:5000
```

- Swagger UI: <http://localhost:5000/api/docs>
- Health: <http://localhost:5000/health>

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

The Vite dev server proxies `/api` and `/socket.io` to the backend on port 5000.

## Test users (after `npm run seed`)

| Role         | Email                       | Password      |
|--------------|-----------------------------|---------------|
| Admin        | admin@dor-store.test        | admin1234     |
| Manager      | manager@dor-store.test      | manager1234   |
| Salesperson  | sales@dor-store.test        | sales1234     |
| Technician   | tech@dor-store.test         | tech1234      |

## Modules

| Module          | Endpoints (under `/api`)                                                              |
|-----------------|----------------------------------------------------------------------------------------|
| Auth & Users    | `/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/password/{forgot,reset,change}`, `/auth/register`, `/auth/users` |
| Branches        | `/branches`, `/branches/:id/inventory`                                                |
| Categories      | `/categories`                                                                          |
| Products        | `/products`, `/products/scan/:code`, `/products/:id/movements`, `/products/low-stock`, `/products/bulk-import`, `/products/transfer`, `/products/:id/adjust` |
| Customers       | `/customers`, `/customers/:id/purchases`, `/customers/:id/repairs`, `/customers/birthdays`, `/customers/:id/loyalty` |
| Orders / POS    | `/orders`, `/orders/:id/payments`, `/orders/:id/refund`, `/orders/:id/cancel`, `/orders/:id/invoice.pdf` |
| Repairs         | `/repairs`, `/repairs/:id/status`, `/repairs/:id/sign`, `/repairs/performance`        |
| Suppliers & POs | `/suppliers`, `/suppliers/:id/pay`, `/suppliers/purchase-orders`, `/suppliers/purchase-orders/:id/receive` |
| Reports         | `/reports/dashboard`, `/reports/daily-sales`, `/reports/monthly-profit`, `/reports/best-sellers`, `/reports/dead-stock`, `/reports/employees`, `/reports/vat`, `/reports/export.csv` |
| Notifications   | `/notifications`, `/notifications/read-all` (real-time via Socket.io)                 |

## RBAC

Four roles: `admin`, `manager`, `salesperson`, `technician`. Roles are enforced per route via the
`authorize(...)` middleware. The matrix is:

- **admin** — everything, including user/branch admin and product deletion.
- **manager** — most write operations: products, POs, refunds, reports.
- **salesperson** — POS, customer create/edit, view inventory, intake repairs.
- **technician** — read all, edit repair status/notes.

## Real-time notifications

Server: `src/sockets/index.js` mounts Socket.io with JWT handshake (`socket.handshake.auth.token`).
Server-side `notification.service.emit(io, data)` or domain services emit a `notification` event.

Client: `Layout.jsx` connects on login, listens for `notification`, and shows a toast.

## Transactions

`product.service.adjustStock` and `order.service.create` use Mongoose sessions / `withTransaction`
for atomic stock decrements. **Transactions require a replica-set MongoDB.** For local dev:

```bash
# Run a single-node replica set:
mongod --dbpath /var/lib/mongodb --replSet rs0
# In another shell:
mongosh --eval "rs.initiate()"
```

Or use MongoDB Atlas, which always runs as a replica set. If you run a standalone `mongod`, stock
adjustments still work, but Mongoose will fall back to non-transactional behavior (operations are
still safe in this small scale, but multi-step rollback won't happen on failure).

## Hebrew / English & RTL

`frontend/src/i18n/index.js` sets `<html dir="rtl">` automatically when the language is `he`.
The SASS layout uses `[dir='rtl']` selectors to flip the sidebar grid; logical properties
(`insetInlineEnd`, `marginInlineStart`, `borderInlineStart`) handle component-level direction.
Use the **EN/עב** toggle in the navbar.

## Stubs & extension points

The breadth-first scaffold marks these as working stubs ready for production hardening:

- **SMS / WhatsApp** — `services/sms.service.js` is a `console.log` stub. Wire up Twilio / WhatsApp
  Cloud API / a local IL provider by replacing the body of `send()`.
- **PDF invoices** — `services/pdf.service.js` produces a clean LTR invoice with a QR code. For full
  Hebrew RTL invoices, register an RTL-capable font (e.g. Heebo via `doc.registerFont`) and use a
  Bidi text helper.
- **Bulk CSV import** — `POST /api/products/bulk-import` accepts an array of rows. To upload an
  actual CSV file, add `multer` + a small CSV parser in the route.
- **OpenAPI** — Swagger is mounted at `/api/docs` and parses JSDoc `@openapi` blocks. Expand the
  block comments on routes/models to document every payload.
- **Mobile app integration** — the API is JSON+JWT and the Socket.io namespace is open to any
  authenticated client, so a React Native app can reuse the same endpoints.
- **Backup / restore** — use `mongodump` / `mongorestore` against `MONGO_URI`. Wrap in a shell
  script under `backend/scripts/` and call from a cron / Task Scheduler entry.

## Security baseline

- Bcrypt password hashing (`User.setPassword` / `verifyPassword`).
- JWT access + refresh tokens, signed with separate secrets.
- Helmet headers, CORS pinned to `FRONTEND_URL`, rate-limit at 200 req / 15 min per IP.
- Joi validation on every mutating route, plus Mongoose schema validation.
- Audit log written for sensitive endpoints via `middleware/audit.js`.

## Scripts

| Backend                     | Frontend                |
|-----------------------------|-------------------------|
| `npm run dev` — nodemon     | `npm run dev` — Vite    |
| `npm start` — prod          | `npm run build`         |
| `npm run seed` — DB seed    | `npm run preview`       |

## License

MIT — internal demo project.
