# QR Order System

Sistem pemesanan digital berbasis QR Code untuk cafe dan restoran. Customer scan QR di meja, pesan langsung dari HP, dan kasir mengkonfirmasi pembayaran.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma ORM · PostgreSQL

---

## Fitur Phase 1 

- Menu digital per meja (scan QR)
- Keranjang belanja dengan persistensi localStorage
- Checkout dengan validasi nama pelanggan (wajib sebelum bayar)
- Pilihan metode pembayaran: Cash, QRIS, Transfer Bank, Debit/EDC
- Order dibuat dengan status `PENDING_PAYMENT` dan `payment_status UNPAID`
- Halaman status order dengan polling otomatis
- Simulasi konfirmasi kasir (mode demo)
- Nomor antrian otomatis setelah payment dikonfirmasi
- Invoice setelah PAID
- Kitchen Display — hanya menampilkan order PAID
- Kitchen dapat update status: PAID → IN_PROGRESS → READY → DONE

---

## Cara Menjalankan Lokal

### 1. Clone repo

```bash
git clone https://github.com/makbarzidane/qr-order-system.git
cd qr-order-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment

```bash
cp .env.example .env
```

Edit `.env` dan isi `DATABASE_URL` dan `DIRECT_URL` dengan koneksi PostgreSQL kamu (bisa pakai [Neon](https://neon.tech) gratis).

> **Phase 1 note:** Data order disimpan in-memory, tidak perlu koneksi DB aktif untuk menjalankan app. DB hanya dibutuhkan saat `prisma migrate` di fase berikutnya.

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — akan redirect otomatis ke `/menu/meja-1`.

---

## Cara Build

```bash
npm run build
```

Build akan menjalankan `prisma generate` otomatis via `postinstall`.

---

## Deploy ke Vercel

### 1. Setup database (Neon direkomendasikan)

1. Buat akun di [neon.tech](https://neon.tech)
2. Buat project baru
3. Salin **Connection String (pooled)** untuk `DATABASE_URL`
4. Salin **Connection String (direct)** untuk `DIRECT_URL`

### 2. Deploy via Vercel CLI

```bash
npm install -g vercel
vercel
```

Atau connect repo di [vercel.com](https://vercel.com) → New Project → Import dari GitHub.

### 3. Environment Variables di Vercel

Tambahkan di **Settings → Environment Variables** (berlaku untuk Production + Preview):

| Key | Value |
|---|---|
| `DATABASE_URL` | Pooled connection string dari Neon |
| `DIRECT_URL` | Direct connection string dari Neon |
| `NEXTAUTH_SECRET` | Random string panjang (generate: `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL produksi (misal `https://qr-order.vercel.app`) |

### 4. Vercel Build Settings

Pastikan build command di Vercel adalah:

```
npm run build
```

Ini otomatis menjalankan `prisma generate` via `postinstall`.

### 5. Preview Deployments

Setiap push ke branch akan membuat Preview URL otomatis. Untuk preview yang punya DB:
- Pakai **Neon branching** — tiap PR bisa punya branch database sendiri.
- Atau pakai satu database shared untuk preview (data test, bukan produksi).

---

## Struktur Halaman

| URL | Deskripsi |
|---|---|
| `/menu/[tableId]` | Menu digital (akses via QR meja) |
| `/cart` | Keranjang belanja |
| `/checkout` | Form nama + pilih metode bayar |
| `/order/[id]/status` | Status order + nomor antrian |
| `/order/[id]/invoice` | Invoice (hanya setelah PAID) |
| `/kitchen/display` | Kitchen Display (hanya order PAID) |

---

## Aturan Bisnis Kritis

- Nama pelanggan **wajib diisi** sebelum checkout (divalidasi di server)
- Order **non-PAID tidak masuk** Kitchen Display
- Nomor antrian **hanya dibuat setelah** `payment_status = PAID`
- Invoice **hanya tersedia** setelah PAID

---

## Roadmap

- **Phase 2:** Prisma + PostgreSQL real, Admin CMS (menu, diskon), Cashier panel, laporan
- **Phase 3:** QRIS / Virtual Account via webhook (Midtrans/Xendit)
- **Phase 4:** Real-time push, multi-outlet, laporan lanjutan

---

## Lisensi

MIT
