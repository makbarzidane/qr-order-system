import Link from 'next/link'
import { Badge, DataTable, EmptyState, MetricCard, PageHeader, SectionCard, inputClass, primaryButton, secondaryButton } from '@/components/admin/UI'
import { formatRupiah } from '@/lib/menu-data'
import { prisma } from '@/lib/prisma'
import { withDatabaseRetry } from '@/lib/db-retry'
import type { PaymentMethod } from '@/types'

const paymentMethods: PaymentMethod[] = ['CASH', 'QRIS', 'TRANSFER', 'DEBIT_EDC']
const periods = ['day', 'week', 'month', 'year'] as const
type Period = typeof periods[number]

const periodLabels: Record<Period, string> = {
  day: 'Harian',
  week: 'Mingguan',
  month: 'Bulanan',
  year: 'Tahunan',
}

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

function startOfWeek(date = new Date()) {
  const value = startOfDay(date)
  const day = value.getDay() || 7
  value.setDate(value.getDate() - day + 1)
  return value
}

function endOfWeek(date = new Date()) {
  const value = startOfWeek(date)
  value.setDate(value.getDate() + 6)
  return endOfDay(value)
}

function startOfMonth(date = new Date()) {
  const value = startOfDay(date)
  value.setDate(1)
  return value
}

function endOfMonth(date = new Date()) {
  const value = startOfMonth(date)
  value.setMonth(value.getMonth() + 1)
  value.setDate(0)
  return endOfDay(value)
}

function startOfYear(date = new Date()) {
  const value = startOfDay(date)
  value.setMonth(0, 1)
  return value
}

function endOfYear(date = new Date()) {
  const value = startOfYear(date)
  value.setFullYear(value.getFullYear() + 1)
  value.setDate(0)
  return endOfDay(value)
}

