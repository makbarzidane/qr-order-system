import Link from 'next/link'
import { Badge, DataTable, EmptyState, MetricCard, PageHeader, SectionCard, primaryButton, secondaryButton } from '@/components/admin/UI'
import { SalesChart, type SalesPoint } from '@/components/admin/SalesChart'
import { formatRupiah } from '@/lib/menu-data'
import { prisma } from '@/lib/prisma'
import type { OrderItem } from '@/types'

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function buildSalesData(orders: { total: number; paidAt: Date | null }[]): SalesPoint[] {
  const labels = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short', day: 'numeric' })
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    return { key: dateKey(date), label: labels.format(date), revenue: 0, orders: 0 }
  })
  const index = new Map(days.map((day) => [day.key, day]))

  orders.forEach((order) => {
    if (!order.paidAt) return
    const day = index.get(dateKey(order.paidAt))
    if (!day) return
    day.revenue += order.total
    day.orders += 1
  })

  return days
}

export default async function AdminDashboardPage() {
  const today = startOfToday()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  let loadError: string | null = null
  let data = {
    menuActive: 0,
    categories: 0,
    ordersToday: 0,
    pending: 0,
    paid: 0,
    revenue: { _sum: { total: 0 as number | null } },
    recent: [] as Awaited<ReturnType<typeof prisma.order.findMany>>,
    paidOrders: [] as Array<{ itemsJson: string }>,
    chartOrders: [] as Array<{ total: number; paidAt: Date | null }>,
    audits: [] as Awaited<ReturnType<typeof prisma.auditLog.findMany>>,
  }

  try {
    const [menuActive, categories, ordersToday, pending, paid, revenue, recent, paidOrders, chartOrders, audits] = await prisma.$transaction([
      prisma.menuItem.count({ where: { isActive: true } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.count({ where: { paymentStatus: 'UNPAID' } }),
      prisma.order.count({ where: { paymentStatus: 'PAID', paidAt: { gte: today } } }),
      prisma.order.aggregate({ where: { paymentStatus: 'PAID', paidAt: { gte: today } }, _sum: { total: true } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
      prisma.order.findMany({ where: { paymentStatus: 'PAID' }, orderBy: { paidAt: 'desc' }, take: 500, select: { itemsJson: true } }),
      prisma.order.findMany({ where: { paymentStatus: 'PAID', paidAt: { gte: sevenDaysAgo } }, select: { total: true, paidAt: true } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ])
    data = { menuActive, categories, ordersToday, pending, paid, revenue, recent, paidOrders, chartOrders, audits }
  } catch (error) {
    console.warn('Failed to load dashboard', error)
    loadError = 'Database belum bisa dihubungi. Dashboard tampil dalam mode kosong agar CMS tetap bisa dibuka.'
  }

  const { menuActive, categories, ordersToday, pending, paid, revenue, recent, paidOrders, chartOrders, audits } = data
  const sales = new Map<string, number>()
  paidOrders.forEach(({ itemsJson }) => {
    try {
      const items = JSON.parse(itemsJson) as OrderItem[]
      items.forEach((item) => sales.set(item.nameSnapshot, (sales.get(item.nameSnapshot) ?? 0) + item.quantity))
    } catch {
      // Ignore old malformed snapshots without breaking the dashboard.
    }
  })

  const best = Array.from(sales.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const salesData = buildSalesData(chartOrders)
  const stats = [
    { label: 'Pemasukan hari ini', value: formatRupiah(revenue._sum.total ?? 0), detail: `${paid} transaksi lunas`, tone: 'amber' as const },
    { label: 'Order hari ini', value: ordersToday, detail: 'Semua kanal pembayaran', tone: 'blue' as const },
    { label: 'Menunggu bayar', value: pending, detail: 'Perlu tindakan kasir', tone: 'red' as const },
    { label: 'Menu aktif', value: menuActive, detail: `${categories} kategori aktif`, tone: 'green' as const },
  ]

  return (
    <div>
      <PageHeader
        title="Ringkasan operasional"
        description="Pantau penjualan, order, dan aktivitas cafe dari data transaksi aktual."
        action={<><Link href="/cashier" className={secondaryButton}>Buka kasir</Link><Link href="/admin/menu" className={primaryButton}>Kelola menu</Link></>}
      />

      {loadError ? <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{loadError}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <MetricCard key={stat.label} {...stat} />)}
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(310px,0.8fr)]">
        <SectionCard title="Tren penjualan 7 hari" description="Perbandingan omzet dan jumlah order lunas." action={<span className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">7 hari terakhir</span>} className="h-fit">
          <div className="p-5 sm:p-6"><SalesChart data={salesData} /></div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Menu terlaris" description="Dihitung dari snapshot item order paid." action={<Link href="/admin/menu" className="text-xs font-extrabold text-amber-700">Kelola</Link>}>
            <div className="space-y-3 p-5">
              {best.length ? best.map(([name, quantity], position) => (
                <div key={name} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-amber-200 hover:bg-amber-50/50">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white">{position + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">{name}</span>
                  <span className="text-sm font-black text-slate-950">{quantity}</span>
                </div>
              )) : <EmptyState title="Belum ada data" description="Menu terlaris akan tampil setelah ada transaksi paid." />}
            </div>
          </SectionCard>

          <SectionCard title="Aktivitas terbaru" description="Audit log tindakan admin, kasir, dan kitchen.">
            <div className="space-y-4 p-5">
              {audits.length ? audits.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.14)]" />
                  <div><p className="text-sm font-bold text-slate-700">{log.action} {log.entity}</p><p className="mt-0.5 text-xs font-medium text-slate-400">{log.userName ?? 'System'} - {log.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p></div>
                </div>
              )) : <p className="text-sm font-semibold text-slate-500">Belum ada aktivitas.</p>}
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Order terbaru" description="Aktivitas transaksi paling baru." action={<Link href="/admin/reports" className="text-sm font-extrabold text-amber-700">Lihat laporan</Link>} className="mt-6">
        {recent.length === 0 ? (
          <EmptyState title="Belum ada order" description="Transaksi customer akan tampil di sini setelah checkout dibuat." />
        ) : (
          <DataTable columns={['Order', 'Pelanggan', 'Metode', 'Status', 'Total']}>
            {recent.map((order) => (
              <tr key={order.id} className="transition hover:bg-slate-50">
                <td className="px-5 py-4 font-extrabold text-slate-950">{order.orderNumber}</td>
                <td className="px-5 py-4 text-slate-600"><span className="font-bold text-slate-800">{order.customerName}</span><span className="block text-xs font-medium text-slate-400">{order.tableId || 'Take away'}</span></td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-600">{order.paymentMethod}</td>
                <td className="px-5 py-4"><Badge tone={order.paymentStatus === 'PAID' ? 'green' : 'amber'}>{order.paymentStatus === 'PAID' ? 'Lunas' : 'Menunggu'}</Badge></td>
                <td className="px-5 py-4 text-right font-extrabold text-slate-950">{formatRupiah(order.total)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Menu & kategori', '/admin/menu'],
          ['Promo', '/admin/promos'],
          ['Kitchen', '/kitchen/display'],
          ['Meja & QR', '/admin/tables'],
        ].map(([label, href]) => (
          <Link key={href} href={href} className="group rounded-3xl border border-slate-200 bg-white p-5 text-sm font-black text-slate-800 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            {label}<span className="float-right text-amber-600 transition group-hover:translate-x-1">-&gt;</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
