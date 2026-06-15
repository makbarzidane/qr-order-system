import Link from 'next/link'
import { Badge, Card, EmptyState, PageHeader, inputClass } from '@/components/admin/UI'
import { formatRupiah } from '@/lib/menu-data'
import { prisma } from '@/lib/prisma'

const paymentMethods = ['CASH', 'QRIS', 'TRANSFER', 'DEBIT_EDC'] as const
const methodLabels: Record<string, string> = {
  CASH: 'Cash',
  QRIS: 'QRIS',
  TRANSFER: 'Transfer',
  DEBIT_EDC: 'Debit / EDC',
}

function startOfDay(date = new Date()) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function endOfDay(date = new Date()) {
  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value
}

function startOfWeek() {
  const date = startOfDay()
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date
}

function startOfMonth() {
  const date = startOfDay()
  date.setDate(1)
  return date
}

function parseDate(value: string | undefined, fallback: Date, end = false) {
  if (!value) return fallback
  const parsed = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}`)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

async function aggregateRevenue(where: { paidAt?: { gte?: Date; lte?: Date }; paymentMethod?: string }) {
  const [count, revenue] = await Promise.all([
    prisma.order.count({ where: { paymentStatus: 'PAID', ...where } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', ...where }, _sum: { total: true } }),
  ])
  return { count, revenue: revenue._sum.total ?? 0 }
}

export default async function ReportsPage({ searchParams }: { searchParams: { from?: string; to?: string; method?: string } }) {
  const defaultFrom = startOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  const from = parseDate(searchParams.from, defaultFrom)
  const to = parseDate(searchParams.to, endOfDay(), true)
  const method = paymentMethods.includes(searchParams.method as typeof paymentMethods[number]) ? searchParams.method : undefined
  const filter = {
    paymentStatus: 'PAID',
    paidAt: { gte: from, lte: to },
    ...(method ? { paymentMethod: method } : {}),
  }

  let loadError: string | null = null
  let reportData = {
    totalToday: 0,
    paidAll: 0,
    today: { count: 0, revenue: 0 },
    week: { count: 0, revenue: 0 },
    month: { count: 0, revenue: 0 },
    filteredRevenue: { count: 0, revenue: 0 },
    cash: { count: 0, revenue: 0 },
    nonCash: { _sum: { total: 0 as number | null }, _count: 0 },
    orders: [] as Awaited<ReturnType<typeof prisma.order.findMany>>,
  }

  try {
    const [totalToday, paidAll, today, week, month, filteredRevenue, cash, nonCash, orders] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfDay() } } }),
      prisma.order.count({ where: { paymentStatus: 'PAID' } }),
      aggregateRevenue({ paidAt: { gte: startOfDay() } }),
      aggregateRevenue({ paidAt: { gte: startOfWeek() } }),
      aggregateRevenue({ paidAt: { gte: startOfMonth() } }),
      aggregateRevenue({ paidAt: { gte: from, lte: to }, ...(method ? { paymentMethod: method } : {}) }),
      aggregateRevenue({ paidAt: { gte: from, lte: to }, paymentMethod: 'CASH' }),
      prisma.order.aggregate({ where: { paymentStatus: 'PAID', paidAt: { gte: from, lte: to }, paymentMethod: { not: 'CASH' } }, _sum: { total: true }, _count: true }),
      prisma.order.findMany({ where: filter, orderBy: { paidAt: 'desc' }, take: 200 }),
    ])
    reportData = { totalToday, paidAll, today, week, month, filteredRevenue, cash, nonCash, orders }
  } catch (error) {
    console.warn('Failed to load reports', error)
    loadError = 'Database belum bisa dihubungi. Periksa koneksi DATABASE_URL/Neon lalu refresh halaman.'
  }

  const { totalToday, paidAll, today, week, month, filteredRevenue, cash, nonCash, orders } = reportData

  const query = new URLSearchParams({
    from: dateInputValue(from),
    to: dateInputValue(to),
    ...(method ? { method } : {}),
  })

  const stats = [
    { label: 'Order hari ini', value: totalToday, detail: 'Semua status order', tone: 'blue' },
    { label: 'Order paid', value: paidAll, detail: 'Total transaksi lunas', tone: 'green' },
    { label: 'Pemasukan hari ini', value: formatRupiah(today.revenue), detail: `${today.count} transaksi`, tone: 'amber' },
    { label: 'Pemasukan minggu ini', value: formatRupiah(week.revenue), detail: `${week.count} transaksi`, tone: 'amber' },
    { label: 'Pemasukan bulan ini', value: formatRupiah(month.revenue), detail: `${month.count} transaksi`, tone: 'amber' },
  ] as const

  return (
    <div>
      <PageHeader
        title="Laporan keuangan"
        description="Pantau transaksi lunas, metode pembayaran, dan export data untuk rekonsiliasi harian."
        action={<Link href={`/api/reports/csv?${query}`} className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400">Export CSV</Link>}
      />

      {loadError ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-900">
          {loadError}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-sm font-medium text-slate-500">{stat.label}</p><p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">{stat.value}</p><p className="mt-2 text-xs text-slate-400">{stat.detail}</p></div>
              <span className={`mt-1 h-10 w-1.5 rounded-full ${stat.tone === 'green' ? 'bg-emerald-500' : stat.tone === 'blue' ? 'bg-blue-500' : 'bg-amber-500'}`} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mb-6 p-5">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="text-sm font-semibold text-slate-700">Dari tanggal<input name="from" type="date" defaultValue={dateInputValue(from)} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-semibold text-slate-700">Sampai tanggal<input name="to" type="date" defaultValue={dateInputValue(to)} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-semibold text-slate-700">Metode pembayaran<select name="method" defaultValue={method ?? ''} className={`${inputClass} mt-2`}><option value="">Semua metode</option>{paymentMethods.map((item) => <option key={item} value={item}>{methodLabels[item]}</option>)}</select></label>
          <div className="flex items-end"><button className="min-h-11 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">Terapkan</button></div>
        </form>
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5"><p className="text-sm font-medium text-slate-500">Total filter aktif</p><p className="mt-3 text-2xl font-extrabold text-slate-950">{formatRupiah(filteredRevenue.revenue)}</p><p className="mt-2 text-xs text-slate-400">{filteredRevenue.count} transaksi sesuai filter</p></Card>
        <Card className="p-5"><p className="text-sm font-medium text-slate-500">Cash</p><p className="mt-3 text-2xl font-extrabold text-slate-950">{formatRupiah(cash.revenue)}</p><p className="mt-2 text-xs text-slate-400">{cash.count} transaksi tunai</p></Card>
        <Card className="p-5"><p className="text-sm font-medium text-slate-500">Non-cash</p><p className="mt-3 text-2xl font-extrabold text-slate-950">{formatRupiah(nonCash._sum.total ?? 0)}</p><p className="mt-2 text-xs text-slate-400">{nonCash._count} transaksi QRIS/transfer/debit</p></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-slate-950">Daftar transaksi paid</h2><p className="mt-1 text-xs text-slate-500">Maksimal 200 transaksi terbaru sesuai filter.</p></div>
          <Badge tone={orders.length ? 'green' : 'slate'}>{orders.length} transaksi</Badge>
        </div>
        {orders.length === 0 ? (
          <EmptyState title="Belum ada transaksi" description="Ubah filter tanggal atau metode pembayaran untuk melihat data." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Tanggal bayar</th><th className="px-5 py-3">Order</th><th className="px-5 py-3">Pelanggan</th><th className="px-5 py-3">Meja</th><th className="px-5 py-3">Metode</th><th className="px-5 py-3 text-right">Subtotal</th><th className="px-5 py-3 text-right">Diskon</th><th className="px-5 py-3 text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-slate-600">{order.paidAt ? order.paidAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}</td>
                    <td className="px-5 py-4 font-semibold text-slate-950">{order.orderNumber}</td>
                    <td className="px-5 py-4 text-slate-600">{order.customerName}</td>
                    <td className="px-5 py-4 text-slate-500">{order.tableId || '-'}</td>
                    <td className="px-5 py-4"><Badge tone={order.paymentMethod === 'CASH' ? 'green' : 'blue'}>{methodLabels[order.paymentMethod] ?? order.paymentMethod}</Badge></td>
                    <td className="px-5 py-4 text-right text-slate-600">{formatRupiah(order.subtotal)}</td>
                    <td className="px-5 py-4 text-right text-emerald-700">{order.discountAmount > 0 ? `-${formatRupiah(order.discountAmount)}` : '-'}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-950">{formatRupiah(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