function parseDate(value: string | undefined, fallback: Date, end = false) {
  if (!value) return fallback
  const parsed = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}`)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function resolvePeriod(value: string | undefined): Period {
  return periods.includes(value as Period) ? value as Period : 'day'
}

function defaultRange(period: Period) {
  const now = new Date()
  if (period === 'week') return { from: startOfWeek(now), to: endOfWeek(now) }
  if (period === 'month') return { from: startOfMonth(now), to: endOfMonth(now) }
  if (period === 'year') return { from: startOfYear(now), to: endOfYear(now) }
  return { from: startOfDay(now), to: endOfDay(now) }
}

function groupLabel(date: Date, period: Period) {
  if (period === 'year') return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(date)
  if (period === 'month') return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', month: 'long', year: 'numeric' }).format(date)
  if (period === 'week') {
    const start = startOfWeek(date)
    const end = endOfWeek(date)
    const fmt = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short' })
    return `${fmt.format(start)} - ${fmt.format(end)}`
  }
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function groupKey(date: Date, period: Period) {
  const localDate = new Date(date)
  if (period === 'year') return `${localDate.getFullYear()}`
  if (period === 'month') return `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}`
  if (period === 'week') {
    const start = startOfWeek(localDate)
    return dateInputValue(start)
  }
  return dateInputValue(localDate)
}

async function aggregateRevenue(where: { paidAt?: { gte?: Date; lte?: Date }; paymentMethod?: PaymentMethod }) {
  const [count, revenue] = await Promise.all([
    prisma.order.count({ where: { paymentStatus: 'PAID', ...where } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', ...where }, _sum: { total: true } }),
  ])
  return { count, revenue: revenue._sum.total ?? 0 }
}

export default async function ReportsPage({ searchParams }: { searchParams: { from?: string; to?: string; method?: string; period?: string } }) {
  const period = resolvePeriod(searchParams.period)
  const range = defaultRange(period)
  const from = parseDate(searchParams.from, range.from)
  const to = parseDate(searchParams.to, range.to, true)
  const method = paymentMethods.includes(searchParams.method as PaymentMethod) ? searchParams.method as PaymentMethod : undefined
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
    year: { count: 0, revenue: 0 },
    filteredRevenue: { count: 0, revenue: 0 },
    breakdown: paymentMethods.map((item) => ({ method: item, count: 0, revenue: 0 })),
    orders: [] as Awaited<ReturnType<typeof prisma.order.findMany>>,
  }

  try {
    const [orderToday, paidAll, pendingAll, today, week, month, year, filteredRevenue, breakdown, orders] = await withDatabaseRetry(() => Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfDay() } } }),
      prisma.order.count({ where: { paymentStatus: 'PAID' } }),
      prisma.order.count({ where: { paymentStatus: 'UNPAID' } }),
      aggregateRevenue({ paidAt: { gte: startOfDay() } }),
      aggregateRevenue({ paidAt: { gte: startOfWeek() } }),
      aggregateRevenue({ paidAt: { gte: startOfMonth() } }),
      aggregateRevenue({ paidAt: { gte: startOfYear() } }),
      aggregateRevenue({ paidAt: { gte: from, lte: to }, ...(method ? { paymentMethod: method } : {}) }),
      Promise.all(paymentMethods.map(async (item) => ({ method: item, ...(await aggregateRevenue({ paidAt: { gte: from, lte: to }, paymentMethod: item })) }))),
      prisma.order.findMany({ where: filter, orderBy: { paidAt: 'desc' }, take: 500 }),
    ]))
    reportData = { orderToday, paidAll, pendingAll, today, week, month, year, filteredRevenue, breakdown, orders }
  } catch (error) {
    console.warn('Failed to load reports', error)
    loadError = 'Database belum bisa dihubungi. Periksa koneksi DATABASE_URL/Neon lalu refresh halaman.'
  }

  const { orderToday, paidAll, pendingAll, today, week, month, year, filteredRevenue, breakdown, orders } = reportData
  const query = new URLSearchParams({ from: dateInputValue(from), to: dateInputValue(to), period, ...(method ? { method } : {}) })
  const maxBreakdown = Math.max(...breakdown.map((item) => item.revenue), 1)
  const grouped = new Map<string, { label: string; count: number; total: number; methods: Record<PaymentMethod, number> }>()
  orders.forEach((order) => {
    if (!order.paidAt) return
    const key = groupKey(order.paidAt, period)
    const current = grouped.get(key) ?? { label: groupLabel(order.paidAt, period), count: 0, total: 0, methods: { CASH: 0, QRIS: 0, TRANSFER: 0, DEBIT_EDC: 0 } }
    current.count += 1
    current.total += order.total
    if (paymentMethods.includes(order.paymentMethod as PaymentMethod)) current.methods[order.paymentMethod as PaymentMethod] += order.total
    grouped.set(key, current)
  })
  const groupedRows = Array.from(grouped.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([, value]) => value)
  const stats = [
    { label: 'Pemasukan hari ini', value: formatRupiah(today.revenue), detail: `${today.count} transaksi`, tone: 'amber' as const },
    { label: 'Pemasukan minggu ini', value: formatRupiah(week.revenue), detail: `${week.count} transaksi`, tone: 'blue' as const },
    { label: 'Pemasukan bulan ini', value: formatRupiah(month.revenue), detail: `${month.count} transaksi`, tone: 'green' as const },
    { label: 'Pemasukan tahun ini', value: formatRupiah(year.revenue), detail: `${year.count} transaksi`, tone: 'purple' as const },
    { label: 'Pending payment', value: pendingAll, detail: `${orderToday} order dibuat hari ini`, tone: 'red' as const },
  ]

  return (
    <div>
      <PageHeader
        title="Laporan keuangan"
        description="Pantau transaksi lunas berdasarkan hari, minggu, bulan, tahun, metode pembayaran, dan export CSV untuk Excel."
        action={<Link href={`/api/reports/csv?${query}`} className={primaryButton}>Export Excel CSV</Link>}
      />

      {loadError ? <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-900">{loadError}</div> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => <MetricCard key={stat.label} {...stat} />)}
      </div>

      <SectionCard title="Filter laporan" description="Pilih periode rekap, rentang tanggal, dan metode pembayaran." className="mb-6">
        <form className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
          <label className="text-sm font-bold text-slate-700">Periode rekap<select name="period" defaultValue={period} className={`${inputClass} mt-2`}>{periods.map((item) => <option key={item} value={item}>{periodLabels[item]}</option>)}</select></label>
          <label className="text-sm font-bold text-slate-700">Dari tanggal<input name="from" type="date" defaultValue={dateInputValue(from)} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-bold text-slate-700">Sampai tanggal<input name="to" type="date" defaultValue={dateInputValue(to)} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-bold text-slate-700">Metode pembayaran<select name="method" defaultValue={method ?? ''} className={`${inputClass} mt-2`}><option value="">Semua metode</option>{paymentMethods.map((item) => <option key={item} value={item}>{methodLabels[item]}</option>)}</select></label>
          <div className="flex items-end"><button className={`${primaryButton} w-full`}>Terapkan</button></div>
          <div className="flex items-end"><Link href="/admin/reports" className={`${secondaryButton} w-full`}>Reset</Link></div>
        </form>
      </SectionCard>

      <div className="mb-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Ringkasan filter" description={`Total transaksi paid sesuai filter ${periodLabels[period].toLowerCase()}.`}>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-950 p-5 text-white"><p className="text-sm font-bold text-slate-400">Total keseluruhan</p><p className="mt-3 text-3xl font-black tracking-[-0.04em]">{formatRupiah(filteredRevenue.revenue)}</p><p className="mt-2 text-xs font-bold text-slate-500">{filteredRevenue.count} transaksi sesuai filter</p></div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm font-bold text-slate-500">Filter aktif</p><p className="mt-3 text-2xl font-black text-slate-950">{periodLabels[period]} - {method ? methodLabels[method] : 'Semua metode'}</p><p className="mt-2 text-xs font-bold text-slate-400">{dateInputValue(from)} sampai {dateInputValue(to)}</p></div>
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

      <SectionCard title={`Rekap ${periodLabels[period].toLowerCase()}`} description="Total transaksi dan omzet dikelompokkan sesuai periode filter." className="mb-6">
        {groupedRows.length === 0 ? (
          <EmptyState title="Belum ada rekap" description="Data rekap akan muncul setelah ada transaksi paid sesuai filter." />
        ) : (
          <DataTable columns={['Periode', 'Transaksi', 'Cash', 'QRIS', 'Transfer', 'Debit / EDC', 'Total']} minWidth={900}>
            {groupedRows.map((row) => (
              <tr key={row.label} className="transition hover:bg-slate-50">
                <td className="px-5 py-4 font-extrabold text-slate-950">{row.label}</td>
                <td className="px-5 py-4 text-right font-bold text-slate-600">{row.count}</td>
                {paymentMethods.map((item) => <td key={item} className="px-5 py-4 text-right text-slate-600">{formatRupiah(row.methods[item])}</td>)}
                <td className="px-5 py-4 text-right font-black text-slate-950">{formatRupiah(row.total)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      <SectionCard title="Daftar transaksi paid" description="Maksimal 500 transaksi terbaru sesuai filter." action={<Badge tone={orders.length ? 'green' : 'slate'}>{orders.length} transaksi</Badge>}>
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
