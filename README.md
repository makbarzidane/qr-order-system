# QR Order System

QR Order System adalah aplikasi pemesanan digital untuk cafe, restoran, dan UMKM kuliner. Customer memesan melalui QR meja, kasir mengonfirmasi pembayaran, dapur memproses pesanan, dan admin memantau menu serta laporan transaksi.

Project ini dibangun sebagai sistem operasional end-to-end, bukan hanya landing page. Fokus utamanya adalah alur bisnis nyata: menu digital, checkout, pembayaran, kitchen queue, laporan, dan dashboard admin.

## Live Demo

Production:

https://qr-order-system-eight.vercel.app

Demo akun:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@qrorder.app` | `admin123` |
| Cashier | `cashier@qrorder.app` | `cashier123` |
| Kitchen | `kitchen@qrorder.app` | `kitchen123` |

Customer menu demo:

https://qr-order-system-eight.vercel.app/menu/meja-1

> Catatan: akun demo dipakai untuk presentasi portfolio. Untuk pemakaian komersial, ganti semua akun default dan secret production.

## Tech Stack

| Layer | Teknologi |
| --- | --- |
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL Neon |
| ORM | Prisma |
| Auth | NextAuth.js Credentials + JWT |
| Deploy | Vercel |
| Runtime | Node.js Serverless Functions |

## Fitur Utama

### Customer Ordering

- Menu digital per meja melalui URL QR.
- Grid menu mobile 2 kolom dan desktop 3 kolom.
- Foto menu dari URL atau upload admin.
- Fallback gambar jika URL kosong atau gagal dimuat.
- Cart dengan localStorage.
- Checkout dengan nama pelanggan, meja, catatan item, dan metode pembayaran.
- Halaman status order dan invoice.

### Admin CMS

- Dashboard ringkasan operasional.
- Kelola kategori menu.
- Kelola menu: nama, deskripsi, harga, kategori, status aktif, status tersedia, emoji/fallback, dan URL/upload gambar.
- Kelola promo/discount.
- Kelola meja dan QR entry point.
- Pengaturan cafe.
- Laporan transaksi.

### Cashier

- Melihat order yang menunggu pembayaran.
- Konfirmasi pembayaran.
- Payment status berubah dari `UNPAID` ke `PAID`.
- Order masuk ke kitchen queue setelah dibayar.

### Kitchen Display

- Hanya menampilkan order aktif:
  - `paymentStatus = PAID`
  - `status = QUEUED`, `PREPARING`, atau `READY`
- Alur dapur:

```text
QUEUED -> PREPARING -> READY -> COMPLETED
```

- Setelah `COMPLETED`, order hilang dari active queue.
- Order completed tetap tersimpan untuk laporan.
- Nomor antrian reset ke `1` ketika tidak ada antrian aktif.

### Reports

- Filter laporan berdasarkan:
  - Harian
  - Mingguan
  - Bulanan
  - Tahunan
- Breakdown metode pembayaran:
  - Cash
  - QRIS
  - Transfer
  - Debit / EDC
- Export CSV untuk Excel.
- CSV berisi:
  - Ringkasan metode pembayaran
  - Rekap sesuai periode
  - Detail transaksi
  - Total keseluruhan

## Alur Sistem

```text
Customer scan QR meja
        |
        v
Pilih menu -> Cart -> Checkout
        |
        v
Order dibuat: PENDING_PAYMENT / UNPAID
        |
        v
Cashier konfirmasi pembayaran
        |
        v
Order menjadi: QUEUED / PAID
        |
        v
Kitchen proses: QUEUED -> PREPARING -> READY -> COMPLETED
        |
        v
Order masuk laporan transaksi
```

## Routes

### Public

| Route | Fungsi |
| --- | --- |
| `/menu/[tableId]` | Menu customer berdasarkan meja |
| `/cart` | Keranjang |
| `/checkout` | Checkout |
| `/order/[orderId]/status` | Status order |
| `/order/[orderId]/invoice` | Invoice |

### Staff

| Route | Role | Fungsi |
| --- | --- | --- |
| `/login` | Semua role | Login |
| `/admin` | Admin | Dashboard |
| `/admin/menu` | Admin | Kelola menu |
| `/admin/categories` | Admin | Kelola kategori |
| `/admin/reports` | Admin | Laporan |
| `/admin/tables` | Admin | Kelola meja |
| `/admin/settings` | Admin | Pengaturan cafe |
| `/cashier/payments` | Cashier/Admin | Konfirmasi pembayaran |
| `/kitchen/display` | Kitchen/Admin | Kitchen queue |

## Local Development

### 1. Install dependency

```bash
npm install
```

### 2. Buat `.env`

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
NEXTAUTH_SECRET="your-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

Generate secret:

```bash
openssl rand -base64 32
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Sinkronkan schema database

```bash
npm run db:push
```

### 5. Seed data awal

```bash
npm run db:seed
```

### 6. Jalankan aplikasi

```bash
npm run dev
```

Default URL:

http://localhost:3000

## Database Commands

```bash
# Generate Prisma Client
npx prisma generate

# Push schema ke database
npm run db:push

# Seed user, kategori, menu, meja, settings, promo
npm run db:seed

# Reset hanya order dan nomor antrian
npm run reset:orders

# Buka Prisma Studio
npm run db:studio
```

`npm run reset:orders` tidak menghapus user, kategori, menu, promo, atau settings. Script ini hanya menghapus:

