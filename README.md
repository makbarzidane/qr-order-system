# QR Order System

Sistem pemesanan digital berbasis QR Code untuk cafe dan restoran.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma ORM · PostgreSQL · NextAuth.js

---

## Phase 2 — Admin CMS + Cashier + Kitchen Workflow

### 🔑 Akun Seed Default

| Role    | Email                   | Password    |
|---------|-------------------------|-------------|
| ADMIN   | admin@qrorder.app       | admin123    |
| CASHIER | cashier@qrorder.app     | cashier123  |
| KITCHEN | kitchen@qrorder.app     | kitchen123  |

Jalankan seed: `npm run db:seed`

---

## Routes

### Customer (public)
- `/menu/[tableId]` — Menu pelanggan (QR entry point)
- `/cart` — Keranjang belanja
- `/checkout` — Checkout & pilih metode bayar
- `/order/[orderId]/status` — Status pesanan (polling live)
- `/order/[orderId]/invoice` — Invoice PDF

### Staff (auth required)
- `/login` — Login page (semua role)
- `/admin/dashboard` — Admin overview (ADMIN only)
- `/admin/categories` — Kelola kategori menu (ADMIN only)
- `/admin/menu` — Kelola item menu (ADMIN only)
- `/admin/users` — Daftar pengguna (ADMIN only, read-only)
- `/cashier/payments` — Konfirmasi pembayaran (CASHIER/ADMIN)
- `/kitchen/display` — Kitchen display board (KITCHEN/ADMIN)

---

## Order Status Flow

```
PENDING_PAYMENT → (kasir konfirmasi) → QUEUED → PREPARING → READY → COMPLETED
```

Payment status: `UNPAID` → `PAID`

---

## Setup

### Env vars (Vercel + local)

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-random-secret-32-chars
NEXTAUTH_URL=https://your-domain.vercel.app
```

Generate secret: `openssl rand -base64 32`

### Commands

```bash
# Push schema to DB
npm run db:push

# Seed users, categories, menu items
npm run db:seed

# Reset orders only (keeps users/categories/menu)
npm run reset:orders

# Database studio (GUI)
npm run db:studio
```

---

## Fitur Phase 1

- Menu digital per meja (scan QR)
- Keranjang belanja dengan persistensi localStorage
- Checkout dengan validasi nama pelanggan
- Pilihan metode pembayaran: Cash, QRIS, Transfer Bank, Debit/EDC
- Invoice per order

## Fitur Phase 2

- **Auth** — NextAuth.js dengan JWT, role-based (ADMIN/CASHIER/KITCHEN)
- **Admin CMS** — kelola kategori & menu langsung di dashboard
- **Kasir** — konfirmasi pembayaran, auto-assign nomor antrian
- **Kitchen** — board QUEUED → PREPARING → READY → COMPLETED
- **DB Menu** — menu item di-serve dari PostgreSQL (bukan dummy data)
- **Seed script** — `npm run db:seed` untuk populate awal
- **Reset script** — `npm run reset:orders` untuk hapus order saja

## Deferred to Phase 3

- User management CRUD (create/edit/delete staff)
- Discount & promo engine
- Order analytics dashboard
- Printer integration
- QR code generator per meja
