# Smart Combo — Backend Architecture Documentation

**Last updated:** May 2026
**Project:** Smart Combo NG e-commerce store
**Owner:** Abdulrahman / LakChe-LTD

This document is the single source of truth for how the Smart Combo backend is built and why. Read this first whenever you (or another developer) come back to the project after a break.

---

## 1. The big picture

Smart Combo is a Nigerian e-commerce store that sells combo packs of premium gadgets. The backend exists to:

1. Store all the data that's currently hardcoded in the frontend (combos, settings, hero slides, FAQs, testimonials)
2. Accept and process customer orders
3. Handle online payments via Paystack and Flutterwave
4. Send order notifications to customers (email + WhatsApp)
5. Provide an admin dashboard for the owner to manage everything from one place

There is no customer login — customers buy as guests and track orders via order number + phone number. Only the admin (owner) logs in.

---

## 2. Tech stack

| Component | Technology | Why this choice |
|-----------|-----------|-----------------|
| Runtime | Node.js (already in project) | Standard, fast, good for I/O |
| Web framework | Express.js (already in project) | Already wired into Vite via plugin |
| Language | TypeScript | Type safety across frontend + backend |
| Database | MongoDB (Atlas cloud) | Schema-less fits e-commerce, free tier available |
| ORM | Mongoose | Standard for MongoDB, handles validation |
| Auth | JWT (JSON Web Tokens) | Stateless, simple for single-admin use |
| Password hashing | bcrypt | Industry standard |
| File uploads | Multer + Cloudinary | Multer parses, Cloudinary stores |
| Payment (primary) | Paystack | Best for Nigeria |
| Payment (backup) | Flutterwave | Some customers prefer it |
| Email | Resend | Clean API, good free tier |
| Validation | Zod (already installed) | Reuse types between client + server |
| Environment | dotenv (already installed) | Standard env var management |

---

## 3. Folder structure

The backend lives in `/server`. After the build, the structure looks like this:

```
server/
├── index.ts                  # Express app entry point (already exists)
├── db.ts                     # MongoDB connection setup
├── config.ts                 # Centralized env var access
│
├── models/                   # Mongoose schemas (one file per resource)
│   ├── Combo.ts
│   ├── Order.ts
│   ├── HeroSlide.ts
│   ├── SiteSettings.ts
│   ├── Testimonial.ts
│   ├── FAQ.ts
│   ├── AdminUser.ts
│   └── index.ts              # Re-exports all models
│
├── routes/                   # API endpoint handlers (one file per resource)
│   ├── combos.ts             # /api/combos/*
│   ├── orders.ts             # /api/orders/*
│   ├── hero-slides.ts        # /api/hero-slides/*
│   ├── settings.ts           # /api/settings/*
│   ├── testimonials.ts       # /api/testimonials/*
│   ├── faqs.ts               # /api/faqs/*
│   ├── auth.ts               # /api/auth/* (admin login)
│   ├── upload.ts             # /api/upload/* (Cloudinary uploads)
│   ├── payments.ts           # /api/payments/* (Paystack/Flutterwave init + webhooks)
│   └── admin.ts              # Admin-only aggregate endpoints (dashboard stats)
│
├── middleware/
│   ├── requireAuth.ts        # Verifies JWT, blocks if invalid
│   ├── errorHandler.ts       # Catches all errors, returns clean JSON
│   └── rateLimiter.ts        # Prevents API abuse
│
├── services/                 # Business logic — keeps routes thin
│   ├── orderService.ts       # createOrder, updateStatus, generateOrderNumber
│   ├── paymentService.ts     # Paystack + Flutterwave client wrappers
│   ├── emailService.ts       # Order confirmations, admin alerts via Resend
│   ├── whatsappService.ts    # Optional — WhatsApp notifications
│   └── cloudinaryService.ts  # Upload, delete, URL helpers
│
├── utils/
│   ├── generateOrderNumber.ts  # SC-2026-001234 format
│   ├── slugify.ts              # turns "Smart Combo Pack" into "smart-combo-pack"
│   └── asyncHandler.ts         # Wraps async routes for proper error catching
│
├── types/                    # Backend-specific types (request/response shapes)
│   └── express.d.ts          # Augments Express Request to include `req.user`
│
└── seed/                     # One-time scripts to populate the database
    ├── seedCombos.ts         # Inserts the current Smart Combo Pack
    ├── seedSettings.ts       # Inserts default site settings
    └── seedAdmin.ts          # Creates the first admin user
```

