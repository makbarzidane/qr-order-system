import Link from 'next/link'
import { Badge, DataTable, EmptyState, MetricCard, PageHeader, SectionCard, inputClass, primaryButton, secondaryButton } from '@/components/admin/UI'
import { formatRupiah } from '@/lib/menu-data'
import { prisma } from '@/lib/prisma'

const paymentMethods = ['CASH', 'QRIS', 'TRANSFER', 'DEBIT_EDC'] as const
const methodLabels: Record<string, string> = {
  CASH: 'Cash',
  QRIS: 'QRIS',
  TRANSFER: 'Transfer',
  DEBIT_EDC: 'Debit / EDC',
}
const methodTones: Record<string, 'green' | 'blue' | 'purple' | 'amber'> = {
  CASH: 'green',
  QRIS: 'blue',
  TRANSFER: 'purple',
  DEBIT_EDC: 'amber',
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
    orderToday: 0,
    paidAll: 0,
    pendingAll: 0,
    today: { count: 0, revenue: 0 },
    week: { count: 0, revenue: 0 },
    month: { count: 0, revenue: 0 },
    filteredRevenue: { count: 0, revenue: 0 },
    breakdown: paymentMethods.map((item) => ({ method: item, count: 0, revenue: 0 })),
    orders: [] as Awaited<ReturnType<typeof prisma.order.findMany>>,
  }

  try {
    const [orderToday, paidAll, pendingAll, today, week, month, filteredRevenue, breakdown, orders] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfDay() } } }),
      prisma.order.count({ where: { paymentStatus: 'PAID' } }),
      prisma.order.count({ where: { paymentStatus: 'UNPAID' } }),
      aggregateRevenue({ paidAt: { gte: startOfDay() } }),
      aggregateRevenue({ paidAt: { gte: startOfWeek() } }),
      aggregateRevenue({ paidAt: { gte: startOfMonth() } }),
      aggregateRevenue({ paidAt: { gte: from, lte: to }, ...(method ? { paymentMethod: method } : {}) }),
      Promise.all(paymentMethods.map(async (item) => ({ method: item, ...(await aggregateRevenue({ paidAt: { gte: from, lte: to }, paymentMethod: item })) }))),
      prisma.order.findMany({ where: filter, orderBy: { paidAt: 'desc' }, take: 200 }),
    ])
    reportData = { orderToday, paidAll, pendingAll, today, week, month, filteredRevenue, breakdown, orders }
  } catch (error) {
    console.warn('Failed to load reports', error)
    loadError = 'Database belum bisa dihubungi. Periksa koneksi DATABASE_URL/Neon lalu refresh halaman.'
  }

  const { orderToday, paidAll, pendingAll, today, week, month, filteredRevenue, breakdown, orders } = reportData
  const query = new URLSearchParams({ from: dateInputValue(from), to: dateInputValue(to), ...(method ? { method } : {}) })
  const maxBreakdown = Math.max(...breakdown.map((item) => item.revenue), 1)
  const stats = [
    { label: 'Pemasukan hari ini', value: formatRupiah(today.revenue), detail: `${today.count} transaksi`, tone: 'amber' as const },
    { label: 'Pemasukan minggu ini', value: formatRupiah(week.revenue), detail: `${week.count} transaksi`, tone: 'blue' as const },
    { label: 'Pemasukan bulan ini', value: formatRupiah(month.revenue), detail: `${month.count} transaksi`, tone: 'green' as const },
    { label: 'Order paid', value: paidAll, detail: 'Total transaksi lunas', tone: 'green' as const },
    { label: 'Pending payment', value: pendingAll, detail: `${orderToday} order dibuat hari ini`, tone: 'red' as const },
  ]

  return (
    <div>
      <PageHeader
        title="Laporan keuangan"
        description="Pantau transaksi lunas, pending payment, metode pembayaran, dan export CSV untuk rekonsiliasi."
        action={<Link href={`/api/reports/csv?${query}`} className={primaryButton}>Export CSV</Link>}
      />

      {loadError ? <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-900">{loadError}</div> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => <MetricCard key={stat.label} {...stat} />)}
      </div>

      <SectionCard title="Filter laporan" description="Gunakan rentang tanggal dan metode pembayaran untuk rekonsiliasi spesifik." className="mb-6">
        <form className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_1fr_auto_auto]">
          <label className="text-sm font-bold text-slate-700">Dari tanggal<input name="from" type="date" defaultValue={dateInputValue(from)} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-bold text-slate-700">Sampai tanggal<input name="to" type="date" defaultValue={dateInputValue(to)} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-bold text-slate-700">Metode pembayaran<select name="method" defaultValue={method ?? ''} className={`${inputClass} mt-2`}><option value="">Semua metode</option>{paymentMethods.map((item) => <option key={item} value={item}>{methodLabels[item]}</option>)}</select></label>
          <div className="flex items-end"><button className={`${primaryButton} w-full`}>Terapkan</button></div>
          <div className="flex items-end"><Link href="/admin/reports" className={`${secondaryButton} w-full`}>Reset</Link></div>
        </form>
      </SectionCard>

      <div className="mb-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Ringkasan filter" description="Total transaksi paid sesuai filter aktif.">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-950 p-5 text-white"><p className="text-sm font-bold text-slate-400">Total pemasukan</p><p className="mt-3 text-3xl font-black tracking-[-0.04em]">{formatRupiah(filteredRevenue.revenue)}</p><p className="mt-2 text-xs font-bold text-slate-500">{filteredRevenue.count} transaksi sesuai filter</p></div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm font-bold text-slate-500">Metode aktif</p><p className="mt-3 text-2xl font-black text-slate-950">{method ? methodLabels[method] : 'Semua metode'}</p><p className="mt-2 text-xs font-bold text-slate-400">{dateInputValue(from)} sampai {dateInputValue(to)}</p></div>
          </div>
        </SectionCard>

        <SectionCard title="Payment breakdown" description="Cash, QRIS, transfer, dan debit berdasarkan transaksi paid.">
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {breakdown.map((item) => {
              const percent = Math.round((item.revenue / maxBreakdown) * 100)
              return (
                <div key={item.method} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3"><div><p className="font-black text-slate-950">{methodLabels[item.method]}</p><p className="mt-1 text-xs font-bold text-slate-500">{item.count} transaksi</p></div><Badge tone={methodTones[item.method]}>{formatRupiah(item.revenue)}</Badge></div>
                  <div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-amber-500" style={{ width: `${percent}%` }} /></div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Daftar transaksi paid" description="Maksimal 200 transaksi terbaru sesuai filter." action={<Badge tone={orders.length ? 'green' : 'slate'}>{orders.length} transaksi</Badge>}>
        {orders.length === 0 ? (
          <EmptyState title="Belum ada transaksi" description="Ubah filter tanggal atau metode pembayaran untuk melihat data." />
        ) : (
          <DataTable columns={['Tanggal bayar', 'Order', 'Pelanggan', 'Meja', 'Metode', 'Subtotal', 'Diskon', 'Total']} minWidth={920}>
            {orders.map((order) => (
              <tr key={order.id} className="transition hover:bg-slate-50">
                <td className="px-5 py-4 text-slate-600">{order.paidAt ? order.paidAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}</td>
                <td className="px-5 py-4 font-extrabold text-slate-950">{order.orderNumber}</td>
                <td className="px-5 py-4 text-slate-600">{order.customerName}</td>
                <td className="px-5 py-4 text-slate-500">{order.tableId || '-'}</td>
                <td className="px-5 py-4"><Badge tone={methodTones[order.paymentMethod] ?? 'blue'}>{methodLabels[order.paymentMethod] ?? order.paymentMethod}</Badge></td>
                <td className="px-5 py-4 text-right text-slate-600">{formatRupiah(order.subtotal)}</td>
                <td className="px-5 py-4 text-right font-bold text-emerald-700">{order.discountAmount > 0 ? `-${formatRupiah(order.discountAmount)}` : '-'}</td>
                <td className="px-5 py-4 text-right font-black text-slate-950">{formatRupiah(order.total)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>
    </div>
  )
}
