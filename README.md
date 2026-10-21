# RentNest API

> Find & list rental properties with ease.

RentNest is the backend for a rental marketplace. **Landlords** list properties and approve rental requests, **tenants** browse, request, pay with Stripe and review after their stay, and **admins** moderate users, listings and categories.

- **Live API:** https://rentnest-backend-one.vercel.app
- **API docs:** [`docs/RentNest.postman_collection.json`](docs/RentNest.postman_collection.json) (import into Postman)

## Tech stack

| Area | Technology |
|---|---|
| Runtime / framework | Node.js 24, Express 5, TypeScript (ES modules) |
| Database / ORM | PostgreSQL (Neon), Prisma 7 with the `pg` driver adapter |
| Auth | JWT (`jsonwebtoken`), `bcryptjs` password hashing |
| Validation | Zod 4 |
| Payments | Stripe Checkout (test mode) + signed webhooks |
| Deployment | Vercel serverless function (`api/index.ts`) |

## Features

- **Roles:** `TENANT` and `LANDLORD` are chosen at registration. `ADMIN` accounts are created by the seed only.
- **Properties:** search and filters (location, price range, type, category, amenities, availability), plus pagination and sorting.
- **Rental lifecycle:** `PENDING → APPROVED / REJECTED → ACTIVE (after payment) → COMPLETED`.
- **Stripe payments:** checkout session, confirmation by webhook or `POST /payments/confirm` (idempotent), retry after an expired or failed session, and status tracking (`PENDING / PAID / FAILED`).
- **Reviews:** only after a completed rental, one review per rental.
- **Admin:** ban/unban users (admins can't be blocked), view all listings and rentals, manage categories.
- **Consistent responses:**
  - Success: `{ success, message, meta?, data }`
  - Error: `{ success: false, message, errorDetails: [{ path, message }] }`, used for Zod, Prisma, JWT, 404 and unexpected errors

## Getting started

```bash
git clone <repo-url> && cd rentnest-backend
npm install
cp .env.example .env          # then fill in the values
npx prisma migrate dev        # apply migrations and generate the client
npm run seed                  # admin, demo users, categories, properties
npm run dev                   # http://localhost:4000
```

For Stripe webhooks locally, run `stripe listen --forward-to localhost:4000/api/payments/webhook` and copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`. Without the Stripe CLI, call `POST /api/payments/confirm` after paying.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ | Secret used to sign access tokens |
| `JWT_ACCESS_EXPIRES_IN` | | Token lifetime (default `7d`) |
| `BCRYPT_SALT_ROUNDS` | | bcrypt cost factor (default `10`) |
| `STRIPE_SECRET` | ✅ | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Webhook signing secret (`whsec_...`) |
| `CLIENT_SUCCESS_URL` | | Checkout success redirect (`session_id` is appended) |
| `CLIENT_CANCEL_URL` | | Checkout cancel redirect |
| `PORT` | | Local port (default `4000`; not used on Vercel) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | | Override the seeded admin credentials |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the API with hot reload (`tsx watch`) |
| `npm run build` | `prisma generate` and type-check / compile with `tsc` |
| `npm start` | Start the API (`tsx src/server.ts`) |
| `npm run seed` | Run `prisma db seed` (idempotent) |
| `npx prisma migrate deploy` | Apply migrations in production |

## Admin credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@rentnest.com` | `Admin@123` |
| Landlord (demo) | `landlord1@rentnest.com`, `landlord2@rentnest.com` | `Password@123` |
| Tenant (demo) | `tenant1@rentnest.com`, `tenant2@rentnest.com` | `Password@123` |

## API endpoints

All paths are prefixed with `/api` except the health check. "Auth" is the role the bearer token must have.

### Public & auth

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | – | Health check |
| POST | `/auth/register` | – | Register as `TENANT` or `LANDLORD` |
| POST | `/auth/login` | – | Log in, returns a JWT |
| GET | `/auth/me` | any | Current user's profile |
| PATCH | `/users/me` | any | Update name, email or phone |
| GET | `/properties` | – | List properties (`searchTerm`, `city`, `division`, `propertyType`, `categoryId`, `amenities`, `availabilityStatus`, `minPrice`, `maxPrice`, `page`, `limit`, `sortBy`, `sortOrder`) |
| GET | `/properties/:id` | – | Property details |
| GET | `/categories` | – | List categories |
| GET | `/categories/:id` | – | Category details |
| GET | `/reviews/property/:propertyId` | – | Reviews for a property |

### Tenant

| Method | Path | Description |
|---|---|---|
| POST | `/rentals` | Submit a rental request |
| GET | `/rentals?status=` | My rental requests |
| GET | `/rentals/:id` | Rental request details (tenant or the property's landlord) |
| POST | `/payments/create` | Create a Stripe Checkout session for an approved rental (`/payments/checkout` is an alias) |
| POST | `/payments/confirm` | Confirm a paid session (`{ sessionId }`) |
| GET | `/payments` | My payment history |
| GET | `/payments/:id` | Payment details |
| POST | `/reviews` | Review a property after a completed rental |

### Landlord

| Method | Path | Description |
|---|---|---|
| GET | `/landlord/properties` | My properties (same filters and pagination as `/properties`) |
| POST | `/landlord/properties` | Create a property |
| PUT | `/landlord/properties/:id` | Update a property or set `availabilityStatus` |
| DELETE | `/landlord/properties/:id` | Delete a property |
| GET | `/landlord/requests?status=` | Rental requests for my properties |
| PATCH | `/landlord/requests/:id` | Approve or reject (`{ status: "APPROVED" \| "REJECTED" }`) |
| PATCH | `/landlord/requests/:id/complete` | Mark an active rental as completed |
| GET | `/landlord/reviews` | Reviews on my properties |

### Admin

| Method | Path | Description |
|---|---|---|
| GET | `/admin/users` | List users (`searchTerm`, `role`, `userStatus`, pagination) |
| PATCH | `/admin/users/:id` | Ban or unban (`{ userStatus: "BLOCKED" \| "ACTIVE" }`) |
| GET | `/admin/properties` | All properties |
| GET | `/admin/rentals` | All rental requests (`status`, pagination) |
| POST | `/categories` | Create a category |
| PUT | `/categories/:id` | Rename a category |
| DELETE | `/categories/:id` | Delete an unused category |

### Stripe

| Method | Path | Description |
|---|---|---|
| POST | `/payments/webhook` | Stripe webhook (`checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`). Signature verified. |

## Project structure

```
api/index.ts              Vercel serverless entry (exports the Express app)
src/server.ts             Local entry (app.listen)
src/app.ts                Middleware, routes, 404 and error handlers
src/app/modules/<name>/   route · controller · service · validation · interface · constant
src/app/middlewares/      auth, validateRequest, globalErrorHandler, notFound
src/app/errors/           Zod, Prisma and JWT error mappers
prisma/schema/            Multi-file Prisma schema
prisma/migrations/        SQL migrations
prisma/seed.ts            Seed script
docs/                     Postman collection
```