### Why this structure?

**Separation of concerns:**
- `routes/` only handles HTTP — parse request, call service, return response
- `services/` holds the business logic — easy to test, easy to reuse
- `models/` is just data shape definitions
- `middleware/` is cross-cutting concerns

**One file per resource:** When you need to fix orders, you go to `models/Order.ts`, `routes/orders.ts`, `services/orderService.ts`. No hunting.

**Mirrors the frontend:** `client/api/combos.ts` calls `server/routes/combos.ts`. `client/types/combo.ts` matches `server/models/Combo.ts`. Easy to navigate.

---

## 4. Database design (MongoDB collections)

Each section below defines one collection. The frontend type is in parentheses for cross-reference.

### 4.1 `combos` collection (matches `client/types/combo.ts`)

A combo is a bundle of products sold together at a discount.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | MongoDB primary key |
| `slug` | string | URL-safe, unique. e.g. `smart-combo-pack` |
| `name` | string | Display name |
| `tagline` | string | Short description |
| `totalPrice` | number | What customer pays for the combo |
| `originalPrice` | number | Sum of individual items — for "you save X%" |
| `badge` | string | e.g. `🔥 BEST SELLER` |
| `stockLeft` | number | Decrements on order. Triggers low-stock alert below threshold |
| `isFeatured` | boolean | One combo at a time should be the homepage hero combo |
| `isActive` | boolean | Hide without deleting (e.g. seasonal combos) |
| `items` | array | The individual products in this combo (see below) |
| `createdAt` | Date | Auto |
| `updatedAt` | Date | Auto |

Each `items[]` element:

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | e.g. "Smart Watch Pro" |
| `badge` | string | e.g. "SMART WATCH" |
| `individualPrice` | number | Standalone price |
| `images` | array of `{ url, alt }` | Cloudinary URLs |
| `description` | string (optional) | Long description |

Indexes: `slug` (unique), `isFeatured`, `isActive`.

### 4.2 `orders` collection (matches `client/types/order.ts`)

Every customer order.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `orderNumber` | string | Human-readable, unique. Format `SC-2026-001234` |
| `items` | array | Snapshot of cart at order time (see below) |
| `subtotal` | number | Sum of item prices |
| `shippingFee` | number | 0 if free shipping |
| `total` | number | subtotal + shippingFee |
| `status` | enum | `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded` |
| `paymentMethod` | enum | `paystack`, `flutterwave`, `bank_transfer`, `cod` |
| `paymentReference` | string (optional) | From payment provider |
| `paidAt` | Date (optional) | When payment confirmed |
| `shipping` | object | name, phone, email, state, city, street, landmark |
| `notes` | string (optional) | Customer notes from checkout |
| `trackingUrl` | string (optional) | Courier tracking link, set after shipping |
| `adminNotes` | string (optional) | Internal notes (not shown to customer) |
| `createdAt` | Date | |
| `updatedAt` | Date | |

Each `items[]` element is a **snapshot** — copies combo name and price at time of order. This protects the customer if you change combo prices later.

Indexes: `orderNumber` (unique), `status`, `shipping.phone`, `createdAt`.

### 4.3 `heroSlides` collection (NEW — for the admin-uploadable hero feature)

