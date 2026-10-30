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
- [Tenant favorites](#tenant-favorites)
- [Landlord: properties, requests, reviews](#landlord)
- [Admin: users, properties, rentals, categories](#admin)
- [Homepage settings](#homepage-settings)
- [Notifications: any signed-in role](#notifications)
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

Landlord **write** routes (create/update/delete a property, approve/reject a request, complete a rental) also run `requireApprovedLandlord` after `auth("LANDLORD")`:

| Landlord status | Status | Message                                                    |
| --------------- | ------ | ---------------------------------------------------------- |
| `PENDING`       | 403    | `Your landlord account is waiting for admin approval`      |
| `REJECTED`      | 403    | `Your landlord application was rejected. Contact support.` |

Landlord read routes stay open, so a pending landlord can still use their dashboard.

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

**201** → the new user without `password`. A `LANDLORD` starts with `landlordStatus: "PENDING"` until an admin approves them (see [`PATCH /api/admin/users/:id/landlord-status`](#patch-apiadminusersidlandlord-status)); a `TENANT` gets `landlordStatus: null`.
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
      "landlordStatus": null,
      "createdAt": "2026-10-21T14:16:53.513Z",
      "updatedAt": "2026-10-21T14:42:25.046Z"
    }
  }
}
```

**Errors:** 400 validation · 401 `Invalid email or password` (same for unknown email and wrong password) · 403 `Your account has been blocked. Please contact support.` (only after a correct password).

### `GET /api/auth/me`

Auth: any role. **200** → the current user's profile from the database (no `password`), including `landlordStatus` (`PENDING` \| `APPROVED` \| `REJECTED` for landlords, `null` otherwise). Re-fetch it to pick up an approval without logging in again.

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
| `division`                   | string                                                         | US state, full name or 2-letter code (`MI` → `Michigan`), exact     |
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

### `GET /api/properties/map`

No auth. Every property that has coordinates (newest first, at most 1000), trimmed for map pins. Not paginated. Sent with `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600`.

**200**

```json
{
  "success": true,
  "message": "Map properties retrieved successfully",
  "data": [
    {
      "id": "4e2569e3-2d90-497b-9eed-03f5fd2cfbdb",
      "title": "Sunny 2-Bedroom Apartment in Midtown Manhattan",
      "latitude": 40.763,
      "longitude": -73.988,
      "rentAmount": "3200",
      "city": "New York",
      "division": "New York",
      "availabilityStatus": "AVAILABLE",
      "image": "https://images.unsplash.com/…"
    }
  ]
}
```

### `GET /api/properties/states`

No auth. Every state that has properties, busiest first (used by the admin state picker). Cached like `/map`.

**200** → `data`: `[{ "state": "New York", "propertyCount": 2, "availableCount": 1 }, …]`

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

Review a property once your rental is **ACTIVE** or **COMPLETED**: one review per rental.

| Field        | Type   | Rules             |
| ------------ | ------ | ----------------- |
| `propertyId` | uuid   | required          |
| `rating`     | number | integer 1–5       |
| `comment`    | string | 1–1000 characters |

**201** → review (linked to the rental being reviewed).
**Errors:** 400 validation · 403 `You can only review a property after your rental is active` · 404 `Property not found` · 409 `You have already reviewed this rental`.

---

## Tenant favorites

All routes below require a **TENANT** token. A favorite is removed automatically if its property is deleted.

### `GET /api/favorites`

Your saved homes, newest first, with the property summary (`image` is the first photo, or `null`).

| Query param                  | Rules                                 |
| ---------------------------- | ------------------------------------- |
| `page`, `limit`, `sortOrder` | see [Pagination](#pagination-sorting) |
| `sortBy`                     | `createdAt`                           |

**200**

```json
{
  "success": true,
  "message": "Favorites retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
  "data": [
    {
      "id": "9b2e…",
      "userId": "2e74…",
      "propertyId": "4e25…",
      "createdAt": "2026-10-30T12:50:02.000Z",
      "property": {
        "id": "4e25…",
        "title": "Sunny 2-Bedroom Apartment in Midtown Manhattan",
        "city": "New York",
        "division": "New York",
        "rentAmount": "3200",
        "availabilityStatus": "AVAILABLE",
        "propertyType": "APARTMENT",
        "bedrooms": 2,
        "bathrooms": 2,
        "area": 950,
        "image": "https://images.unsplash.com/…"
      }
    }
  ]
}
```

### `GET /api/favorites/ids`

**200** → `data` is an array of the property ids you saved (for filling in heart icons), e.g. `["4e25…", "a1c9…"]`.

### `POST /api/favorites`

| Field        | Type | Rules      |
| ------------ | ---- | ---------- |
| `propertyId` | uuid | must exist |

Idempotent. **201** `Saved to favorites` → the new favorite · **200** `Already in favorites` → the existing one.
**Errors:** 400 validation · 404 `Property not found`.

### `DELETE /api/favorites/:propertyId`

Idempotent. **200** → `{ "removed": true }` (`Removed from favorites`) or `{ "removed": false }` (`Not in favorites`).
**Errors:** 400 invalid id.

---

## Landlord

All routes below require a **LANDLORD** token. Landlords can only see and change their own properties and the requests for them.

The write routes (`POST`/`PUT`/`DELETE /api/landlord/properties`, `PATCH /api/landlord/requests/:id` and `/complete`) also require an **approved** landlord: a `PENDING` or `REJECTED` landlord gets **403** (see [Authentication](#authentication)). The `GET` routes work for every landlord.

### `GET /api/landlord/properties`

Your properties, with the same filters, sorting and pagination as [`GET /api/properties`](#get-apiproperties).

### `POST /api/landlord/properties`

| Field                                     | Type     | Rules                                                                                                           |
| ----------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `title`, `description`, `address`, `city` | string   | required, min 1                                                                                                 |
| `division`                                | string   | US state: full name or 2-letter code, any case; saved as the full name (`ny` → `New York`); anything else → 400 |
| `rentAmount`                              | number   | > 0 (monthly)                                                                                                   |
| `bedrooms`, `bathrooms`                   | number   | integer ≥ 0                                                                                                     |
| `area`                                    | number   | integer > 0                                                                                                     |
| `propertyType`                            | enum     | `APARTMENT` \| `HOUSE` \| `STUDIO` \| `VILLA`                                                                   |
| `categoryId`                              | uuid     | must exist                                                                                                      |
| `amenities`                               | string[] | at least 1, non-empty strings                                                                                   |
| `images`                                  | string[] | at least 1, valid URLs                                                                                          |
| `latitude`, `longitude`                   | number   | optional, together; −90..90 and −180..180                                                                       |

Numbers may be sent as numbers or numeric strings. **201** → created property (`availabilityStatus: "AVAILABLE"`).

**Coordinates:** if `latitude`/`longitude` aren't sent, the server looks the address up with OpenStreetMap Nominatim (`address, city, state`, US only, 5 s timeout). If that fails, the property is saved with `latitude`/`longitude` `null`; geocoding never fails the request.
**Errors:** 400 validation · 404 `Category not found`.

### `PUT /api/landlord/properties/:id`

Update any subset of the create fields, plus `availabilityStatus` (`AVAILABLE` \| `RENTED`) to set availability. Empty body → 400.
Sending `latitude` + `longitude` sets the pin. Otherwise, if `address`, `city` or `division` actually changed, the new address is geocoded (coordinates become `null` if that fails, since the old pin would be wrong).
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
| `landlordStatus`             | `PENDING` \| `APPROVED` \| `REJECTED`        |
| `page`, `limit`, `sortOrder` | see [Pagination](#pagination-sorting)        |
| `sortBy`                     | `createdAt` \| `name` \| `email`             |

**200** → users without passwords (including `landlordStatus`), with `meta`. Pending landlords: `?role=LANDLORD&landlordStatus=PENDING`.

### `PATCH /api/admin/users/:id`

Ban or unban a user.

| Field        | Type | Rules                 |
| ------------ | ---- | --------------------- |
| `userStatus` | enum | `ACTIVE` \| `BLOCKED` |

**200** → `{ id, name, email, role, userStatus, updatedAt }`.
**Errors:** 400 validation · 403 `You cannot block yourself` · 403 `Admin accounts cannot be blocked` · 404 `User not found`.

### `PATCH /api/admin/users/:id/landlord-status`

Approve or reject a landlord. Approval takes effect immediately (the check reads the database on every write request, not the token).

| Field            | Type | Rules                    |
| ---------------- | ---- | ------------------------ |
| `landlordStatus` | enum | `APPROVED` \| `REJECTED` |

**200** → `{ id, name, email, role, userStatus, landlordStatus, updatedAt }`.
**Errors:** 400 validation · 404 `Landlord not found` (no such user, or the user isn't a landlord).

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

## Homepage settings

The admin chooses what the homepage shows. The config is stored under the key `homepage`:

```jsonc
{
  "hero": { "propertyIds": ["uuid", "uuid", "uuid"] }, // 0–3, in order
  "featured": {
    "enabled": true,
    "title": "Homes worth the move",
    "propertyIds": ["uuid"],
  }, // max 12; title optional
  "states": {
    "enabled": true,
    "items": [{ "state": "New York", "imageUrl": "https://…" }],
  }, // max 8
  "propertyTypes": {
    "enabled": true,
    "items": [{ "type": "VILLA", "imageUrl": "https://…" }],
  }, // imageUrl optional
  "latest": { "enabled": true, "count": 8 }, // 4–16
  "sectionOrder": [
    "featured",
    "states",
    "propertyTypes",
    "latest",
    "statement",
    "stats",
    "howItWorks",
    "whyUs",
    "reviews",
    "faq",
  ],
}
```

Rules: no duplicate property ids, states, types or sections; `state` accepts a name or 2-letter code and is saved as the full name; image URLs must be valid URLs.

**Until an admin saves a config**, defaults are used: the newest 3 properties for the hero, the newest 8 featured, the busiest states (up to 8, each with a photo from one of its listings), all four property types and the latest 8. A saved config that no longer validates also falls back to the defaults.

### `GET /api/site-settings/homepage`

No auth. The config **resolved** for rendering, with `isDefault` and `updatedAt`. Cached briefly (`s-maxage=60`).

- `hero.properties`, `featured.properties`: full property objects (same shape as `GET /api/properties`) in the admin's order; ids that no longer exist are dropped.
- `states.items[]`: `{ state, imageUrl, propertyCount, startingPrice }`, live from **available** properties whose `division` is that state (`startingPrice` is the lowest rent, a string, or `null`).
- `propertyTypes.items[]`: `{ type, imageUrl, propertyCount }`; `imageUrl` falls back to a photo of a listing of that type.
- `latest.properties`: the newest `count` properties.

```json
{
  "success": true,
  "message": "Homepage settings retrieved successfully",
  "data": {
    "hero": { "properties": [{ "id": "4e25…", "title": "…" }] },
    "featured": { "enabled": true, "title": null, "properties": [] },
    "states": {
      "enabled": true,
      "items": [
        {
          "state": "New York",
          "imageUrl": "https://…",
          "propertyCount": 1,
          "startingPrice": "3200"
        }
      ]
    },
    "propertyTypes": {
      "enabled": true,
      "items": [
        { "type": "APARTMENT", "imageUrl": "https://…", "propertyCount": 2 }
      ]
    },
    "latest": { "enabled": true, "count": 8, "properties": [] },
    "sectionOrder": [
      "statement",
      "stats",
      "featured",
      "states",
      "propertyTypes",
      "latest",
      "howItWorks",
      "whyUs",
      "reviews",
      "faq"
    ],
    "isDefault": true,
    "updatedAt": null
  }
}
```

### `GET /api/admin/site-settings/homepage`

Auth: **ADMIN**. The raw config for the editor (ids, not properties): `{ config, isDefault, updatedAt }`. Before the first save, `config` holds the defaults.

### `PUT /api/admin/site-settings/homepage`

Auth: **ADMIN**. Body: the full config above. Validates and saves it. **200** → `{ config, isDefault: false, updatedAt }`.
**Errors:** 400 validation (e.g. `hero.propertyIds: Pick at most 3 properties`, `states.items.0.state: State must be a US state (full name or 2-letter code)`).

---

## Notifications

All routes below need a token for **any role** (`TENANT`, `LANDLORD` or `ADMIN`). Users only ever see their own notifications.

Notifications are created automatically **after** the action that triggers them succeeds; a failed notification is logged and never fails that action.

| Trigger                                        | Who is notified         | `type`                                    | `link`                                                        |
| ---------------------------------------------- | ----------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| A landlord registers                           | every active admin      | `LANDLORD_REGISTERED`                     | `/dashboard/admin/users?landlordStatus=PENDING`               |
| Admin approves / rejects a landlord            | that landlord           | `LANDLORD_APPROVED` / `LANDLORD_REJECTED` | `/dashboard/landlord` / `/contact`                            |
| Tenant creates a rental request                | the property's landlord | `RENTAL_REQUESTED`                        | `/dashboard/landlord/requests`                                |
| Landlord approves / rejects a request          | the tenant              | `RENTAL_APPROVED` / `RENTAL_REJECTED`     | the pay page / `/dashboard/tenant/requests`                   |
| Payment becomes `PAID` (webhook or `/confirm`) | tenant and landlord     | `PAYMENT_SUCCESS` / `PAYMENT_RECEIVED`    | `/dashboard/tenant/payments` / `/dashboard/landlord/requests` |
| Landlord completes a rental                    | the tenant              | `RENTAL_COMPLETED`                        | `/dashboard/tenant/requests`                                  |
| Tenant posts a review                          | the property's landlord | `REVIEW_RECEIVED`                         | `/dashboard/landlord/reviews`                                 |
| Admin bans / unbans a user (status changed)    | that user               | `ACCOUNT_BLOCKED` / `ACCOUNT_UNBLOCKED`   | none                                                          |

A payment is notified only by the call that actually marks it paid, so the webhook and `POST /api/payments/confirm` never notify twice.

### `GET /api/notifications`

Your notifications, newest first.

| Query param                  | Rules                                 |
| ---------------------------- | ------------------------------------- |
| `unread`                     | `true` lists only unread ones         |
| `page`, `limit`, `sortOrder` | see [Pagination](#pagination-sorting) |
| `sortBy`                     | `createdAt`                           |

**200** → `data` is a list of `{ id, userId, type, title, message, link, isRead, createdAt }`; `meta` also has `unreadCount` (all your unread notifications, whatever the filter):

```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPage": 1,
    "unreadCount": 2
  },
  "data": [
    {
      "id": "6f1c…",
      "userId": "2e74…",
      "type": "RENTAL_APPROVED",
      "title": "Request approved",
      "message": "Your request for Furnished Studio near Lady Bird Lake was approved. Pay to secure your rental.",
      "link": "/dashboard/tenant/requests/bbf3…/pay",
      "isRead": false,
      "createdAt": "2026-10-30T12:40:11.000Z"
    }
  ]
}
```

### `PATCH /api/notifications/:id/read`

Marks one of your notifications as read. **200** → the updated notification.
**Errors:** 400 invalid id · 404 `Notification not found` (missing, or not yours).

### `PATCH /api/notifications/read-all`

Marks all your unread notifications as read. **200** → `{ "updated": <count> }`.

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
