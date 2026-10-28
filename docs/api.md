# RentNest API Reference

- **Base URL:** `https://rentnest-backend-one.vercel.app` (local: `http://localhost:4000`)
- **Postman:** [`RentNest.postman_collection.json`](./RentNest.postman_collection.json)
- All paths below are relative to the base URL. Request bodies are JSON (`Content-Type: application/json`).

## Contents

- [Conventions](#conventions): authentication, response envelope, errors, pagination
- [Health](#health)
- [Auth & profile](#auth--profile)
- [Public: properties, categories, reviews](#public)
- [Tenant: rentals, payments, reviews](#tenant)
- [Landlord: properties, requests, reviews](#landlord)
- [Admin: users, properties, rentals, categories](#admin)
- [Stripe webhook](#stripe-webhook)

---

## Conventions

### Authentication

Protected routes need a JWT from `POST /api/auth/login`:

```
Authorization: Bearer <accessToken>
```

The `auth(...roles)` middleware runs before validation and:

| Situation                            | Status | Message                                         |
| ------------------------------------ | ------ | ----------------------------------------------- |
| No `Authorization` header / no token | 401    | `You are not authorized`                        |
| Malformed or wrongly signed token    | 401    | `Invalid authentication token`                  |
| Expired token                        | 401    | `Your session has expired, please log in again` |
| User no longer exists                | 401    | `User not found`                                |
| User is blocked                      | 403    | `User is blocked`                               |
| Role not allowed on this route       | 403    | `Forbidden`                                     |

Tokens expire after `JWT_ACCESS_EXPIRES_IN` (default `7d`). The role is read from the token, so a role change takes effect at the next login.

### Success envelope

```json
{
  "success": true,
  "message": "Properties retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 4, "totalPage": 1 },
  "data": []
}
```

`meta` is present only on paginated lists. `Decimal` fields (`rentAmount`, `totalRent`, `amount`) are returned as **strings**, e.g. `"180"`.

### Error envelope

Every error, whatever its source, has this shape:

```json
{
  "success": false,
  "message": "Validation failed",
  "errorDetails": [
    { "path": "email", "message": "Invalid email address" },
    { "path": "password", "message": "Password must be at least 6 characters" }
  ]
}
```

| Source                                                             | Status          | `message`                                                                     |
| ------------------------------------------------------------------ | --------------- | ----------------------------------------------------------------------------- |
| Zod validation (body, params, query)                               | 400             | `Validation failed` (one `errorDetails` item per field)                       |
| Malformed JSON body                                                | 400             | `Malformed JSON in request body`                                              |
| Prisma P2002 (unique constraint)                                   | 409             | `A record with this <field> already exists`                                   |
| Prisma P2003 (foreign key, e.g. deleting a property with bookings) | 409             | `This record is referenced by other records and cannot be changed or deleted` |
| Prisma P2025 (record not found)                                    | 404             | `Requested record not found`                                                  |
| Prisma P2023 (malformed id)                                        | 400             | `Invalid ID format`                                                           |
| Prisma validation error                                            | 400             | `Invalid data provided`                                                       |
| Other Prisma errors                                                | 500             | `Database error`                                                              |
| JWT errors                                                         | 401             | see [Authentication](#authentication)                                         |
| Business-rule errors (`AppError`)                                  | 400/403/404/409 | specific message                                                              |
| Unknown route                                                      | 404             | `API route not found`                                                         |
| Unexpected error                                                   | 500             | `Something went wrong` (details hidden in production)                         |

### Pagination, sorting

Paginated lists accept:

| Param       | Rules                                             | Default     |
| ----------- | ------------------------------------------------- | ----------- |
| `page`      | integer ≥ 1                                       | `1`         |
| `limit`     | integer 1–100                                     | `10`        |
| `sortBy`    | endpoint-specific whitelist (listed per endpoint) | `createdAt` |
| `sortOrder` | `asc` \| `desc`                                   | `desc`      |

Values outside the rules return 400 (e.g. `sortBy=password`).

---

## Health

### `GET /`

No auth.

```json
{ "success": true, "message": "RentNest Backend API is running 🚀" }
```

---

## Auth & profile

### `POST /api/auth/register`

No auth. Creates a `TENANT` or `LANDLORD` account (`ADMIN` cannot self-register).

| Field      | Type   | Rules                  |
| ---------- | ------ | ---------------------- |
| `name`     | string | required, min 1        |
| `email`    | string | required, valid email  |
| `password` | string | required, min 6        |
| `phone`    | string | optional               |
| `role`     | enum   | `TENANT` \| `LANDLORD` |

**201** → the new user without `password`.
**Errors:** 400 validation · 409 `User already exists`.

### `POST /api/auth/login`

No auth.

| Field      | Type   | Rules       |
| ---------- | ------ | ----------- |
| `email`    | string | valid email |
| `password` | string | min 1       |

**200**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "<jwt-access-token>",
    "user": {
      "id": "2e74a46f-268d-4f9c-b8e4-870716d62ac6",
      "name": "Nadia Tenant",
      "email": "tenant1@rentnest.com",
      "phone": "+15035550103",
      "role": "TENANT",
      "userStatus": "ACTIVE",
      "createdAt": "2026-10-21T14:16:53.513Z",
      "updatedAt": "2026-10-21T14:42:25.046Z"
    }
  }
}
```

**Errors:** 400 validation · 401 `Invalid email or password` (same for unknown email and wrong password) · 403 `Your account has been blocked. Please contact support.` (only after a correct password).

### `GET /api/auth/me`

Auth: any role. **200** → the current user's profile from the database (no `password`).

### `PATCH /api/users/me`

Auth: any role. Updates the signed-in user's own profile. At least one field is required; **any other field (e.g. `role`, `userStatus`, `password`) is rejected with 400.**

| Field   | Type   | Rules                        |
| ------- | ------ | ---------------------------- |
| `name`  | string | optional, min 1 (trimmed)    |
| `email` | string | optional, valid email        |
| `phone` | string | optional, `^\+?[0-9]{7,15}$` |

**200** → updated profile.
**Errors:** 400 validation / unknown field / empty body · 409 `This email is already used by another account`.

---

## Public

### `GET /api/properties`

No auth. Search, filter, paginate and sort properties.

| Query param                  | Rules                                                          | Behaviour                                                           |
| ---------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `searchTerm`                 | string                                                         | case-insensitive match on `title`, `description`, `city`, `address` |
| `city`                       | string                                                         | case-insensitive exact match                                        |
| `division`                   | string                                                         | case-insensitive exact match on the US state (e.g. `Texas`)         |
| `propertyType`               | `APARTMENT` \| `HOUSE` \| `STUDIO` \| `VILLA`                  | exact                                                               |
| `categoryId`                 | uuid                                                           | exact                                                               |
| `amenities`                  | comma-separated string                                         | property must have **all** listed amenities                         |
| `availabilityStatus`         | `AVAILABLE` \| `RENTED`                                        | exact                                                               |
| `minPrice`, `maxPrice`       | number > 0, `minPrice ≤ maxPrice`                              | monthly `rentAmount` range                                          |
| `page`, `limit`, `sortOrder` | see [Pagination](#pagination-sorting)                          |                                                                     |
| `sortBy`                     | `createdAt` \| `rentAmount` \| `area` \| `bedrooms` \| `title` |                                                                     |

Example: `GET /api/properties?city=austin&limit=1&sortBy=rentAmount&sortOrder=asc`

```json
{
  "success": true,
  "message": "Properties retrieved successfully",
  "meta": { "page": 1, "limit": 1, "total": 1, "totalPage": 1 },
  "data": [
    {
      "id": "47a4bebd-6eaa-4c4b-93e8-096096c904fe",
      "title": "Furnished Studio near Lady Bird Lake",
      "city": "Austin",
      "rentAmount": "1450",
      "propertyType": "STUDIO",
      "availabilityStatus": "AVAILABLE",
      "amenities": ["wifi", "furnished", "air-conditioning"],
      "category": {
        "id": "83dae858-5d6d-4a74-9824-e06a20fc0c04",
        "name": "Studio"
      },
      "owner": {
        "id": "b39e9683-e065-4d8b-a6bd-4669f030eb6c",
        "name": "Rahim Landlord",
        "email": "landlord1@rentnest.com",
        "phone": "+12125550101"
      }
    }
  ]
}
```

_(Each property also includes `description`, `address`, `division`, `bedrooms`, `bathrooms`, `area`, `images`, `categoryId`, `ownerId`, `createdAt`, `updatedAt`; trimmed here.)_

**Errors:** 400 validation.

### `GET /api/properties/:id`

No auth. `:id` must be a uuid. **200** → property with `category` and `owner`.
**Errors:** 400 invalid id · 404 `Property not found`.

### `GET /api/categories`

No auth. **200** → all categories sorted by name (not paginated).

### `GET /api/categories/:id`

No auth. **200** → one category. **Errors:** 400 invalid id · 404 `Category not found`.

### `GET /api/reviews/property/:propertyId`

No auth. **200** → reviews for the property (newest first) with reviewer `{ id, name }`. Not paginated.
**Errors:** 400 invalid id · 404 `Property not found`.

---

## Tenant

All routes below require a **TENANT** token unless noted.

### `POST /api/rentals`

Submit a rental request.

| Field         | Type   | Rules                                               |
| ------------- | ------ | --------------------------------------------------- |
| `propertyId`  | uuid   | required                                            |
| `moveInDate`  | string | ISO 8601 date-time, e.g. `2026-12-01T00:00:00.000Z` |
| `leaseMonths` | number | positive integer (JSON number, not a string)        |

`totalRent` is calculated as `rentAmount × leaseMonths`. **201** → booking (`bookingStatus: "PENDING"`) with its property.
**Errors:** 400 validation · 400 `This property is not available for rent` · 404 `Property not found` · 409 `You already have a pending rental request for this property`.

### `GET /api/rentals`

Your rental requests, newest first, with property details. Optional `?status=` (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `ACTIVE`, `COMPLETED`). Not paginated.

### `GET /api/rentals/:id`

Auth: **TENANT or LANDLORD**. The tenant who made the request or the landlord who owns the property. **200** → booking with property and payment.
**Errors:** 400 invalid id · 403 `You are not authorized to view this rental request` · 404 `Rental request not found`.

### `POST /api/payments/create`

Creates a Stripe Checkout Session for your **APPROVED** rental. `POST /api/payments/checkout` is an alias.

| Field       | Type | Rules    |
| ----------- | ---- | -------- |
| `bookingId` | uuid | required |

**201**

```json
{
  "success": true,
  "message": "Stripe checkout session created successfully",
  "data": {
    "sessionId": "cs_test_a1...",
    "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_a1...",
    "paymentId": "5871a954-74aa-4940-8c31-020f42444ad3"
  }
}
```

Open `checkoutUrl` and pay with test card `4242 4242 4242 4242`. Calling it again returns the same session while it is still open, or replaces an expired/failed one.
**Errors:** 400 validation · 400 `Payment can only be made for an approved rental` · 403 not your booking · 404 `Rental booking not found` · 409 `This rental has already been paid`.

### `POST /api/payments/confirm`

Verifies a Checkout Session with Stripe and, if it is paid, marks the payment `PAID`, the booking `ACTIVE` and the property `RENTED` in one transaction. Safe to call after the webhook has already done this (idempotent).

| Field       | Type   | Rules                         |
| ----------- | ------ | ----------------------------- |
| `sessionId` | string | Stripe session id, `^cs_(test | live)_[A-Za-z0-9]+$` |

**200** → payment with booking and property.
**Errors:** 400 validation · 400 `Payment has not been completed yet` · 400 session expired (payment marked `FAILED`) · 403 not your payment · 404 `No payment found for this checkout session`.

### `GET /api/payments`

Your payment history (newest first) with booking and property. Not paginated.

```json
{
  "id": "5871a954-74aa-4940-8c31-020f42444ad3",
  "transactionId": "cs_test_a1Hvtu...",
  "amount": "750",
  "paymentMethod": "CARD",
  "provider": "STRIPE",
  "paymentStatus": "PAID",
  "paymentDate": "2026-10-21T14:42:17.550Z"
}
```

### `GET /api/payments/:id`

**200** → one payment with booking and property. **Errors:** 400 invalid id · 403 not your payment · 404 `Payment not found`.

### `POST /api/reviews`

Review a property after a **COMPLETED** rental: one review per completed rental.

| Field        | Type   | Rules             |
| ------------ | ------ | ----------------- |
| `propertyId` | uuid   | required          |
| `rating`     | number | integer 1–5       |
| `comment`    | string | 1–1000 characters |

**201** → review (linked to the completed booking).
**Errors:** 400 validation · 403 `You can only review a property after a completed rental` · 404 `Property not found` · 409 `You have already reviewed your completed rental for this property`.

---

## Landlord

All routes below require a **LANDLORD** token. Landlords can only see and change their own properties and the requests for them.

### `GET /api/landlord/properties`

Your properties, with the same filters, sorting and pagination as [`GET /api/properties`](#get-apiproperties).

### `POST /api/landlord/properties`

| Field                                                 | Type     | Rules                                         |
| ----------------------------------------------------- | -------- | --------------------------------------------- |
| `title`, `description`, `address`, `city`, `division` | string   | required, min 1                               |
| `rentAmount`                                          | number   | > 0 (monthly)                                 |
| `bedrooms`, `bathrooms`                               | number   | integer ≥ 0                                   |
| `area`                                                | number   | integer > 0                                   |
| `propertyType`                                        | enum     | `APARTMENT` \| `HOUSE` \| `STUDIO` \| `VILLA` |
| `categoryId`                                          | uuid     | must exist                                    |
| `amenities`                                           | string[] | at least 1, non-empty strings                 |
| `images`                                              | string[] | at least 1, valid URLs                        |

Numbers may be sent as numbers or numeric strings. **201** → created property (`availabilityStatus: "AVAILABLE"`).
**Errors:** 400 validation · 404 `Category not found`.

### `PUT /api/landlord/properties/:id`

Update any subset of the create fields, plus `availabilityStatus` (`AVAILABLE` \| `RENTED`) to set availability. Empty body → 400.
**Errors:** 400 validation · 403 `You are not allowed to update this property` · 404 property/category not found.

### `DELETE /api/landlord/properties/:id`

**200** with `data: null`.
**Errors:** 400 invalid id · 403 not your property · 404 `Property not found` · 409 the property has bookings or reviews (history is kept).

### `GET /api/landlord/requests`

Rental requests for your properties, newest first, with property and tenant contact. Optional `?status=`. Not paginated.

### `PATCH /api/landlord/requests/:id`

Approve or reject a **PENDING** request.

| Field    | Type | Rules                    |
| -------- | ---- | ------------------------ |
| `status` | enum | `APPROVED` \| `REJECTED` |

**200** → updated booking.
**Errors:** 400 validation · 400 `Only pending rental requests can be approved or rejected` · 404 not found or not your property · 409 (approve only) property unavailable or another rental for it is already approved/active.

### `PATCH /api/landlord/requests/:id/complete`

Complete an **ACTIVE**, paid rental at any time (e.g. early move-out). Sets the booking to `COMPLETED` and the property back to `AVAILABLE` in one transaction.
**Errors:** 400 `Only active rentals can be completed` · 400 `Rental must be paid before it can be completed` · 404 not found or not your property · 409 already completed (concurrent request).

### `GET /api/landlord/reviews`

Reviews left on your properties, with property title and reviewer name.

| Query param                  | Rules                                 |
| ---------------------------- | ------------------------------------- |
| `propertyId`                 | optional uuid                         |
| `page`, `limit`, `sortOrder` | see [Pagination](#pagination-sorting) |
| `sortBy`                     | `createdAt` \| `rating`               |

---

## Admin

All routes below require an **ADMIN** token.

### `GET /api/admin/users`

| Query param                  | Rules                                        |
| ---------------------------- | -------------------------------------------- |
| `searchTerm`                 | matches `name` or `email` (case-insensitive) |
| `role`                       | `ADMIN` \| `LANDLORD` \| `TENANT`            |
| `userStatus`                 | `ACTIVE` \| `BLOCKED`                        |
| `page`, `limit`, `sortOrder` | see [Pagination](#pagination-sorting)        |
| `sortBy`                     | `createdAt` \| `name` \| `email`             |

**200** → users without passwords, with `meta`.

### `PATCH /api/admin/users/:id`

Ban or unban a user.

| Field        | Type | Rules                 |
| ------------ | ---- | --------------------- |
| `userStatus` | enum | `ACTIVE` \| `BLOCKED` |

**200** → `{ id, name, email, role, userStatus, updatedAt }`.
**Errors:** 400 validation · 403 `You cannot block yourself` · 403 `Admin accounts cannot be blocked` · 404 `User not found`.

### `GET /api/admin/properties`

All properties, with the same filters, sorting and pagination as [`GET /api/properties`](#get-apiproperties).

### `GET /api/admin/rentals`

All rental requests with property (and owner), tenant and payment.

| Query param                  | Rules                                      |
| ---------------------------- | ------------------------------------------ |
| `status`                     | booking status (optional)                  |
| `page`, `limit`, `sortOrder` | see [Pagination](#pagination-sorting)      |
| `sortBy`                     | `createdAt` \| `moveInDate` \| `totalRent` |

### `POST /api/categories`

| Field  | Type   | Rules                   |
| ------ | ------ | ----------------------- |
| `name` | string | required, min 1, unique |

**201**. **Errors:** 400 validation · 409 `Category already exists`.

### `PUT /api/categories/:id`

Body as above. **200**. **Errors:** 400 validation · 404 `Category not found` · 409 `Category already exists`.

### `DELETE /api/categories/:id`

**200** with `data: null`. **Errors:** 400 `Cannot delete a category that is assigned to properties` · 404 `Category not found`.

---

## Stripe webhook

### `POST /api/payments/webhook`

Called by Stripe, not by clients. The raw body is verified against the `Stripe-Signature` header with `STRIPE_WEBHOOK_SECRET`.

| Event                                      | Effect                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| `checkout.session.completed` (paid)        | Payment `PAID`, booking `ACTIVE`, property `RENTED` (one idempotent transaction) |
| `checkout.session.async_payment_succeeded` | Same as above                                                                    |
| `checkout.session.expired`                 | Pending payment → `FAILED` (tenant can retry)                                    |
| `checkout.session.async_payment_failed`    | Pending payment → `FAILED`                                                       |

**200** `{ "received": true }` (also for events or sessions it doesn't recognise, so Stripe doesn't retry them).
**Errors:** 400 `Invalid Stripe webhook signature`.