Marketing banners shown in the homepage hero carousel.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `desktopImage` | string | Cloudinary URL — wide format |
| `mobileImage` | string (optional) | Cloudinary URL — vertical format. Falls back to desktop if missing |
| `tag` | string (optional) | Small text at top right (e.g. "See the World Differently") |
| `headline` | string (optional) | Big text |
| `subtitle` | string (optional) | Smaller description |
| `buttonText` | string (optional) | e.g. "Shop Now" |
| `buttonLink` | string (optional) | URL or path |
| `linkedComboId` | ObjectId (optional) | If set, slide auto-uses combo's price + image |
| `displayOrder` | number | Sort order (0, 1, 2...) |
| `isActive` | boolean | On/off toggle |
| `startsAt` | Date (optional) | For scheduled campaigns |
| `endsAt` | Date (optional) | For scheduled campaigns |
| `createdAt` | Date | |
| `updatedAt` | Date | |

Indexes: `displayOrder`, `isActive`.

### 4.4 `siteSettings` collection (matches `client/types/settings.ts`)

Single document — only one row in this collection. Stores site-wide settings.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `storeName` | string | "Smart Combo" |
| `tagline` | string | |
| `defaultHeroImage` | string | Cloudinary URL — fallback |
| `promo` | object | `{ enabled, endsAt, headline, subline }` |
| `contact` | object | `{ whatsappNumber, email, phone, address }` |
| `video` | object | `{ url, thumbnail, title, duration }` |
| `trustStats` | object | `{ rating, reviewCount }` |
| `updatedAt` | Date | |

Note: `whatsappLink` is computed from `whatsappNumber`, not stored.

### 4.5 `testimonials` collection (matches `client/types/testimonial.ts`)

Customer reviews shown on homepage.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `name` | string | |
| `location` | string | e.g. "Lagos" |
| `rating` | number | 1–5 |
| `text` | string | |
| `isVerified` | boolean | |
| `isPublished` | boolean | Admin moderation toggle |
| `createdAt` | Date | |

Index: `isPublished`.

### 4.6 `faqs` collection (matches `client/types/faq.ts`)

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `question` | string | |
| `answer` | string | |
| `order` | number | Display order |
| `isPublished` | boolean | |
| `createdAt` | Date | |

Indexes: `order`, `isPublished`.

### 4.7 `adminUsers` collection

Admin login accounts (just you, maybe a small team later).

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `email` | string | Unique. Used to log in |
| `passwordHash` | string | bcrypt hash — never store plain password |
| `name` | string | Display name |
| `role` | enum | `superadmin`, `admin`, `staff` (future-proofing) |
| `lastLoginAt` | Date (optional) | |
| `createdAt` | Date | |

Index: `email` (unique).

---

## 5. API endpoint reference

All endpoints are under `/api/*`. Public endpoints don't need auth. Admin endpoints require a valid JWT in the `Authorization: Bearer <token>` header.

### 5.1 Public endpoints (no auth)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/combos` | List all active combos |
| GET | `/api/combos/featured` | Get the featured combo (for homepage) |
| GET | `/api/combos/:slug` | Get one combo by slug |
| GET | `/api/hero-slides` | List active hero slides (sorted) |
| GET | `/api/settings` | Get site settings |
| GET | `/api/testimonials` | List published testimonials |
| GET | `/api/faqs` | List published FAQs |
| POST | `/api/orders` | Create a new order |
| GET | `/api/orders/track` | Track order by `orderNumber` + `phone` query params |
| POST | `/api/payments/paystack/initialize` | Start Paystack payment |
| POST | `/api/payments/flutterwave/initialize` | Start Flutterwave payment |
| POST | `/api/payments/paystack/webhook` | Paystack notifies us when paid |
| POST | `/api/payments/flutterwave/webhook` | Flutterwave notifies us when paid |
| POST | `/api/auth/login` | Admin login — returns JWT |

### 5.2 Admin endpoints (require valid JWT)

