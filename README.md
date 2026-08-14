# FixMate Backend — Part 6: Dashboards & Admin

Builds on **Part 5 (Reviews)** with everything the frontend's admin,
provider, and customer dashboards (`src/app/dashboard/**`) need beyond
plain CRUD — moderation, self-service profiles, and real analytics
computed from the database instead of the frontend's static mock arrays
(`appUsers`, `platformMonthlyStats`, `monthlyEarnings`, etc. in
`src/lib/data.ts`).

## What's included in Part 6

- **`User.status`** (`ACTIVE` / `SUSPENDED`) — new column. A suspended
  account is rejected at `POST /auth/login` with a 403. Admin accounts can
  never be suspended (checked server-side, not just hidden in the UI).

- **Categories are now writable** — `POST /categories`, `PATCH /categories/:id`,
  `DELETE /categories/:id` (admin-only). Renaming a category re-slugs it and
  repoints every `Service` row still using the old slug in the same
  transaction; deleting one is blocked while `Category.count > 0` so the
  catalog can't silently orphan services.

- **`GET/PATCH /users/me`, `PATCH /users/me/password`** — any authenticated
  role can edit their own name/phone/address and change their password
  (current-password verified before the change) — backs the Customer and
  Provider dashboards' Profile/Settings forms.

- **`GET/PATCH /provider/profile`, `GET /provider/earnings`** — a provider's
  own public-profile fields (business name, bio, location, service areas,
  response time), plus a real earnings breakdown (last 6 months, per-service
  totals, recent payouts) computed from the caller's own completed bookings.

- **`/admin/*`** (all admin-only, mounted at `/api/v1/admin`):
  - `GET /admin/users`, `PATCH /admin/users/:id/status` — search/filter +
    suspend/reactivate
  - `GET /admin/providers`, `PATCH /admin/providers/:id/verify` — search/filter
    + verified-badge toggle
  - `GET /admin/services`, `PATCH /admin/services/:id`, `DELETE /admin/services/:id` —
    platform-wide (not ownership-scoped) listing, availability override, and
    moderation takedown
  - `GET /admin/bookings` — platform-wide listing with a status filter
  - `GET /admin/reviews`, `DELETE /admin/reviews/:id` — platform-wide listing
    and moderation delete. Deleting a review runs the *exact inverse* of the
    rating-blend formula from Part 5 to un-blend it out of the service's and
    provider's aggregates, and flips the booking's `reviewed` flag back off.
  - `GET /admin/analytics` — totals (users/providers/services/bookings/revenue/
    avg rating), a 6-month trend (bookings, revenue, new users), and a booking
    status breakdown — all computed from real rows, replacing the frontend's
    static `platformMonthlyStats`.

Admin dashboard "Settings" (commission rate, maintenance mode, etc.) stays
frontend-only — there's no real platform-config model behind it in the mock
UI, so nothing to wire up yet.

---

# FixMate Backend — Part 5: Reviews

Builds on **Part 4 (Bookings)** with the Reviews module: a customer
reviews a completed booking, the review is permanently tied to that
booking, and the service's and provider's aggregate rating update
immediately — wired to plug straight into the existing frontend
(`fixmate-frontend-phase10-rhf-zod`)'s `reviewSchema` in
`src/lib/validation.ts` and the `Review`/`blendRating` contracts in
`src/lib/data.ts` / `src/lib/reviews-store.tsx`.

## What's included in Part 5

