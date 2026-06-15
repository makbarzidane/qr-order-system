import Link from 'next/link'
import { Badge, Card, PageHeader } from '@/components/admin/UI'
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
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
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
    { label: 'Pemasukan hari ini', value: formatRupiah(revenue._sum.total ?? 0), detail: `${paid} transaksi lunas`, tone: 'amber' },
    { label: 'Order hari ini', value: ordersToday, detail: 'Semua kanal pembayaran', tone: 'blue' },
    { label: 'Menunggu bayar', value: pending, detail: 'Perlu tindakan kasir', tone: 'red' },
    { label: 'Menu aktif', value: menuActive, detail: `${categories} kategori aktif`, tone: 'green' },
  ] as const

  return (
    <div>
      <PageHeader
        title="Ringkasan operasional"
        description="Pantau penjualan, order, dan aktivitas cafe dari data transaksi aktual."
        action={<div className="flex gap-2"><Link href="/cashier" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Buka kasir</Link><Link href="/admin/menu" className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400">Kelola menu</Link></div>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-sm font-medium text-slate-500">{stat.label}</p><p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">{stat.value}</p><p className="mt-2 text-xs text-slate-400">{stat.detail}</p></div>
              <span className={`mt-1 h-10 w-1.5 rounded-full ${stat.tone === 'green' ? 'bg-emerald-500' : stat.tone === 'red' ? 'bg-red-500' : stat.tone === 'blue' ? 'bg-blue-500' : 'bg-amber-500'}`} />
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(310px,0.8fr)]">
        <Card className="h-fit p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-bold text-slate-950">Tren penjualan 7 hari</h2><p className="mt-1 text-sm text-slate-500">Perbandingan omzet dan jumlah order lunas.</p></div><span className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">7 hari terakhir</span></div>
          <SalesChart data={salesData} />
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="font-bold text-slate-950">Menu terlaris</h2><Link href="/admin/menu" className="text-xs font-semibold text-amber-700">Kelola menu</Link></div>
            <div className="mt-4 space-y-3">
              {best.length ? best.map(([name, quantity], position) => (
                <div key={name} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-950 text-xs font-black text-white">{position + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{name}</span><span className="text-sm font-bold text-slate-950">{quantity}</span></div>
              )) : <p className="py-6 text-center text-sm text-slate-500">Belum ada data penjualan.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-slate-950">Aktivitas terbaru</h2>
            <div className="mt-4 space-y-4">
              {audits.length ? audits.map((log) => (
                <div key={log.id} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" /><div><p className="text-sm font-semibold text-slate-700">{log.action} {log.entity}</p><p className="mt-0.5 text-xs text-slate-400">{log.userName ?? 'System'} · {log.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p></div></div>
              )) : <p className="text-sm text-slate-500">Belum ada aktivitas.</p>}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-950">Order terbaru</h2><p className="mt-1 text-xs text-slate-500">Aktivitas transaksi paling baru.</p></div><Link href="/admin/reports" className="text-sm font-semibold text-amber-700">Lihat laporan</Link></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Pelanggan</th><th className="px-5 py-3">Metode</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{recent.map((order) => <tr key={order.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-950">{order.orderNumber}</td><td className="px-5 py-4 text-slate-600">{order.customerName}<span className="block text-xs text-slate-400">{order.tableId || 'Take away'}</span></td><td className="px-5 py-4 text-slate-600">{order.paymentMethod}</td><td className="px-5 py-4"><Badge tone={order.paymentStatus === 'PAID' ? 'green' : 'amber'}>{order.paymentStatus === 'PAID' ? 'Lunas' : 'Menunggu'}</Badge></td><td className="px-5 py-4 text-right font-semibold text-slate-950">{formatRupiah(order.total)}</td></tr>)}</tbody></table>
        </div>
      </Card>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Menu & kategori', '/admin/menu'], ['Promo', '/admin/promos'], ['Kitchen', '/kitchen/display'], ['Meja & QR', '/admin/tables']].map(([label, href]) => <Link key={href} href={href} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">{label}<span className="float-right text-amber-600">-&gt;</span></Link>)}</div>
    </div>
  )
}