| Method | Path | Purpose |
|--------|------|---------|
| **Combos** | | |
| POST | `/api/admin/combos` | Create combo |
| PATCH | `/api/admin/combos/:id` | Update combo |
| DELETE | `/api/admin/combos/:id` | Soft-delete (sets isActive: false) |
| **Orders** | | |
| GET | `/api/admin/orders` | List all orders (with filters) |
| GET | `/api/admin/orders/:id` | Order detail |
| PATCH | `/api/admin/orders/:id/status` | Change status |
| PATCH | `/api/admin/orders/:id` | Update order (notes, tracking) |
| **Hero slides** | | |
| POST | `/api/admin/hero-slides` | Create slide |
| PATCH | `/api/admin/hero-slides/:id` | Update slide |
| DELETE | `/api/admin/hero-slides/:id` | Delete slide |
| POST | `/api/admin/hero-slides/reorder` | Reorder (accepts array of `{id, displayOrder}`) |
| **Settings** | | |
| PATCH | `/api/admin/settings` | Update site settings (single doc) |
| **Testimonials & FAQs** | | |
| POST | `/api/admin/testimonials` | Create |
| PATCH | `/api/admin/testimonials/:id` | Update |
| DELETE | `/api/admin/testimonials/:id` | Delete |
| (same shape for `/api/admin/faqs`) | | |
| **Uploads** | | |
| POST | `/api/admin/upload` | Upload an image to Cloudinary, return URL |
| **Dashboard** | | |
| GET | `/api/admin/dashboard/stats` | Aggregate: today's orders, revenue, low-stock alerts |
| **Auth** | | |
| GET | `/api/admin/me` | Get current logged-in admin info |
| POST | `/api/admin/change-password` | Change own password |

### 5.3 Response format conventions

**Success:**
```json
{
  "data": { ... }
}
```
or for lists:
```json
{
  "data": [...],
  "meta": { "total": 42, "page": 1, "pageSize": 20 }
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Phone number is invalid",
    "details": { ... }
  }
}
```

HTTP status codes:
- `200` success
- `201` created
- `400` bad request (validation)
- `401` not authenticated
- `403` authenticated but not allowed
- `404` not found
- `409` conflict (e.g. duplicate slug)
- `500` server error

---

## 6. Order flow (the most important customer journey)

This is exactly what happens from "add to cart" to "delivered." Understanding this end-to-end is essential.

```
1. Customer adds combo to cart (Zustand, localStorage)

2. Customer goes to /checkout, fills the form, picks payment method,
   clicks "Place Order"

3. Frontend calls POST /api/orders with:
   { items, shipping, paymentMethod, notes }

4. Backend (orderService.createOrder):
   - Validates input (Zod)
   - Generates order number (e.g. SC-2026-001234)
   - Creates an Order document with status: 'pending'
   - Decrements combo stockLeft (atomic operation)
   - Returns the order

5a. If paymentMethod is 'paystack' or 'flutterwave':
    - Backend calls Paystack/Flutterwave API to initialize transaction
    - Backend returns { order, paymentUrl }
    - Frontend redirects browser to paymentUrl
    - Customer pays on Paystack/Flutterwave page
    - Customer redirected back to our /order-tracking?order=SC-...

5b. If paymentMethod is 'bank_transfer':
    - Email sent with bank details + order number reference
    - Order stays 'pending' until admin manually marks paid

5c. If paymentMethod is 'cod' (Ilorin only):
    - Order goes straight to 'processing'

6. Paystack/Flutterwave webhook fires:
   - POST /api/payments/[provider]/webhook
   - Backend verifies webhook signature (security)
   - Backend updates order: status -> 'paid', paymentReference, paidAt
   - emailService sends "Payment confirmed" email to customer
   - emailService sends "New paid order" alert to admin

7. Admin in dashboard:
   - Sees the paid order
   - Packages it
   - Updates status: paid -> processing -> shipped (with tracking URL)
   - Each status change triggers a customer notification

8. Customer can check status anytime at /order-tracking
   - Enters orderNumber + phone
   - Sees current status with timeline
```

### Why snapshots in orders matter

Notice that `Order.items` is a **snapshot**, not a reference to the combo. If you raise the price of Smart Combo Pack tomorrow, today's orders still show what the customer actually paid. Always snapshot.