- **`POST /api/v1/reviews`** — customer reviews a `bookingId` they own;
  the server resolves `serviceId`/`providerId` from the booking itself
  rather than trusting them from the client (only `rating` and `comment`
  are customer input, matching `ReviewModal`'s `onSubmit`). Rejects
  bookings that aren't `Completed`. Idempotent: resubmitting for a
  booking that already has a review just returns that review instead of
  erroring — same guard as the frontend's `addReview`.
- **`GET /api/v1/reviews?serviceId=...`** — a service's reviews, newest
  first — mirrors `getReviewsForService`
- **`GET /api/v1/reviews?providerId=...`** — every review across a
  provider's services — mirrors `getReviewsForProvider`
  (exactly one of `serviceId`/`providerId` is required per request)

Creating a review, inside one transaction:
1. Inserts the `Review` row (`bookingId` is unique — one review per
   booking, enforced at the database level too)
2. Flips the booking's `reviewed` to `true`
3. Recalculates `Service.rating`/`reviewCount` by blending the new rating
   into the existing aggregate — the exact `blendRating` formula from the
   frontend's `src/lib/data.ts` (`(oldRating × oldCount + newRating) /
   (oldCount + 1)`, rounded to 1 decimal), so one new review doesn't swing
   a long-running average
4. Does the same blend for the service's `ProviderProfile.rating`/`reviewCount`

`POST /reviews` requires `Authorization: Bearer <accessToken>` for a
`CUSTOMER`-role account and is scoped to bookings that customer owns —
`GET /reviews` is public, same as the service/provider pages that render it.

### Seed changes

- `providerSeeds` entries (and their flagship `Service` rows) now carry
  the same `rating`/`reviewCount` the frontend's static mock data uses
  (e.g. CoolFix at 4.7★/164) instead of the schema's `0`/`0` defaults —
  a gap left over from Part 1, where nothing set an initial aggregate.
  Without this, every seeded service would start unrated and the first
  review would simply *become* the rating rather than blend into one,
  which made Part 5's actual behavior hard to see against seed data.
- One additional demo booking (`demo-bk-completed-reviewed`, against
  CoolFix's AC service) plus its `Review` row, so `GET /reviews` returns
  something out of the box. That single row is deliberately **not**
  blended into the aggregates above — the seeded `rating`/`reviewCount`
  already stands in for that history, same reasoning as the frontend
  comment on `blendRating`.

## What's included in Part 4

Builds on **Part 3 (Services)** with the Bookings module: a customer
requests a booking against a service, the provider accepts/rejects/
progresses it through to completion, and the customer can back out early
— wired to plug straight into the existing frontend
(`fixmate-frontend-phase10-rhf-zod`)'s `bookingSchema` in
`src/lib/validation.ts` and the `Booking`/`NewBookingInput` contracts in
`src/lib/data.ts` / `src/lib/bookings-store.tsx`.

## What's included in Part 4

- **`POST /api/v1/bookings`** — customer creates a booking against a
  `serviceId`; the server resolves the service, provider, and price
  server-side rather than trusting them from the client (only
  `date`/`time`/`address`/`notes` are customer input, matching
  `BookingPanel`'s `onSubmit`). Rejects unavailable services. Starts at
  `Pending` with a one-entry history log.
- **`GET /api/v1/bookings/mine`** — the logged-in customer's own bookings,
  newest first
- **`GET /api/v1/bookings/mine/:id`** — one of the caller's own bookings
- **`POST /api/v1/bookings/mine/:id/cancel`** — customer cancels; only
  while `canCustomerCancel` allows it (`Pending`/`Accepted`), same rule
  as the frontend's `cancelBooking`
- **`GET /api/v1/bookings/provider`** — bookings made against the
  logged-in provider's own services, newest first
- **`GET /api/v1/bookings/provider/:id`** — one such booking
- **`PATCH /api/v1/bookings/provider/:id/status`** — provider moves a
  booking forward (`Accepted`, `Rejected`, `In Progress`, `Completed`);
  the transition is checked against `NEXT_STATUSES`
  (`src/utils/bookingStatus.ts`, mirroring the frontend's map of the
  same name) and rejected with 400 if illegal — this is the real
  enforcement the frontend's client-side guard was always meant to be
  backed by

Every route requires `Authorization: Bearer <accessToken>`. Customer
routes are scoped to `req.user.id` as the booking's owner; provider
routes are scoped to the caller's own `ProviderProfile` via a join
through `Service.providerId` — a provider can never read or transition
another provider's booking, and a customer can never read or cancel
someone else's.

Every status change (including creation and cancellation) appends to the
booking's `history` — same `{ status, at, note? }` shape the frontend's
`BookingStatusTracker` already renders.

### Schema changes

- `BookingStatus` gained `REJECTED` and renamed `CONFIRMED` → `ACCEPTED`,
  so the six-value enum matches the frontend's `BookingStatus` union
  exactly (`Pending | Accepted | Rejected | In Progress | Completed |
  Cancelled`) instead of Part 1's five-value approximation.
- `Booking` gained `amount` (a `Decimal` snapshot of `Service.price` at
  booking time — so a later price change on the service doesn't alter
  what an existing booking owes), `reviewed` (`Boolean`, defaults
  `false`; Part 5 will flip it when a `Review` is created), and
  `history` (`Json`, append-only audit trail — kept as JSON rather than
  a child table since it's always read as a whole and never queried by
  its own fields).

Re-run `npm run prisma:migrate` on top of an existing Part 1–3 database.
`npm run prisma:seed` now also creates three demo bookings (`Pending`,
`Completed`, `Cancelled`) for `customer@fixmate.dev` against the seeded
CoolFix/Karim/ShineHome services, so the new endpoints return real data
immediately.

## What's included in Part 3

Builds on **Part 2 (Auth)** with the Services module: public
search/filter/sort/paginate matching the frontend's `queryServices`
contract exactly, plus a provider-only CRUD surface for the "My services"
dashboard — wired to plug straight into the existing frontend
(`fixmate-frontend-phase10-rhf-zod`)'s `serviceSchema` in
`src/lib/validation.ts` and `ServiceQuery`/`ServiceQueryResult` in
`src/lib/api.ts`.

## What's included in Part 3

- **`GET /api/v1/services`** — search/filter/sort/paginate, same query
  params and response shape (`{ items, total, page, pageSize, totalPages }`)
  as `queryServices`/`fetchServices` in the frontend's `src/lib/api.ts`:
  `q`, `category`, `location`, `maxPrice`, `minRating`,
  `sort` (`recommended | price-asc | price-desc | rating | newest`),
  `page`, `pageSize`. No auth required.
- **`GET /api/v1/services/:slug`** — service detail (public)
- **`GET /api/v1/services/:slug/related`** — other services in the same
  category, for the detail page's "related services" panel (public)
- **`GET /api/v1/services/mine`** — the logged-in provider's own services,
  for the "My services" dashboard table
- **`GET /api/v1/services/mine/:id`** — one of the caller's own services
  by id, for prefilling the edit form
- **`POST /api/v1/services`** — create a service under the caller's
  `ProviderProfile`; auto-generates a unique slug from the title
- **`PATCH /api/v1/services/mine/:id`** — partial update, ownership-checked
- **`DELETE /api/v1/services/mine/:id`** — ownership-checked delete
- **`GET /api/v1/categories`** — the category list (with the denormalized
  `count` the Explore filter shows), kept in sync as services are
  created/moved/deleted

All five mutating routes require `Authorization: Bearer <accessToken>`
for a `PROVIDER`-role account with a `ProviderProfile` (see Part 2) and
are scoped to that profile's own services — one provider can never read,
edit, or delete another's listing, even by guessing an id.

### Schema change

`ProviderProfile` gained a `location` column. The Part 1 schema didn't
have one — only `Service.location` existed — but the frontend's
`Provider.location` (shown on `/providers/[id]` and the service detail
page, independent of any one service's location) needs somewhere to
live. Defaults to `""` so it's additive on top of an existing Part 1/2
database; re-run `npm run prisma:migrate`.

## What's included in Part 2

- **`POST /api/v1/auth/register`** — creates a `User` (+ `ProviderProfile`
  if `role: "provider"`, inside a transaction so one never exists without
  the other), returns the user + an access token, sets the refresh
  token as an httpOnly cookie
- **`POST /api/v1/auth/login`** — same response shape; generic
  "Invalid email or password" on either a missing user or a bad
  password, so the endpoint can't be used to enumerate accounts
- **`POST /api/v1/auth/google`** — verifies a Google ID token
  (`google-auth-library`) and finds-or-creates a `CUSTOMER` account;
  returns 400 until `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set,
  every other route works without them
- **`POST /api/v1/auth/refresh`** — reads the refresh cookie, verifies
  it against the hashed value stored in `RefreshToken`, **rotates** it
  (old one is revoked, a new pair is issued) — a replayed/stolen refresh
  token stops working the moment the real client refreshes next
- **`POST /api/v1/auth/logout`** — revokes the current refresh token,
  clears the cookie
- **`GET /api/v1/auth/me`** — returns the current user; requires
  `Authorization: Bearer <accessToken>`
- **`authenticate` / `authorize(...roles)` middleware** — for gating
  future routes (Parts 3–6) by login state and by `Role`
- **Rate limiting** on `/register`, `/login`, `/google` (20 requests /
  15 min) against brute-force and credential stuffing

## How auth is split across the wire

| Token | Where it lives | Lifetime | Purpose |
|---|---|---|---|
| Access token | JSON response body → kept in memory/state on the client | short (`JWT_ACCESS_EXPIRES_IN`, default 15m) | sent as `Authorization: Bearer <token>` on every authenticated request |
| Refresh token | httpOnly cookie, scoped to `/api/v1/auth` only | long (`JWT_REFRESH_EXPIRES_IN`, default 7d) | never touched by JS; only sent back to `/auth/refresh` and `/auth/logout` |

The refresh token itself is a JWT, but the server never trusts the JWT
alone — its **hash** is checked against `RefreshToken.tokenHash` in
Postgres, so a single logout/rotation instantly invalidates it even if
the token's signature and expiry are still technically valid.

## Role handling

The frontend's `dashboardByRole` (in `src/app/login/page.tsx`) speaks
lowercase roles: `"customer" | "provider" | "admin"`. Prisma's `Role`
enum is uppercase. `src/utils/role.ts` is the single place that
converts between them — every request/response body uses the lowercase
form; the database and JWT payload use the Prisma enum.

## New environment variables

```bash
JWT_ACCESS_SECRET=<random string, 16+ chars>
JWT_REFRESH_SECRET=<random string, 16+ chars>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Optional — /auth/google returns 400 until both are set
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Setup

```bash
cp .env.example .env
# edit DATABASE_URL, and set real values for JWT_ACCESS_SECRET / JWT_REFRESH_SECRET

npm install
npm run prisma:migrate   # (re-run if you're layering this onto an existing Part 1 DB, it's additive)
npm run prisma:seed      # loads demo data
npm run dev               # http://localhost:5000/api/v1/health
```

Demo login: any seeded email (`admin@fixmate.dev`, `customer@fixmate.dev`,
`karim@fixmate.dev`, ...) with password `Password123`, against
`POST /api/v1/auth/login`.

> **Note on this sandbox:** `prisma generate` couldn't download its
> query-engine binary here (`binaries.prisma.sh` isn't reachable from
> this environment), so the Prisma-typed code in this zip hasn't been
> compiled end-to-end in-sandbox. Everything else was checked in
> isolation. Run `npm install && npx prisma generate` locally — that's
> a normal first step for this project either way — and `npm run dev`
> should come up clean.

## Structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── config/            # env, logger, prisma client
│   ├── controllers/        # auth, service, category, booking, review — thin HTTP layer
│   ├── services/            # auth, service, booking, review — business logic
│   ├── validations/         # auth, service, booking, review — Zod schemas matching the frontend
│   ├── middlewares/         # error handler, request logger, validate (+validateQuery), auth, rate limiter
│   ├── routes/               # route aggregator: /health, /auth, /services, /categories, /bookings, /reviews
│   ├── types/                 # Express Request.user augmentation
│   ├── utils/                 # ApiError, ApiResponse, asyncHandler, jwt, cookies, password,
│   │                          # role, sanitize, slugify, tokenHash, bookingStatus
│   ├── app.ts                  # express app assembly
│   └── server.ts               # boot + graceful shutdown
├── .env.example
└── package.json
```

## Coming in later parts

| Part | Scope |
|------|-------|
| 6+ | Dashboards (customer/provider/admin), analytics, deployment |