- `Order`
- `QueueCounter`

## Deployment

Project ini sudah cocok untuk Vercel + Neon.

Environment variables yang wajib ada di Vercel:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-production-domain.vercel.app"
```

Checklist deploy:

```bash
npm run lint
npm run build
npx prisma db push
npm run db:seed
```

Untuk Vercel:

```bash
npx vercel --prod
```

## Keamanan

Yang sudah diterapkan:

- Secret tidak di-commit ke GitHub.
- `.env`, `.env*.local`, `.vercel`, `.next`, dan `node_modules` di-ignore.
- Role-based access untuk Admin, Cashier, dan Kitchen.
- NextAuth JWT session.
- Route admin/cashier/kitchen dilindungi middleware.
- Server action dan API melakukan validasi role untuk mutasi penting.
- Completed order tidak dihapus otomatis agar laporan tetap konsisten.
- Koneksi database memakai `process.env.DATABASE_URL`.

Yang wajib diganti sebelum dipakai bisnis sungguhan:

- Hapus atau ganti akun demo default.
- Gunakan password kuat untuk semua staff.
- Rotate `NEXTAUTH_SECRET`.
- Pastikan `NEXTAUTH_URL` sesuai domain production.
- Batasi akses admin hanya untuk pemilik/staff terpercaya.

## Status Market Readiness

Project ini sudah layak untuk:

- Portfolio developer.
- Demo ke client cafe/restoran.
- Prototype produk SaaS QR ordering.
- Uji coba operasional kecil dengan data real terbatas.

Namun, untuk benar-benar dipasarkan sebagai produk berbayar, masih ada beberapa pekerjaan penting.

### Kekurangan yang Masih Perlu Dikerjakan

#### 1. User Management Lengkap

Saat ini user seed sudah ada, tetapi manajemen staff masih terbatas. Untuk produk komersial perlu:

- Tambah user staff dari dashboard.
- Edit nama/email/role.
- Nonaktifkan user.
- Reset password.
- Audit perubahan user.

#### 2. Password dan Auth Hardening

Untuk produksi berbayar, auth perlu diperkuat:

- Rate limit login.
- Password policy.
- Proteksi brute force.
- Opsi forgot password.
- Session expiry yang lebih jelas.

#### 3. Storage Gambar Menu

Upload gambar saat ini cocok untuk demo. Untuk skala bisnis lebih baik memakai object storage:

- Vercel Blob
- Cloudinary
- Supabase Storage
- S3-compatible storage

Tujuannya agar database tidak berat dan gambar lebih cepat diakses.

#### 4. Export Excel Asli

Saat ini export menggunakan CSV yang bisa dibuka Excel. Untuk versi premium, lebih baik export `.xlsx` dengan beberapa sheet:

- Summary
- Payment Breakdown
- Period Recap
- Transactions

#### 5. Printer Integration

Untuk restoran/cafe, fitur printer sangat penting:

- Print struk kasir.
- Print kitchen ticket.
- Integrasi thermal printer.
- Auto print saat payment confirmed.

#### 6. Realtime Update

Saat ini kitchen/status dapat berjalan dengan polling. Untuk pengalaman lebih halus:

- WebSocket
- Server-Sent Events
- Realtime provider

#### 7. Multi-Tenant / Multi-Outlet

Jika ingin dijual sebagai SaaS, perlu struktur:

- Owner account
- Outlet/cabang
- Staff per outlet
- Menu per outlet
- Laporan per outlet
- Subscription plan

#### 8. Payment Gateway

Saat ini metode pembayaran dicatat manual. Untuk produk komersial perlu integrasi:

- Midtrans
- Xendit
- Duitku
- Stripe

Dengan callback/webhook agar status pembayaran otomatis.

#### 9. Observability

Untuk production serius perlu:

- Error tracking seperti Sentry.
- Request logging.
- Audit log lebih lengkap.
- Monitoring database.
- Alert jika order/payment gagal.

#### 10. Testing Otomatis

Testing manual sudah dilakukan, tetapi produk komersial butuh automated test:

- Unit test untuk order flow.
- Integration test untuk API order/payment/kitchen.
- E2E test customer -> cashier -> kitchen.
- Test export report.

## Roadmap Produk

### Version 1.0

- Stabilkan flow customer, cashier, kitchen, admin.
- User management staff.
- Storage gambar menu.
- Export Excel `.xlsx`.
- Printer kitchen ticket.
- Audit log dashboard.

### Version 1.5

- Payment gateway.
- Realtime kitchen display.
- Promo engine lebih lengkap.
- Stock/menu availability schedule.
- Report profit/sales trend.

### Version 2.0

- Multi-outlet.
- Subscription billing.
- Owner dashboard.
- Tenant isolation.
- Custom domain per merchant.

## Kenapa Project Ini Bagus untuk Portfolio

Project ini menunjukkan kemampuan membangun aplikasi bisnis full-stack:

- Frontend responsive untuk customer dan staff.
- Auth role-based.
- Database relational dengan Prisma.
- Workflow order nyata.
- Admin CMS.
- Kitchen operational board.
- Reporting dan export data.
- Deployment production di Vercel.
- Integrasi Neon PostgreSQL.

Ini bukan sekadar CRUD sederhana; project ini punya alur operasional yang bisa dipahami client bisnis.

## License

Private portfolio project. Jika ingin digunakan untuk komersial, sesuaikan license, branding, security, dan data policy terlebih dahulu.