---

## 7. Authentication flow (admin only)

### Login

```
1. Admin submits email + password to POST /api/auth/login
2. Backend looks up adminUsers by email
3. bcrypt.compare(submittedPassword, storedHash) — must match
4. If ok, sign a JWT with payload { userId, email, role }
   - Secret: process.env.JWT_SECRET (long random string)
   - Expires: 7 days
5. Return { token, user }
6. Frontend stores token in localStorage
7. Every subsequent admin request includes:
   Authorization: Bearer <token>
```

### Protected routes

```
1. Request hits /api/admin/* route
2. requireAuth middleware runs:
   - Reads Authorization header
   - Verifies JWT signature with JWT_SECRET
   - Decodes payload
   - Attaches user info to req.user
3. If invalid/expired/missing → 401 Unauthorized
4. If valid → continues to actual route handler
```

### Why JWT not sessions?

- Stateless — no session store to manage
- Simple for a single-admin setup
- Easy to rotate (just change JWT_SECRET to invalidate all tokens)

### Security notes

- `JWT_SECRET` must be at least 32 random characters, never committed to git
- Passwords hashed with bcrypt at cost factor 12
- Login endpoint rate-limited to prevent brute force (5 attempts / 15 min)
- HTTPS required in production (no plain HTTP)

---

## 8. Payment integration

### 8.1 Paystack flow

1. Frontend calls `POST /api/payments/paystack/initialize` with `{ orderNumber, email, amount }`
2. Backend calls Paystack API: `POST https://api.paystack.co/transaction/initialize`
3. Paystack returns `{ authorization_url, reference }`
4. Backend stores `reference` on the order, returns `authorization_url` to frontend
5. Frontend `window.location = authorization_url`
6. User pays on Paystack's hosted page
7. Paystack redirects user to our callback URL: `/order-tracking?order=SC-...`
8. **Asynchronously**: Paystack hits our webhook `POST /api/payments/paystack/webhook`
9. Webhook verifies the `x-paystack-signature` header (HMAC SHA512 of raw body using secret key)
10. Webhook updates the order to `paid`

**Important:** Trust the webhook, not the redirect. The webhook is the source of truth for whether payment succeeded.

### 8.2 Flutterwave flow

Nearly identical, just different API URLs and signature algorithm. Both implementations live in `paymentService.ts`.

### 8.3 Test mode vs live mode

Paystack and Flutterwave both have test API keys you use during development. They simulate real payments without real money. Switch to live keys only when you're ready to take real money.

```bash
# .env (development)
PAYSTACK_SECRET_KEY=sk_test_xxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxx

# .env (production)
PAYSTACK_SECRET_KEY=sk_live_xxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxx
```

---

## 9. Image uploads (Cloudinary)

### Why Cloudinary?

- Storing images on your server = slow + you run out of disk space
- Cloudinary handles: storage, CDN delivery, automatic resizing, format conversion (e.g. AVIF for modern browsers)
- Free tier: 25GB storage, 25GB bandwidth/month — enough for years for your scale

### Upload flow

1. Admin in dashboard clicks "Upload image"
2. Frontend uploads file as `multipart/form-data` to `POST /api/admin/upload`
3. Multer parses the upload (max 10MB, only image MIME types)
4. `cloudinaryService.upload()` sends file to Cloudinary
5. Cloudinary returns `secure_url` (e.g. `https://res.cloudinary.com/yourname/image/upload/v123/abc.jpg`)
6. Backend returns `{ url }` to frontend
7. Frontend uses that URL in the form (e.g. as a hero slide image)

### Folder organization on Cloudinary

```
smart-combo/
├── combos/
│   ├── smart-combo-pack/
│   │   ├── watch1.jpg
│   │   ├── glasses1.jpg
│   │   └── bracelet1.jpg
│   └── black-friday-combo/
├── hero-slides/
│   ├── desktop/
│   └── mobile/
├── settings/
│   ├── default-hero.jpg
│   └── video-thumbnail.jpg
└── testimonial-avatars/
```

