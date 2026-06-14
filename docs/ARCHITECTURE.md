# QR Order System — Rancangan Sistem (Design Doc)

> Dokumen perencanaan untuk **QR Order System** (cafe/restoran). **Belum ada kode aplikasi** — dokumen ini menunggu approval sebelum implementasi.
>
> Stack: **Next.js (App Router) + TypeScript + Tailwind CSS + Prisma ORM + PostgreSQL**, deploy **Vercel-ready**, responsive, 3 role: **admin, cashier, kitchen**.

---

## 1. Rancangan Arsitektur Sistem

### 1.1 Gambaran Umum

Aplikasi monolitik Next.js App Router (full-stack dalam satu repo). UI dirender via React Server Components + Client Components seperlunya, mutasi data lewat **Server Actions** (default) dengan beberapa **Route Handlers** (`app/api/...`) untuk hal yang butuh endpoint HTTP murni (webhook masa depan, polling status, export file).

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Device                       │
│                                                               │
│  Customer (QR)   Admin/CMS     Cashier        Kitchen Display │
│  publik          login         login          login           │
└───────┬──────────────┬───────────┬───────────────┬───────────┘
        │              │           │               │
        ▼              ▼           ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router (Vercel)                │
│                                                               │
│  Route Groups:                                                │
│   (public)  → menu, cart, checkout, invoice, status antrian   │
│   (admin)   → dashboard, CMS menu/diskon, laporan             │
│   (cashier) → konfirmasi pembayaran                           │
│   (kitchen) → display order PAID                              │
│                                                               │
│  Server Actions  ─ create order, confirm payment, CRUD menu   │
│  Route Handlers  ─ /api/auth, /api/reports/export,            │
│                    /api/orders/stream (SSE/polling),          │
│                    /api/webhooks/* (FASE LANJUT, belum aktif)  │
│                                                               │
│  Auth middleware (role-based) ── lindungi (admin/cashier/kitchen)│
└───────────────────────────┬───────────────────────────────────┘
                            │ Prisma Client
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL (Neon / Supabase / Vercel PG)     │
│  Users, MenuItem, Category, Discount, Order, OrderItem,       │
│  Payment, QueueNumber, AuditLog, Settings                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Empat Bagian Utama

| Bagian | Akses | Fungsi inti |
|---|---|---|
| **1. Customer Page** | Publik (via QR, tanpa login) | Lihat menu digital, kelola cart, isi nama, checkout, pilih metode bayar, lihat invoice + nomor antrian setelah PAID |
| **2. Dashboard / CMS Admin** | Login (admin) | Kelola menu, kategori, diskon; laporan pemasukan, grafik, export, download invoice; kelola user & meja/QR |
| **3. Cashier / Payment Confirmation** | Login (cashier/admin) | Lihat order `PENDING_PAYMENT`, konfirmasi pembayaran manual (cash / transfer / debit EDC), set `PAID` |
| **4. Kitchen Display** | Login (kitchen/admin) | Tampilkan hanya order **PAID**, update status masak (PAID → IN_PROGRESS → READY → DONE) |

### 1.3 Alur Customer (end-to-end)

```
Scan QR meja ──► Menu digital ──► Pilih item ──► Cart
   ──► Isi NAMA pelanggan (WAJIB) ──► Checkout
   ──► Pilih metode pembayaran ──► Bayar
   ──► Kasir/Admin konfirmasi (manual) ──► payment_status = PAID
   ──► BARU: generate nomor antrian + invoice
   ──► Order muncul di Kitchen Display
```

### 1.4 Aturan Bisnis Kritis (state machine)

`Order.status`:

```
DRAFT ──checkout──► PENDING_PAYMENT ──konfirmasi kasir──► PAID
   │                                                       │
   │                                                       ▼ (auto pada PAID)
   │                                              + QueueNumber dibuat
   │                                              + Invoice tersedia
   │                                                       │
   └──(customer batal / timeout)──► CANCELLED              ▼
                                              Kitchen: PAID ─► IN_PROGRESS ─► READY ─► DONE
```

Aturan yang **wajib** ditegakkan di server (bukan sekadar UI):

- Customer **wajib** mengisi nama sebelum bisa memilih metode pembayaran / checkout.
- Order yang belum `PAID` **tidak boleh** masuk Kitchen Display.
- **Nomor antrian hanya dibuat** setelah `payment_status = PAID` (idempotent, satu order = satu nomor).
- **Invoice & download** hanya tersedia setelah `PAID`.
- Cash, transfer manual, dan debit EDC dikonfirmasi oleh **kasir/admin** (tidak otomatis).
- QRIS / Virtual Account / payment gateway via webhook = **FASE LANJUT**, tidak dibangun di MVP1.

### 1.5 Real-time Strategy (Kitchen & Cashier)

- **MVP1:** polling sederhana via SWR/`revalidate` (mis. setiap 5–10 dtk) atau Server-Sent Events ringan. Hindari WebSocket dulu karena keterbatasan serverless Vercel.
- **Fase lanjut:** pakai Pusher / Ably / Supabase Realtime kalau butuh latensi rendah.

---

## 2. Fase Pengerjaan Bertahap

### Fase 0 — Setup & Fondasi
- Init Next.js + TS + Tailwind + ESLint/Prettier.
- Setup Prisma + koneksi PostgreSQL (Neon/Supabase).
- Setup env, struktur folder, base layout & komponen UI.
- Setup auth dasar (role: admin/cashier/kitchen) + seed user admin.

### Fase 1 — MVP1 (target utama, pembayaran MANUAL)
- **Customer:** menu digital (kategori + item), cart, isi nama (wajib), checkout, pilih metode (cash/transfer/debit EDC), halaman "menunggu konfirmasi".
- **Cashier:** daftar order `PENDING_PAYMENT`, tombol konfirmasi → `PAID`.
- **Auto on PAID:** generate nomor antrian + invoice; halaman invoice & status antrian untuk customer.
- **Kitchen:** display order PAID + update status masak.
- **Admin CMS dasar:** CRUD menu, kategori; lihat daftar order.
- Penegakan aturan bisnis kritis di server (validasi nama, gating PAID).

### Fase 2 — CMS Lengkap & Laporan
- Diskon (per item / per order / persentase / nominal).
- Laporan pemasukan + grafik (harian/mingguan/bulanan).
- Kategori pemasukan: cash vs online payment.
- Export laporan (CSV/Excel/PDF), download invoice (PDF).
- Manajemen meja/QR (generate QR per meja), manajemen user.

### Fase 3 — Pembayaran Otomatis (PASCA-MVP)
- Integrasi QRIS / Virtual Account / payment gateway (mis. Midtrans/Xendit).
- Webhook `/api/webhooks/payment` → set `PAID` otomatis.
- Idempotency & signature verification webhook.

### Fase 4 — Polish & Skala
- Real-time push (Pusher/Ably), notifikasi.
- Multi-outlet, audit log lengkap, peran lebih granular.
- Optimasi performa, observability, rate limiting.

---

## 3. Struktur Folder

```
qr-order-system/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   └── ...
├── src/
│   ├── app/
│   │   ├── (public)/                 # Customer, tanpa login
│   │   │   ├── menu/[tableId]/page.tsx
│   │   │   ├── cart/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   ├── order/[orderId]/
│   │   │   │   ├── status/page.tsx    # status + nomor antrian
│   │   │   │   └── invoice/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (admin)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── menu/                  # CMS menu + kategori
│   │   │   ├── discounts/
│   │   │   ├── reports/
│   │   │   ├── orders/
│   │   │   ├── tables/                # generate QR per meja
│   │   │   ├── users/
│   │   │   └── layout.tsx
│   │   ├── (cashier)/
│   │   │   ├── payments/page.tsx      # konfirmasi pembayaran
│   │   │   └── layout.tsx
│   │   ├── (kitchen)/
│   │   │   ├── display/page.tsx       # order PAID
│   │   │   └── layout.tsx
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── orders/stream/route.ts # SSE/polling kitchen/cashier
│   │   │   ├── reports/export/route.ts
│   │   │   └── webhooks/payment/route.ts  # FASE 3, belum aktif
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── actions/                      # Server Actions
│   │   ├── order.actions.ts
│   │   ├── payment.actions.ts
│   │   ├── menu.actions.ts
│   │   ├── discount.actions.ts
│   │   └── report.actions.ts
│   ├── components/
│   │   ├── ui/                        # komponen dasar (button, input, dll)
│   │   ├── customer/
│   │   ├── admin/
│   │   ├── cashier/
│   │   └── kitchen/
│   ├── lib/
│   │   ├── prisma.ts                  # singleton Prisma Client
│   │   ├── auth.ts                    # konfigurasi auth + helper role
│   │   ├── queue.ts                   # generator nomor antrian
│   │   ├── invoice.ts                 # generator invoice/PDF
│   │   ├── validations/               # skema Zod
│   │   └── utils.ts
│   ├── types/
│   └── middleware.ts                  # proteksi route per role
├── docs/
│   └── ARCHITECTURE.md                # dokumen ini
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Struktur Database Prisma

> Catatan: skema di bawah untuk **MVP1 + ruang tumbuh** ke fase berikutnya. Field webhook gateway disiapkan tapi belum dipakai di MVP1.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Auth & Users ───────────────────────────────
enum Role {
  ADMIN
  CASHIER
  KITCHEN
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // hash (bcrypt/argon2)
  role      Role     @default(CASHIER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  confirmedPayments Payment[] @relation("ConfirmedBy")
  auditLogs         AuditLog[]
}

// ─── Meja / QR ──────────────────────────────────
model Table {
  id        String   @id @default(cuid())
  name      String   // mis. "Meja 1"
  code      String   @unique // dipakai di URL QR
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  orders    Order[]
}

// ─── Menu ───────────────────────────────────────
model Category {
  id        String     @id @default(cuid())
  name      String
  sortOrder Int        @default(0)
  isActive  Boolean    @default(true)
  items     MenuItem[]
  createdAt DateTime   @default(now())
}

model MenuItem {
  id          String   @id @default(cuid())
  name        String
  description String?
  price       Decimal  @db.Decimal(12, 2)
  imageUrl    String?
  isAvailable Boolean  @default(true)
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  orderItems  OrderItem[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ─── Diskon ─────────────────────────────────────
enum DiscountType {
  PERCENT
  FIXED
}

model Discount {
  id        String       @id @default(cuid())
  name      String
  type      DiscountType
  value     Decimal      @db.Decimal(12, 2) // % atau nominal
  isActive  Boolean      @default(true)
  startsAt  DateTime?
  endsAt    DateTime?
  orders    Order[]
  createdAt DateTime     @default(now())
}

// ─── Order ──────────────────────────────────────
enum OrderStatus {
  DRAFT
  PENDING_PAYMENT
  PAID
  IN_PROGRESS
  READY
  DONE
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  PAID
  FAILED
  REFUNDED
}

enum PaymentMethod {
  CASH
  TRANSFER
  DEBIT_EDC
  QRIS        // FASE 3
  VIRTUAL_ACCOUNT // FASE 3
}

enum PaymentChannel {
  CASH
  ONLINE
}

model Order {
  id            String        @id @default(cuid())
  orderNumber   String        @unique          // human-friendly
  customerName  String                         // WAJIB sebelum bayar
  tableId       String?
  table         Table?        @relation(fields: [tableId], references: [id])

  status        OrderStatus   @default(DRAFT)
  paymentStatus PaymentStatus @default(UNPAID)

  subtotal      Decimal       @db.Decimal(12, 2) @default(0)
  discountId    String?
  discount      Discount?     @relation(fields: [discountId], references: [id])
  discountAmount Decimal      @db.Decimal(12, 2) @default(0)
  total         Decimal       @db.Decimal(12, 2) @default(0)

  items         OrderItem[]
  payment       Payment?
  queueNumber   QueueNumber?

  paidAt        DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([status])
  @@index([paymentStatus])
  @@index([createdAt])
}

model OrderItem {
  id         String   @id @default(cuid())
  orderId    String
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItemId String
  menuItem   MenuItem @relation(fields: [menuItemId], references: [id])
  nameSnapshot String                          // simpan nama saat order
  priceSnapshot Decimal @db.Decimal(12, 2)     // simpan harga saat order
  quantity   Int      @default(1)
  note       String?
  lineTotal  Decimal  @db.Decimal(12, 2)
}

// ─── Payment ────────────────────────────────────
model Payment {
  id            String         @id @default(cuid())
  orderId       String         @unique
  order         Order          @relation(fields: [orderId], references: [id])
  method        PaymentMethod
  channel       PaymentChannel // CASH atau ONLINE (untuk kategori laporan)
  amount        Decimal        @db.Decimal(12, 2)
  status        PaymentStatus  @default(UNPAID)

  confirmedById String?        // kasir/admin yang konfirmasi (manual)
  confirmedBy   User?          @relation("ConfirmedBy", fields: [confirmedById], references: [id])
  confirmedAt   DateTime?

  // FASE 3 (gateway) — belum dipakai di MVP1
  gatewayRef    String?
  gatewayPayload Json?

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

// ─── Nomor Antrian ──────────────────────────────
model QueueNumber {
  id        String   @id @default(cuid())
  orderId   String   @unique
  order     Order    @relation(fields: [orderId], references: [id])
  number    Int                                  // reset harian
  dateKey   String                               // "YYYY-MM-DD" untuk reset
  createdAt DateTime @default(now())

  @@unique([dateKey, number])                     // anti duplikat per hari
}

// ─── Audit & Settings ───────────────────────────
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  action    String
  entity    String
  entityId  String?
  metadata  Json?
  createdAt DateTime @default(now())
}

model Setting {
  id    String @id @default(cuid())
  key   String @unique
  value Json
}
```

Catatan desain penting:
- **Snapshot harga & nama** di `OrderItem` agar laporan historis tidak berubah saat menu diedit.
- `QueueNumber` punya `@@unique([dateKey, number])` + reset harian → nomor antrian unik per hari.
- `Payment.channel` (CASH/ONLINE) memudahkan **kategori pemasukan** di laporan.
- Pakai `Decimal` untuk uang (jangan `Float`).
- Pembuatan nomor antrian harus dalam **transaksi** + idempotent saat order jadi PAID.

---

## 5. Daftar Halaman

### Customer (publik, tanpa login)
| Route | Fungsi |
|---|---|
| `/menu/[tableId]` | Menu digital per meja (dari QR) |
| `/cart` | Keranjang, ubah qty, catatan |
| `/checkout` | Isi nama (wajib) + pilih metode bayar |
| `/order/[orderId]/status` | Status order + nomor antrian (setelah PAID) |
| `/order/[orderId]/invoice` | Invoice + tombol download (setelah PAID) |

### Admin / CMS (login: admin)
| Route | Fungsi |
|---|---|
| `/dashboard` | Ringkasan + grafik pemasukan |
| `/menu` | CRUD menu & kategori, toggle ketersediaan |
| `/discounts` | CRUD diskon |
| `/orders` | Semua order + filter status |
| `/reports` | Laporan pemasukan, grafik, export, kategori cash/online |
| `/tables` | Kelola meja + generate QR |
| `/users` | Kelola user & role |

### Cashier (login: cashier/admin)
| Route | Fungsi |
|---|---|
| `/payments` | Daftar order `PENDING_PAYMENT`, konfirmasi manual → PAID |

### Kitchen (login: kitchen/admin)
| Route | Fungsi |
|---|---|
| `/display` | Order PAID, update status masak (IN_PROGRESS/READY/DONE) |

### Auth
| Route | Fungsi |
|---|---|
| `/login` | Login staf (admin/cashier/kitchen) |

---

## 6. Daftar API / Server Actions

### Server Actions (mutasi utama)
| Action | Akses | Aturan kunci |
|---|---|---|
| `addToCart / updateCart` | Publik | Validasi item tersedia |
| `createOrder` | Publik | **Tolak jika nama kosong**; status → `PENDING_PAYMENT` |
| `selectPaymentMethod` | Publik | Hanya boleh jika nama sudah terisi |
| `confirmPayment(orderId)` | Cashier/Admin | Set `PAID` + `paidAt`; **transaksi**: buat QueueNumber + tandai invoice; idempotent |
| `cancelOrder(orderId)` | Cashier/Admin | Hanya jika belum PAID |
| `updateKitchenStatus(orderId)` | Kitchen/Admin | **Tolak jika order belum PAID**; PAID→IN_PROGRESS→READY→DONE |
| `createMenuItem / update / delete` | Admin | Validasi Zod |
| `createCategory / update / delete` | Admin | — |
| `createDiscount / update / delete` | Admin | — |
| `createTable / generateQr` | Admin | — |
| `createUser / updateRole` | Admin | — |

### Route Handlers (`app/api`)
| Endpoint | Akses | Fungsi |
|---|---|---|
| `POST /api/auth/[...nextauth]` | Publik | Login/session |
| `GET /api/orders/stream` | Cashier/Kitchen | Polling/SSE order live |
| `GET /api/reports/export` | Admin | Export CSV/Excel/PDF |
| `GET /api/orders/[id]/invoice.pdf` | Publik (PAID) / Admin | Download invoice PDF |
| `POST /api/webhooks/payment` | Gateway (FASE 3) | **Tidak aktif di MVP1**; signature + idempotency saat dibangun |

### Penegakan aturan PAID-gating (ringkas)
- `createOrder`: `if (!customerName?.trim()) throw` .
- Kitchen query: `where: { paymentStatus: 'PAID' }` — order non-PAID **tidak pernah** ke-fetch.
- `confirmPayment`: bungkus dalam `prisma.$transaction` → set PAID, buat QueueNumber (cek belum ada), set invoice.

---

## 7. Checklist Keamanan & Bug yang Harus Dicegah

### Keamanan
- [ ] **Role-based access control** di `middleware.ts` + dicek ulang di tiap Server Action (jangan percaya UI).
- [ ] Password di-hash (bcrypt/argon2), tidak pernah disimpan plaintext.
- [ ] Session aman (httpOnly, secure, sameSite), CSRF protection pada mutasi.
- [ ] **Validasi input server-side** dengan Zod di semua action (jangan andalkan validasi client).
- [ ] Customer page publik **tidak boleh** mengakses data order milik orang lain — akses invoice/status pakai ID tak-tertebak (cuid) + scoping.
- [ ] Rate limiting pada `createOrder` & login (cegah spam/brute force).
- [ ] Webhook (fase 3): verifikasi signature + idempotency key wajib.
- [ ] Jangan expose secret/env ke client; hanya `NEXT_PUBLIC_*` yang aman.
- [ ] Sanitasi upload gambar menu (tipe & ukuran), pakai storage eksternal (Vercel Blob/S3).
- [ ] Audit log untuk aksi sensitif (konfirmasi bayar, ubah harga, hapus).

### Bug & integritas data yang harus dicegah
- [ ] **Race condition nomor antrian** → buat dalam transaksi + unique constraint `(dateKey, number)`.
- [ ] **Double payment confirmation** → idempotent; cek `paymentStatus` sebelum set PAID.
- [ ] **Order non-PAID bocor ke Kitchen** → selalu filter `paymentStatus = PAID` di query.
- [ ] **Nama kosong lolos** → validasi wajib di server, bukan cuma form.
- [ ] **Harga berubah merusak laporan lama** → snapshot harga/nama di `OrderItem`.
- [ ] **Pembulatan uang** → pakai `Decimal`, hitung diskon konsisten (hindari float).
- [ ] **Stok/ketersediaan** → cek `isAvailable` saat checkout, bukan hanya saat render menu.
- [ ] **Prisma connection exhaustion di serverless** → pakai singleton client + connection pooling (PgBouncer/Neon pooled URL).
- [ ] **Timezone laporan** → simpan UTC, tampilkan Asia/Jakarta; `dateKey` antrian pakai timezone lokal.
- [ ] **N+1 query** di dashboard/laporan → pakai `include`/aggregate yang tepat.

---

## 8. Strategi Preview di Vercel

1. **Database serverless-friendly:** pakai Neon / Supabase / Vercel Postgres. Gunakan **pooled connection URL** untuk runtime (`DATABASE_URL`) dan **direct URL** untuk migrasi (`DIRECT_URL`).
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")      // pooled
     directUrl = env("DIRECT_URL")        // migrasi
   }
   ```
2. **Prisma di build:** tambahkan `prisma generate` ke build (mis. `"postinstall": "prisma generate"` atau `"build": "prisma generate && next build"`). Hindari error "Prisma Client not generated" di Vercel.
3. **Env vars:** set di Vercel Project Settings untuk environment **Production + Preview**. Sediakan `.env.example` lengkap.
4. **Preview Deployments:** tiap push/PR → Vercel buat URL preview otomatis. Pakai database preview/branch terpisah (Neon branching) agar tidak mengotori data produksi.
5. **Migrasi:** jalankan `prisma migrate deploy` saat deploy (bisa lewat build step atau CI), bukan `migrate dev` di Vercel.
6. **Seeding (opsional preview):** seed data demo (menu contoh, user admin) supaya preview langsung bisa dicoba.
7. **Runtime:** default Node.js runtime untuk route yang pakai Prisma (Prisma belum penuh di Edge). Tandai route Prisma `export const runtime = 'nodejs'` bila perlu.
8. **Region:** set region Vercel dekat dengan region database untuk latensi rendah.
9. **Healthcheck:** endpoint `/api/health` untuk verifikasi koneksi DB di preview.

### Env yang dibutuhkan (`.env.example`)
```
DATABASE_URL=          # pooled connection
DIRECT_URL=            # direct connection (migrasi)
NEXTAUTH_SECRET=
NEXTAUTH_URL=
# FASE 3 (belum dipakai MVP1):
# PAYMENT_GATEWAY_KEY=
# PAYMENT_WEBHOOK_SECRET=
```

---

## Catatan Akhir

- Dokumen ini **rencana**, bukan implementasi. Tidak ada kode aplikasi yang dibuat.
- QRIS / Virtual Account / payment gateway sengaja **ditunda** ke Fase 3 sesuai instruksi.
- Setelah di-approve, langkah berikutnya: scaffold Fase 0 (setup + Prisma + auth) lalu Fase 1 (MVP1 pembayaran manual).