This makes Cloudinary's web dashboard browsable.

---

## 10. Notifications

### Email (Resend)

Triggered by:
- Order placed (to customer): order summary + tracking link
- Order placed (to admin): "New order received"
- Payment confirmed (to customer): "Your payment was successful"
- Order shipped (to customer): tracking URL + estimated delivery
- Order delivered (to customer): "How was your experience? Leave a review"

All email templates live in `services/emailService.ts` as functions like `sendOrderConfirmation(order)`. Use simple HTML — no fancy MJML.

### WhatsApp (optional, phase 2)

Same triggers as email but via WhatsApp Business API. Most Nigerian customers will see a WhatsApp message faster than email.

For now, simpler approach: when admin gets the "new order" email, they can manually reach out via WhatsApp. Automate later.

---

## 11. Environment variables

These live in `.env` (development) and in deployment provider's env settings (production). **Never commit `.env` to git.**

```bash
# Server
NODE_ENV=development
PORT=8080

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smartcombo

# Auth
JWT_SECRET=<random_64_char_string>

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

# Flutterwave
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxx
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxx
FLUTTERWAVE_HASH=<webhook_secret>

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx

# Email
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=orders@smartcombo.ng
ADMIN_EMAIL=adekeyeolawale123@gmail.com

# Site
PUBLIC_SITE_URL=https://smartcombo.ng
```

A `.env.example` file (committed to git) lists the keys with empty values so future devs know what they need.

---

## 12. Conventions and rules

These are the conventions we follow. Stick to them and the codebase stays clean.

### Code conventions

1. **One responsibility per file.** A route file handles routes, a service file holds business logic.
2. **Validate with Zod at every boundary.** Inputs are validated in route handlers, before any business logic runs.
3. **Never trust the client.** Always re-check authorization, prices, etc. on the backend.
4. **Use async/await, not callbacks.** Wrap async route handlers with `asyncHandler` so errors bubble to error middleware.
5. **No hardcoded magic strings.** Statuses like `'paid'` should come from a const enum.
6. **Lowercase + dashes for paths.** `/api/hero-slides` not `/api/heroSlides`.
7. **Plural for resource names.** `/api/combos` not `/api/combo`.

### Database conventions

8. **Soft delete by default.** Set `isActive: false` instead of removing the document, so historical orders still reference it.
9. **Always snapshot in orders.** Never reference a combo by ID — copy the relevant fields.
10. **Use ISO date strings in API responses,** Date objects in MongoDB.
11. **Index any field you query by.** Especially `slug`, `orderNumber`, `email`.

### Security conventions

12. **Hash passwords with bcrypt cost factor 12.** Never store plain.
13. **Verify webhook signatures.** Anyone can hit your webhook URL — only Paystack/Flutterwave should be trusted, and the signature proves it.
14. **Use HTTPS in production.** Never run on plain HTTP.
15. **Rate-limit auth endpoints.** Login: 5 per 15 minutes. Order creation: 10 per minute per IP.
16. **CORS:** Only allow your frontend domain in production. `*` is fine in development.

### Error handling

17. **Throw, don't return errors.** Throw an error, let the error middleware format it.
18. **Use custom error classes:** `NotFoundError`, `ValidationError`, `UnauthorizedError`, etc.
19. **Don't leak stack traces in production.** Error middleware should hide details when `NODE_ENV === 'production'`.

---

## 13. Build order (chronological)

This is exactly the order we'll write the backend, in small testable chunks.

### Phase 1 — Foundation (~2 hours)

1. Sign up for MongoDB Atlas, get connection string
2. Install backend dependencies: `mongoose`, `bcrypt`, `jsonwebtoken`, `multer`, `cloudinary`, `resend`
3. Create `server/db.ts` — MongoDB connection logic
4. Create `server/config.ts` — env var access
5. Update `server/index.ts` to connect to DB on startup
6. Create error handling middleware
7. Smoke test: server starts, DB connects, `/api/ping` works

### Phase 2 — Public read APIs (~3 hours)

8. Create `Combo` model + `routes/combos.ts` (read endpoints)
9. Create `SiteSettings` model + `routes/settings.ts`
10. Create `Testimonial` model + `routes/testimonials.ts`
11. Create `FAQ` model + `routes/faqs.ts`
12. Create `HeroSlide` model + `routes/hero-slides.ts`
13. Write seed scripts to populate DB with current hardcoded data
14. **Switch frontend** — update `client/api/*.ts` to call real endpoints
15. **Test:** site looks identical, but data now comes from MongoDB

### Phase 3 — Admin auth (~2 hours)

16. Create `AdminUser` model
17. Create `routes/auth.ts` — login endpoint
18. Create `requireAuth` middleware
19. Seed first admin user (you)
20. Frontend: build login page at `/admin/login`
21. Frontend: protect `/admin/*` routes with auth check
22. **Test:** can log in, can access admin pages, logout works

### Phase 4 — Orders (read + create) (~3 hours)

23. Create `Order` model
24. Create `services/orderService.ts` — `createOrder`, `findByNumber`
25. Create `routes/orders.ts` — POST /api/orders, GET /api/orders/track
26. **Switch frontend** — checkout form actually creates orders
27. Order tracking page works against real DB
28. **Test:** place a fake order, see it appear, track it

### Phase 5 — Admin order management (~2 hours)

29. Admin endpoints: list orders, view detail, update status
30. Frontend admin UI: orders list page + order detail page
31. **Test:** see orders in admin, change status

### Phase 6 — Image uploads (~1.5 hours)

32. Sign up for Cloudinary, get API keys
33. Create `services/cloudinaryService.ts`
34. Create `routes/upload.ts` — `POST /api/admin/upload`
35. **Test:** upload an image from admin, see it appear

### Phase 7 — Admin combo management (~2 hours)

36. Admin endpoints: create/update/delete combo
37. Frontend admin UI: combos list, create combo form, edit combo form
38. Wire image upload into combo creation
39. **Test:** create a 2nd combo from admin, see it on /products

### Phase 8 — Admin hero slides (~2 hours)

40. Admin endpoints: create/update/delete/reorder hero slides
41. Frontend admin UI: hero slides editor (drag-and-drop reorder, image upload, live preview)
42. **Test:** add a new hero slide, see it on homepage

### Phase 9 — Admin settings, FAQs, testimonials (~2 hours)

43. Admin endpoints + UIs for site settings, FAQs, testimonials
44. **Test:** change WhatsApp number from admin, see it update everywhere

### Phase 10 — Payments (~3 hours)

45. Sign up for Paystack (test mode), get keys
46. Create `services/paymentService.ts` — Paystack initialize + webhook verify
47. Create `routes/payments.ts`
48. Wire checkout to redirect to Paystack
49. Wire webhook to update order status
50. Same for Flutterwave
51. **Test:** end-to-end purchase with test card

### Phase 11 — Email notifications (~1.5 hours)

52. Sign up for Resend, get API key
53. Create `services/emailService.ts` with email templates
54. Trigger emails on order placed + payment confirmed + status changes
55. **Test:** check inbox, see emails arrive

### Phase 12 — Deploy (~2 hours)

56. Deploy backend to Render or Railway
57. Configure production env vars
58. Switch frontend to point at production API
59. Set up custom domain + HTTPS
60. **Test:** real site, real (test mode) payment, full flow

**Total: ~26 hours of focused work,** spread across however many days.

---

## 14. Deployment plan

### Option A: Render (recommended for starting)

- Free tier available (with cold starts after 15 min idle)
- Paid: $7/month
- Connects directly to GitHub
- Auto-deploys on push to main

### Option B: Railway

- $5/mo starter plan
- Slightly faster deploys
- Similar to Render

### Option C: DigitalOcean App Platform

- $5/mo
- More control

**My recommendation:** Render free tier for development, upgrade to $7/mo when you go live (no cold starts).

### Production checklist

Before going live:
- [ ] All env vars set in production
- [ ] MongoDB Atlas IP whitelist configured
- [ ] HTTPS enabled (free with Render)
- [ ] Custom domain pointing to backend (e.g. `api.smartcombo.ng`)
- [ ] CORS allows only your frontend domain
- [ ] Switched to live Paystack/Flutterwave keys
- [ ] Test webhooks work with live keys
- [ ] Admin password is strong (not the seed default)
- [ ] Database backups enabled (MongoDB Atlas does this automatically on paid plans)
- [ ] Error tracking set up (Sentry — optional but useful)

---

## 15. Maintenance & growing the project

### Adding a new combo

Once admin dashboard is built, just: log in → "Combos" → "Add new" → fill form, upload images → done. No code changes.

### Changing the WhatsApp number

Admin → Settings → update WhatsApp → save. Auto-updates everywhere on the site.

### Running a Black Friday campaign

Admin → Hero Slides → Add new → upload Black Friday banner, set start date Nov 24 / end date Nov 28 → save. Slide auto-shows during that window.

### Adding a new payment provider

1. Add new option to `PaymentMethod` enum (in `types/order.ts` AND `models/Order.ts`)
2. Add new function to `paymentService.ts`
3. Add new route to `routes/payments.ts`
4. Add new option to checkout form

### Hiring help

Future devs can read this doc + section 12 (conventions) and be productive in a day. The folder structure mirrors itself, so they always know where to find things.

---

## 16. Common pitfalls and how to avoid them

| Pitfall | How to avoid |
|---------|-------------|
| **"It works locally but not in production"** | Use the same env var keys everywhere. Don't hardcode URLs. |
| **Webhook spam / fake payments** | Always verify webhook signatures. Treat unsigned requests as fake. |
| **Lost orders** | Use atomic operations. Wrap "create order + decrement stock" in a transaction. |
| **Stock goes negative** | Use `findOneAndUpdate` with `$inc: { stockLeft: -1 }` and a `stockLeft >= 1` filter. |
| **Customer paid but order shows pending** | Trust the webhook, not the redirect. Always cross-check via Paystack API if doubts. |
| **Admin password leaked** | Hash with bcrypt. Use long random strings. Rotate JWT secret if compromised. |
| **CORS errors in production** | Configure `cors()` with explicit origin in production, not `*`. |
| **Hero image not showing** | Cloudinary URL must be HTTPS. Check the returned URL has `https://`. |
| **MongoDB connection drops** | Mongoose handles reconnects. Set `serverSelectionTimeoutMS: 5000` to fail fast. |

---

## Appendix A: Useful resources

- MongoDB Atlas docs: https://www.mongodb.com/docs/atlas/
- Mongoose docs: https://mongoosejs.com
- Paystack API docs: https://paystack.com/docs/api
- Flutterwave API docs: https://developer.flutterwave.com
- Cloudinary docs: https://cloudinary.com/documentation
- Resend docs: https://resend.com/docs
- JWT introduction: https://jwt.io/introduction

## Appendix B: Where to find things in the frontend

| Frontend file | What it does |
|---------------|--------------|
| `client/types/*.ts` | TypeScript types — must match backend models |
| `client/api/*.ts` | Functions that call backend endpoints |
| `client/data/*.ts` | DELETE these once backend is live (was hardcoded fallback) |
| `client/contexts/SettingsContext.tsx` | Loads site settings on app start |
| `client/stores/cart.ts` | Cart state (Zustand, localStorage — no backend needed) |
| `client/pages/Checkout.tsx` | Creates orders via `api/orders.ts` |
| `client/pages/OrderTracking.tsx` | Looks up orders via `api/orders.ts` |
| `client/pages/AdminDashboard.tsx` | Admin home — to be expanded into full admin |

---

**End of document.**

Save this somewhere safe. We'll refer to it constantly during the build.
